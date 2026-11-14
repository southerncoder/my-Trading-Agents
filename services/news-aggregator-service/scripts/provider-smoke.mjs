// Live smoke test of each news provider with its configured credentials.
// Run inside the container:  node /app/scripts/provider-smoke.mjs [SYMBOL]
// Prints one line per provider: configured?, healthy?, article count, first title, or the error.
// Never prints keys.
import { loadSecrets } from '../src/utils/secrets.js';

loadSecrets();
const symbol = process.argv[2] || 'NVDA';

const specs = [
  ['tavily', '../src/providers/tavily.js'],
  ['brave-news', '../src/providers/brave-news.js'],
  ['newsapi', '../src/providers/newsapi.js'],
  ['google-news', '../src/providers/google-news.js'],
  ['serp-api', '../src/providers/serp-api.js'],
  ['bing-news', '../src/providers/bing-news.js'],
];

const articlesOf = r => r?.articles ?? r?.data?.articles ?? r?.results ?? (Array.isArray(r) ? r : []);
let failed = 0;

for (const [name, path] of specs) {
  const line = { provider: name };
  try {
    const { default: Provider } = await import(path);
    const p = new Provider();
    line.configured = typeof p.isConfigured === 'function' ? !!p.isConfigured() : 'n/a';
    if (line.configured === false) {
      line.result = 'SKIP: not configured (no API key)';
    } else {
      const h = await p.healthCheck();
      line.healthy = !!h.healthy;
      if (!h.healthy) line.health = String(h.message ?? h.error ?? '').slice(0, 140);
      await new Promise(r => setTimeout(r, 1600)); // free tiers allow ~1 request/second
      const res = await p.searchNews({ query: `${symbol} stock`, pageSize: 5, lookBackDays: 7 });
      const arts = articlesOf(res);
      line.articles = arts.length;
      line.first = String(arts[0]?.title ?? '').slice(0, 90);
      line.result = arts.length ? 'OK' : 'EMPTY';
    }
  } catch (e) {
    line.result = 'FAIL: ' + String(e?.message ?? e).slice(0, 160);
  }
  if (!String(line.result).startsWith('OK') && !String(line.result).startsWith('SKIP')) failed++;
  console.log(JSON.stringify(line));
}
process.exit(failed ? 1 : 0);
