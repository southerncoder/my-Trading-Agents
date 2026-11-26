import { createLogger } from '../../utils/enhanced-logger';
import { VendorStore, Vendor } from '../../dataflows/vendor-store';
import { Bar } from './indicators';

/**
 * Data the Yahoo service does not give, from the metered vendors, as short prompt blocks:
 *   Finnhub        analyst recommendation trend, earnings against estimates, insider sentiment (fundamentals)
 *   Alpha Vantage  company overview: valuation, margins, growth, analyst target (fundamentals)
 *   Marketstack    a second source for recent closes, to catch a wrong Yahoo price (market)
 *
 * Each block never throws and stays inside the free-plan budgets in vendor-store.ts: answers are cached on
 * disk, Marketstack fetches the whole night's list in one request (MARKETSTACK_BATCH), and a vendor that
 * refuses (quota, key, plan) is paused instead of being asked again. These are today's figures, so they are
 * used only when the trade date is today or yesterday; a past trade date gets a one-line note instead.
 */

const logger = createLogger('agent', 'VendorBlocks');

export type GetJson = (url: string) => Promise<{ status: number; body: any }>;

export interface VendorDeps {
  getJson: GetJson;
  store: VendorStore;
  now: () => Date;
  env: Record<string, string | undefined>;
}

const defaultGetJson: GetJson = async (url) => {
  const r = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  const text = await r.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {
    // keep the text
  }
  return { status: r.status, body };
};

let sharedStore: VendorStore | undefined;
function defaults(over: Partial<VendorDeps> = {}): VendorDeps {
  sharedStore ??= new VendorStore();
  return { getJson: defaultGetJson, store: sharedStore, now: () => new Date(), env: process.env, ...over };
}

const DAY = 86_400_000;
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** A real key, not empty and not the "your_..." placeholder from .env.example. */
export function realKey(v: string | undefined): string | undefined {
  const k = (v ?? '').trim();
  return k && !/^your[_-]|placeholder|changeme/i.test(k) ? k : undefined;
}

/** Today's vendor data only describes a trade date of today or the last two days (weekend reruns). */
export function isLiveDate(tradeDate: string, now: Date): boolean {
  return /^\d{4}-\d\d-\d\d$/.test(tradeDate) && tradeDate >= isoDay(new Date(now.getTime() - 2 * DAY));
}

const num = (v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(/,/g, ''));
  return Number.isFinite(n) && String(v).trim() !== '' && v !== 'None' && v !== '-' ? n : undefined;
};
const fmt = (n: number | undefined, digits = 2) => (n === undefined ? 'n/a' : Number(n.toFixed(digits)).toString());
const pct = (n: number | undefined) => (n === undefined ? 'n/a' : `${(n * 100).toFixed(1)}%`);
const big = (n: number | undefined) =>
  n === undefined ? 'n/a' : n >= 1e12 ? `${(n / 1e12).toFixed(2)}T` : n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : `${(n / 1e6).toFixed(0)}M`;

/** A refusal from the vendor that should pause it, or undefined. */
function refusalOf(vendor: Vendor, status: number, body: any): { until: 'day' | 'month'; reason: string } | undefined {
  if (status === 401 || status === 403) return { until: 'day', reason: `key rejected (${status})` };
  if (vendor === 'marketstack') {
    const code = String(body?.error?.code ?? '');
    if (code === 'usage_limit_reached') return { until: 'month', reason: 'monthly plan limit reached' };
    if (/invalid_access_key|missing_access_key|inactive_user/.test(code)) return { until: 'day', reason: `key rejected (${code})` };
    if (status === 429) return { until: 'day', reason: 'rate limited (429)' };
  }
  if (vendor === 'alpha-vantage') {
    const info = String(body?.Information ?? body?.Note ?? '');
    if (/premium/i.test(info)) return { until: 'day', reason: 'answered that this data needs a paid plan' };
    if (/rate limit|requests per day|call frequency/i.test(info)) return { until: 'day', reason: 'daily request limit reached' };
    if (/apikey is invalid|invalid api key/i.test(info + String(body?.['Error Message'] ?? ''))) return { until: 'day', reason: 'key rejected' };
  }
  if (status === 429) return { until: 'day', reason: 'rate limited (429)' };
  return undefined;
}

/** One metered call: budget check, the request, and a pause when the vendor refuses. */
async function call(vendor: Vendor, url: string, d: VendorDeps): Promise<{ ok: true; body: any } | { ok: false; reason: string }> {
  const refused = d.store.refusal(vendor);
  if (refused) return { ok: false, reason: refused };
  d.store.tryConsume(vendor);
  try {
    const { status, body } = await d.getJson(url);
    const stop = refusalOf(vendor, status, body);
    if (stop) {
      d.store.block(vendor, stop.until, stop.reason);
      logger.warn('call', `${vendor} refused; paused`, { vendor, status, reason: stop.reason });
      return { ok: false, reason: stop.reason };
    }
    if (status < 200 || status >= 300) return { ok: false, reason: `answered ${status}` };
    return { ok: true, body };
  } catch (error) {
    return { ok: false, reason: `not reachable (${error instanceof Error ? error.message.slice(0, 80) : String(error)})` };
  }
}

