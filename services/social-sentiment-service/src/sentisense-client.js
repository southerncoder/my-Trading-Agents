// SentiSense client: end-of-day sentiment score + the news/social documents behind it.
// Free tier: 30 req/min, 1000/month -> every symbol result is cached in memory.
const BASE = process.env.SENTISENSE_BASE_URL || 'https://app.sentisense.ai';
const TTL_MS = 30 * 60 * 1000;
const cache = new Map();

async function get(path, key) {
  const res = await fetch(BASE + path, {
    headers: { 'X-SentiSense-API-Key': key, Accept: 'application/json' },
    signal: AbortSignal.timeout(20000)
  });
  if (!res.ok) throw new Error(`SentiSense ${path.split('?')[0]} -> HTTP ${res.status}`);
  return res.json();
}

const round = (n, d = 2) => (typeof n === 'number' && Number.isFinite(n) ? Number(n.toFixed(d)) : null);
const avg = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);

function summarizeSeries(points) {
  const series = (Array.isArray(points) ? points : [])
    .map(p => ({
      date: new Date(p.timestamp).toISOString().slice(0, 10),
      score: round(p.value),
      bull: p.metricValue?.properties?.bull ?? null,
      bear: p.metricValue?.properties?.bear ?? null,
      directional: p.metricValue?.properties?.directional ?? null
    }))
    .filter(p => p.score !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!series.length) return null;
  const last7 = series.slice(-7).map(p => p.score);
  const prev = series.slice(-14, -7).map(p => p.score);
  const counts = series.slice(0, -1).map(p => p.directional ?? 0).sort((a, b) => a - b);
  const median = counts.length ? counts[Math.floor(counts.length / 2)] : 0;
  const latest = series[series.length - 1];
  return {
    latestIsPartialDay: median > 0 && (latest.directional ?? 0) < median * 0.25,
    latest,
    avg7d: round(avg(last7)),
    avgPrev7d: prev.length ? round(avg(prev)) : null,
    days: series.length,
    recent: series.slice(-7)
  };
}

export class SentiSenseClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  get configured() {
    return !!this.apiKey;
  }

  async getSymbol(symbol) {
    if (!this.configured) throw new Error('SENTISENSE_API_KEY not configured');
    const sym = String(symbol).toUpperCase().replace(/[^A-Z0-9.\-]/g, '');
    const hit = cache.get(sym);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.data;

    const [score, docs] = await Promise.all([
      get(`/api/v2/metrics/entity/${sym}/metric/sentisense`, this.apiKey),
      get(`/api/v1/documents/ticker/${sym}`, this.apiKey)
    ]);

    const documents = (docs?.documents ?? []).slice(0, 25).map(d => {
      const own = (d.sentiment ?? []).find(s => s.ticker === sym);
      return {
        source: d.source,
        url: d.url,
        published: d.published ? new Date(d.published * 1000).toISOString() : null,
        averageSentiment: round(d.averageSentiment),
        reliability: round(d.reliability),
        tickerSentiment: own?.sentiment ?? null
      };
    });

    const data = {
      symbol: sym,
      provider: 'sentisense',
      fetchedAt: new Date().toISOString(),
      isPreview: !!(docs?.isPreview || score?.isPreview),
      score: summarizeSeries(score?.data ?? score),
      documents
    };
    cache.set(sym, { at: Date.now(), data });
    return data;
  }
}
