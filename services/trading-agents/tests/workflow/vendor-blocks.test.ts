// Finnhub, Alpha Vantage and Marketstack blocks: free-plan budgets, caching, pausing on refusal, and the price check.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { VendorStore } from '../../src/dataflows/vendor-store';
import { alphaVantageBlock, finnhubBlock, marketstackCheck, priceCrossCheck, tiingoCheck, realKey, GetJson } from '../../src/agents/base/vendor-blocks';
import { assessDataQuality, buildEvidenceBlock } from '../../src/agents/base/evidence';

const failures: string[] = [];
const check = (name: string, ok: boolean, got?: unknown) => {
  if (!ok) failures.push(`${name}${got === undefined ? '' : ` (got ${typeof got === 'string' ? got.slice(0, 200) : JSON.stringify(got)})`}`);
};

const now = () => new Date('2026-11-25T22:00:00Z');
const today = '2026-11-25';
const env = { FINNHUB_API_KEY: 'k1', ALPHA_VANTAGE_API_KEY: 'k2', MARKETSTACK_API_KEY: 'k3', MARKETSTACK_BATCH: 'KO,NVDA,PG' };
const fresh = () => new VendorStore(fs.mkdtempSync(path.join(os.tmpdir(), 'vendor-')), now);

function fake(routes: Array<[RegExp, number, unknown]>) {
  const calls: string[] = [];
  const getJson: GetJson = async (url) => {
    calls.push(url);
    const hit = routes.find(([re]) => re.test(url));
    return hit ? { status: hit[1], body: hit[2] } : { status: 404, body: {} };
  };
  return { calls, getJson };
}