// ---------------------------------------------------------------- Finnhub

interface FinnhubData {
  recommendation: any[];
  earnings: any[];
  insider: any[];
}

export function formatFinnhub(ticker: string, data: FinnhubData): string {
  const lines: string[] = [];
  const recs = [...data.recommendation].filter((r) => r?.period).sort((a, b) => String(b.period).localeCompare(String(a.period)));
  const recLine = (r: any) => {
    const total = ['strongBuy', 'buy', 'hold', 'sell', 'strongSell'].reduce((s, k) => s + (num(r[k]) ?? 0), 0);
    return `${String(r.period).slice(0, 7)}: strong buy ${r.strongBuy ?? 0}, buy ${r.buy ?? 0}, hold ${r.hold ?? 0}, sell ${r.sell ?? 0}, strong sell ${r.strongSell ?? 0} (${total} analysts)`;
  };
  if (recs.length) lines.push(`- Analyst recommendations ${recLine(recs[0])}${recs[3] ? `; three months earlier ${recLine(recs[3])}` : ''}`);
  else lines.push('- Analyst recommendations: none published');

  const eps = [...data.earnings].filter((e) => e?.period).sort((a, b) => String(b.period).localeCompare(String(a.period))).slice(0, 4);
  if (eps.length) {
    const parts = eps.map((e) => {
      const a = num(e.actual);
      const est = num(e.estimate);
      const s = num(e.surprisePercent);
      return `${e.year ?? String(e.period).slice(0, 4)}Q${e.quarter ?? '?'} ${fmt(a)} vs ${fmt(est)} est${s === undefined ? '' : ` (${s >= 0 ? '+' : ''}${s.toFixed(1)}%)`}`;
    });
    const beats = eps.filter((e) => (num(e.actual) ?? -Infinity) >= (num(e.estimate) ?? Infinity)).length;
    lines.push(`- EPS against estimates, last ${eps.length} quarters (${beats} met or beat): ${parts.join('; ')}`);
  } else lines.push('- EPS against estimates: none published');

  const ins = [...data.insider].filter((m) => num(m?.mspr) !== undefined);
  if (ins.length) {
    const mspr = ins.reduce((s, m) => s + (num(m.mspr) as number), 0) / ins.length;
    const change = ins.reduce((s, m) => s + (num(m.change) ?? 0), 0);
    const lean = mspr > 10 ? 'net buying' : mspr < -10 ? 'net selling' : 'roughly balanced';
    lines.push(`- Insider sentiment, last ${ins.length} months with trades: MSPR ${mspr.toFixed(1)} (scale -100 all selling to +100 all buying; ${lean}), net shares ${change >= 0 ? '+' : ''}${Math.round(change).toLocaleString('en-US')}`);
  } else lines.push('- Insider sentiment: no insider trades reported in the last six months');
  return `FINNHUB (analyst consensus, earnings record, insider trades) for ${ticker}:\n${lines.join('\n')}`;
}

export async function finnhubBlock(ticker: string, tradeDate: string, over: Partial<VendorDeps> = {}): Promise<string> {
  const d = defaults(over);
  const head = `FINNHUB for ${ticker}:`;
  const key = realKey(d.env.FINNHUB_API_KEY);
  if (!key) {
    d.store.setStatus('finnhub', false, 'no API key configured');
    return `${head} not configured.`;
  }
  if (!isLiveDate(tradeDate, d.now())) return `${head} not used for a past trade date (it only has current figures).`;
  const cacheKey = `${ticker}-${isoDay(d.now())}`;
  let data = d.store.getCached<FinnhubData>('finnhub', cacheKey, 20 * 3600_000);
  if (!data) {
    const base = 'https://finnhub.io/api/v1';
    const sym = encodeURIComponent(ticker);
    const from = isoDay(new Date(d.now().getTime() - 183 * DAY));
    const rec = await call('finnhub', `${base}/stock/recommendation?symbol=${sym}&token=${key}`, d);
    if (!rec.ok) {
      d.store.setStatus('finnhub', false, rec.reason);
      return `${head} unavailable (${rec.reason}). Do not cite analyst consensus or insider activity from memory.`;
    }
    const earn = await call('finnhub', `${base}/stock/earnings?symbol=${sym}&token=${key}`, d);
    const ins = await call('finnhub', `${base}/stock/insider-sentiment?symbol=${sym}&from=${from}&to=${isoDay(d.now())}&token=${key}`, d);
    data = {
      recommendation: Array.isArray(rec.body) ? rec.body : [],
      earnings: earn.ok && Array.isArray(earn.body) ? earn.body : [],
      insider: ins.ok && Array.isArray(ins.body?.data) ? ins.body.data : [],
    };
    d.store.setCached('finnhub', cacheKey, data);
    d.store.setStatus('finnhub', true, `${ticker}: ${data.recommendation.length ? 'recommendations' : 'no recommendations'}, ${data.earnings.length} earnings quarters, ${data.insider.length} insider months`);
  }
  return formatFinnhub(ticker, data);
}

// ---------------------------------------------------------------- Alpha Vantage

export function formatOverview(ticker: string, o: Record<string, unknown>): string {
  const ratings = ['AnalystRatingStrongBuy', 'AnalystRatingBuy', 'AnalystRatingHold', 'AnalystRatingSell', 'AnalystRatingStrongSell'].map((k) => num(o[k]) ?? 0);
  const rows = [
    `- ${o.Sector ?? 'n/a'} / ${o.Industry ?? 'n/a'}; market cap ${big(num(o.MarketCapitalization))}; latest quarter ${o.LatestQuarter ?? 'n/a'}`,
    `- Valuation: P/E ${fmt(num(o.PERatio))}, forward P/E ${fmt(num(o.ForwardPE))}, PEG ${fmt(num(o.PEGRatio))}, price/book ${fmt(num(o.PriceToBookRatio))}, EV/EBITDA ${fmt(num(o.EVToEBITDA))}`,
    `- Profitability: profit margin ${pct(num(o.ProfitMargin))}, operating margin ${pct(num(o.OperatingMarginTTM))}, return on equity ${pct(num(o.ReturnOnEquityTTM))}`,
    `- Growth (quarter, year on year): revenue ${pct(num(o.QuarterlyRevenueGrowthYOY))}, earnings ${pct(num(o.QuarterlyEarningsGrowthYOY))}; dividend yield ${pct(num(o.DividendYield))}; beta ${fmt(num(o.Beta))}`,
    `- Analyst target price ${fmt(num(o.AnalystTargetPrice))}; ratings strong buy ${ratings[0]}, buy ${ratings[1]}, hold ${ratings[2]}, sell ${ratings[3]}, strong sell ${ratings[4]}`,
  ];
  return `ALPHA VANTAGE company overview for ${ticker}:\n${rows.join('\n')}`;
}

export async function alphaVantageBlock(ticker: string, tradeDate: string, over: Partial<VendorDeps> = {}): Promise<string> {
  const d = defaults(over);
  const head = `ALPHA VANTAGE overview for ${ticker}:`;
  const key = realKey(d.env.ALPHA_VANTAGE_API_KEY);
  if (!key) {
    d.store.setStatus('alpha-vantage', false, 'no API key configured');
    return `${head} not configured.`;
  }
  if (!isLiveDate(tradeDate, d.now())) return `${head} not used for a past trade date (it only has current figures).`;
  // Overview figures change with each quarterly report: a week-old answer is fine and keeps 25 calls a day enough.
  const cached = d.store.getCached<Record<string, unknown> | { none: true }>('alpha-vantage', `overview-${ticker}`, 7 * DAY);
  if (cached) return 'none' in cached ? `${head} no overview for this symbol (an ETF or not covered).` : formatOverview(ticker, cached);
  const res = await call('alpha-vantage', `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(ticker)}&apikey=${key}`, d);
  if (!res.ok) {
    d.store.setStatus('alpha-vantage', false, res.reason);
    return `${head} unavailable (${res.reason}).`;
  }
  const body = res.body && typeof res.body === 'object' ? (res.body as Record<string, unknown>) : {};
  if (!body.Symbol) {
    // An empty object or an error message for this symbol: remember it so the budget is not spent again.
    d.store.setCached('alpha-vantage', `overview-${ticker}`, { none: true });
    d.store.setStatus('alpha-vantage', true, `${ticker}: no overview for this symbol`);
    return `${head} no overview for this symbol (an ETF or not covered).`;
  }
  d.store.setCached('alpha-vantage', `overview-${ticker}`, body);
  d.store.setStatus('alpha-vantage', true, `${ticker}: overview`);
  return formatOverview(ticker, body);
}

// ---------------------------------------------------------------- Marketstack

const TOLERANCE_PCT = 0.5;

export interface CloseCheck {
  status: 'match' | 'mismatch' | 'unavailable';
  line: string;
}