async function main() {
  check('placeholder keys are not keys', realKey('your_finnhub_key') === undefined && realKey(' ') === undefined && realKey('abc') === 'abc');

  // Finnhub: three calls, formatted, cached for the day.
  {
    const store = fresh();
    const f = fake([
      [/recommendation/, 200, [{ period: '2026-11-01', strongBuy: 5, buy: 10, hold: 8, sell: 1, strongSell: 0 }, { period: '2026-08-01', strongBuy: 4, buy: 9, hold: 9, sell: 1, strongSell: 0 }]],
      [/earnings/, 200, [{ period: '2026-09-30', year: 2026, quarter: 3, actual: 0.82, estimate: 0.78, surprisePercent: 5.13 }, { period: '2026-06-30', year: 2026, quarter: 2, actual: 0.7, estimate: 0.75, surprisePercent: -6.7 }]],
      [/insider-sentiment/, 200, { data: [{ year: 2026, month: 9, change: -1200, mspr: -40 }, { year: 2026, month: 10, change: 300, mspr: 20 }] }],
    ]);
    const deps = { getJson: f.getJson, store, now, env };
    const text = await finnhubBlock('KO', today, deps);
    check('finnhub recommendations', text.includes('strong buy 5, buy 10, hold 8, sell 1, strong sell 0 (24 analysts)'), text);
    check('finnhub earnings beat count', text.includes('last 2 quarters (1 met or beat)') && text.includes('2026Q3 0.82 vs 0.78 est (+5.1%)'), text);
    check('finnhub insider lean', text.includes('MSPR -10.0') && text.includes('net shares -900'), text);
    check('finnhub made three calls', f.calls.length === 3, f.calls.length);
    await finnhubBlock('KO', today, deps);
    check('finnhub cached for the day', f.calls.length === 3, f.calls.length);
    const past = await finnhubBlock('KO', '2026-06-01', deps);
    check('finnhub skips past trade dates', past.includes('past trade date') && f.calls.length === 3, past);
  }

  // Finnhub: a rejected key pauses the vendor; no second request the same day.
  {
    const store = fresh();
    const f = fake([[/finnhub/, 401, { error: 'Invalid API key' }]]);
    const deps = { getJson: f.getJson, store, now, env };
    const a = await finnhubBlock('KO', today, deps);
    const b = await finnhubBlock('PG', today, deps);
    check('finnhub 401 reported', a.includes('unavailable (key rejected (401))'), a);
    check('finnhub paused after 401', f.calls.length === 1 && b.includes('key rejected'), f.calls.length);
    const status = JSON.parse(fs.readFileSync(path.join(store.dir, 'status.json'), 'utf8'));
    check('finnhub status written', status.finnhub?.ok === false && /401/.test(status.finnhub?.detail), status);
  }

  // Alpha Vantage: overview formatted and cached a week; "premium" answer pauses; daily budget holds.
  {
    const store = fresh();
    const f = fake([[/symbol=KO/, 200, { Symbol: 'KO', Sector: 'CONSUMER DEFENSIVE', Industry: 'BEVERAGES', MarketCapitalization: '300000000000', PERatio: '25.1', ForwardPE: '22', PEGRatio: 'None', ProfitMargin: '0.231', AnalystTargetPrice: '75.5', AnalystRatingBuy: '12' }]]);
    const deps = { getJson: f.getJson, store, now, env };
    const text = await alphaVantageBlock('KO', today, deps);
    check('alpha vantage overview', text.includes('market cap 300.0B') && text.includes('P/E 25.1') && text.includes('PEG n/a') && text.includes('profit margin 23.1%') && text.includes('target price 75.5'), text);
    await alphaVantageBlock('KO', today, deps);
    check('alpha vantage cached', f.calls.length === 1, f.calls.length);

    const s2 = fresh();
    const p = fake([[/alphavantage/, 200, { Information: 'Thank you for using Alpha Vantage! This is a premium endpoint.' }]]);
    const d2 = { getJson: p.getJson, store: s2, now, env };
    const x = await alphaVantageBlock('KO', today, d2);
    await alphaVantageBlock('PG', today, d2);
    check('alpha vantage premium pauses', x.includes('paid plan') && p.calls.length === 1, x);

    const s3 = new VendorStore(fs.mkdtempSync(path.join(os.tmpdir(), 'vendor-')), now, { finnhub: {}, 'alpha-vantage': { perDay: 2 }, marketstack: {} });
    const q = fake([[/alphavantage/, 200, {}]]);
    const d3 = { getJson: q.getJson, store: s3, now, env };
    for (const t of ['A', 'B', 'C']) await alphaVantageBlock(t, today, d3);
    const last = await alphaVantageBlock('D', today, d3);
    check('alpha vantage daily budget', q.calls.length === 2 && last.includes('daily budget of 2 calls used'), { calls: q.calls.length, last });
  }

  // Marketstack: one request for the whole batch, then a match, a mismatch and a monthly-limit pause.
  {
    const store = fresh();
    const rows = [
      { symbol: 'KO', date: '2026-11-24T00:00:00+0000', close: 70.1 },
      { symbol: 'KO', date: '2026-11-25T00:00:00+0000', close: 70.5 },
      { symbol: 'NVDA', date: '2026-11-24T00:00:00+0000', close: 150 },
      { symbol: 'NVDA', date: '2026-11-25T00:00:00+0000', close: 152 },
    ];
    const f = fake([[/marketstack/, 200, { data: rows }]]);
    const deps = { getJson: f.getJson, store, now, env };
    const bars = (closes: number[]) => closes.map((c, i) => ({ date: ['2026-11-24', '2026-11-25'][i] as string, open: c, high: c, low: c, close: c }));
    const ko = await marketstackCheck('KO', today, bars([70.12, 70.5]), deps);
    check('marketstack match', ko.status === 'match' && ko.line.includes('last 2 closes agree'), ko);
    check('marketstack batched symbols', /symbols=KO,NVDA,PG/.test(f.calls[0] ?? ''), f.calls[0]);
    const nv = await marketstackCheck('NVDA', today, bars([165.05, 152]), deps);
    check('marketstack mismatch', nv.status === 'mismatch' && nv.line.includes('On 2026-11-24') && nv.line.includes('165.05') && nv.line.includes('150'), nv);
    const pg = await marketstackCheck('PG', today, bars([150, 151]), deps);
    check('marketstack one request for the night', f.calls.length === 1 && pg.status === 'unavailable', { calls: f.calls.length, pg });

    const q = assessDataQuality({ market_report: nv.line + '\n\n' + 'x'.repeat(2000), news_report: 'n'.repeat(2000), fundamentals_report: 'f'.repeat(2000), sentiment_report: 's'.repeat(2000) });
    check('data quality flags the mismatch', q.priceMismatch && !q.criticalMissing, q);
    check('evidence warns on the mismatch', buildEvidenceBlock({ market_report: nv.line + 'x'.repeat(2000) }).includes('PRICE WARNING'));

    const s2 = fresh();
    const lim = fake([[/marketstack/, 429, { error: { code: 'usage_limit_reached', message: 'Your monthly usage limit has been reached.' } }]]);
    const d2 = { getJson: lim.getJson, store: s2, now, env };
    const a = await marketstackCheck('KO', today, bars([70, 70]), d2);
    const b = await marketstackCheck('NVDA', today, bars([150, 152]), d2);
    check('marketstack monthly limit pauses', a.line.includes('monthly plan limit reached') && b.line.includes('monthly plan limit reached') && lim.calls.length === 1, { a, b, calls: lim.calls.length });
  }

  // Tiingo: per-ticker closes, cached; Marketstack only when Tiingo has no answer.
  {
    const bars = (closes: number[]) => closes.map((c, i) => ({ date: ['2026-11-24', '2026-11-25'][i] as string, open: c, high: c, low: c, close: c }));
    const store = fresh();
    const f = fake([
      [/tiingo\/daily\/BRK-B\//, 200, [{ date: '2026-11-24T00:00:00.000Z', close: 480 }, { date: '2026-11-25T00:00:00.000Z', close: 482 }]],
      [/tiingo\/daily\/KO\//, 200, [{ date: '2026-11-24T00:00:00.000Z', close: 70.1 }, { date: '2026-11-25T00:00:00.000Z', close: 74 }]],
      [/tiingo\/daily\/ZZZZ\//, 404, { detail: "Error: Ticker 'ZZZZ' not found" }],
      [/marketstack/, 200, { data: [{ symbol: 'ZZZZ', date: '2026-11-24T00:00:00+0000', close: 10 }, { symbol: 'ZZZZ', date: '2026-11-25T00:00:00+0000', close: 10 }] }],
    ]);
    const deps = { getJson: f.getJson, store, now, env: { ...env, TIINGO_API_KEY: 'k4' } };
    const brk = await priceCrossCheck('BRK.B', today, bars([480, 482]), deps);
    check('tiingo match, share class as BRK-B', brk.status === 'match' && brk.line.includes('(Tiingo)') && /daily\/BRK-B\//.test(f.calls[0] ?? ''), { brk, url: f.calls[0] });
    const ko = await priceCrossCheck('KO', today, bars([70.1, 70.5]), deps);
    check('tiingo mismatch', ko.status === 'mismatch' && ko.line.includes("Tiingo's was 74"), ko);
    await priceCrossCheck('KO', today, bars([70.1, 70.5]), deps);
    check('tiingo cached', f.calls.filter((u) => /tiingo\/daily\/KO/.test(u)).length === 1, f.calls);
    const z = await priceCrossCheck('ZZZZ', today, bars([10, 10]), deps);
    check('marketstack when tiingo lacks the ticker', z.status === 'match' && z.line.includes('(Marketstack)'), z);

    const s2 = fresh();
    const lim = fake([[/tiingo/, 429, 'You have run over your hourly request allocation.']]);
    const d2 = { getJson: lim.getJson, store: s2, now, env: { TIINGO_API_KEY: 'k4' } };
    const a = await tiingoCheck('KO', today, bars([70, 70]), d2);
    await tiingoCheck('PG', today, bars([70, 70]), d2);
    check('tiingo limit pauses', a.line.includes('request limit reached') && lim.calls.length === 1, { a, calls: lim.calls.length });
  }

  if (failures.length) {
    console.error('❌ Vendor blocks:\n  ' + failures.join('\n  '));
    process.exit(1);
  }
  console.log('✅ Vendor blocks: Finnhub, Alpha Vantage, Marketstack budgets, caching, pauses and price check');
}

main().catch((e) => {
  console.error('❌ Vendor blocks crashed:', e);
  process.exit(1);
});