/** Compare the last few closes both sources have. */
export function compareWithMarketstack(ticker: string, yahoo: Bar[], ms: Record<string, number>, days = 5): CloseCheck {
  const dates = yahoo.map((b) => b.date).filter((dt) => ms[dt] !== undefined).slice(-days);
  if (!dates.length) return { status: 'unavailable', line: `PRICE CROSS-CHECK (Marketstack) for ${ticker}: unavailable (no common trading days).` };
  let worst = { date: '', yahoo: 0, ms: 0, diff: -1 };
  for (const dt of dates) {
    const y = (yahoo.find((b) => b.date === dt) as Bar).close;
    const m = ms[dt] as number;
    const diff = (Math.abs(y - m) / m) * 100;
    if (diff > worst.diff) worst = { date: dt, yahoo: y, ms: m, diff };
  }
  if (worst.diff > TOLERANCE_PCT) {
    return {
      status: 'mismatch',
      line: `PRICE CROSS-CHECK: MISMATCH for ${ticker}. On ${worst.date} Yahoo's close was ${fmt(worst.yahoo)} but Marketstack's was ${fmt(worst.ms)} (${worst.diff.toFixed(2)}% apart). The price history may be wrong: use wider levels and lower confidence.`,
    };
  }
  return { status: 'match', line: `PRICE CROSS-CHECK (Marketstack) for ${ticker}: the last ${dates.length} closes agree with Yahoo (largest difference ${worst.diff.toFixed(2)}%).` };
}

/** symbol -> date -> close, from a Marketstack v2 /eod answer. */
export function marketstackCloses(body: any): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  for (const r of Array.isArray(body?.data) ? body.data : []) {
    const sym = String(r?.symbol ?? '').toUpperCase();
    const date = String(r?.date ?? '').slice(0, 10);
    const close = num(r?.close);
    if (!sym || !/^\d{4}-\d\d-\d\d$/.test(date) || close === undefined || close <= 0) continue;
    (out[sym] ??= {})[date] = close;
  }
  return out;
}

export async function marketstackCheck(ticker: string, tradeDate: string, yahoo: Bar[], over: Partial<VendorDeps> = {}): Promise<CloseCheck> {
  const d = defaults(over);
  const head = `PRICE CROSS-CHECK (Marketstack) for ${ticker}:`;
  const key = realKey(d.env.MARKETSTACK_API_KEY);
  if (!key) {
    d.store.setStatus('marketstack', false, 'no API key configured');
    return { status: 'unavailable', line: `${head} not configured.` };
  }
  if (!yahoo.length) return { status: 'unavailable', line: `${head} skipped (no Yahoo prices to compare).` };
  const sym = ticker.toUpperCase();
  const cacheKey = `eod-${tradeDate}`;
  const cached = d.store.getCached<Record<string, Record<string, number>>>('marketstack', cacheKey, 20 * 3600_000) ?? {};
  if (!cached[sym]) {
    // One request covers the whole night: the runner passes every ticker it will analyse in MARKETSTACK_BATCH.
    const batch = (d.env.MARKETSTACK_BATCH ?? '').split(',').map((s) => s.trim().toUpperCase()).filter((s) => /^[A-Z][A-Z0-9.-]{0,9}$/.test(s) && !cached[s]);
    const symbols = [...new Set([sym, ...batch])].slice(0, 100);
    const end = new Date(tradeDate + 'T00:00:00Z');
    const from = isoDay(new Date(end.getTime() - 10 * DAY));
    const res = await call('marketstack', `https://api.marketstack.com/v2/eod?access_key=${key}&symbols=${symbols.join(',')}&date_from=${from}&date_to=${tradeDate}&limit=1000`, d);
    if (!res.ok) {
      d.store.setStatus('marketstack', false, res.reason);
      return { status: 'unavailable', line: `${head} unavailable (${res.reason}).` };
    }
    const got = marketstackCloses(res.body);
    // Remember asked-for symbols that came back empty, so they are not requested again tonight.
    for (const s of symbols) cached[s] = got[s] ?? {};
    d.store.setCached('marketstack', cacheKey, cached);
    d.store.setStatus('marketstack', true, `closes for ${Object.keys(got).length} of ${symbols.length} symbols in one request`);
  }
  const check = compareWithMarketstack(ticker, yahoo, cached[sym] ?? {});
  if (check.status === 'mismatch') logger.warn('marketstackCheck', 'Yahoo and Marketstack closes disagree', { ticker, line: check.line });
  return check;
}

/** Finnhub and Alpha Vantage together, for the fundamentals analyst. */
export async function vendorFundamentalsBlock(ticker: string, tradeDate: string, over: Partial<VendorDeps> = {}): Promise<string> {
  const [fh, av] = await Promise.all([finnhubBlock(ticker, tradeDate, over), alphaVantageBlock(ticker, tradeDate, over)]);
  return `${fh}\n\n${av}`;
}
