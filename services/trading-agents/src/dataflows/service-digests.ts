/**
 * Text digests of the news-aggregator and social-sentiment services.
 * Fetched in code (not by the model) and injected into analyst prompts.
 * On any failure a clearly labelled UNAVAILABLE line is returned so
 * downstream agents and the decision guard can see the gap.
 */

const NEWS_URL = () => process.env.NEWS_AGGREGATOR_URL || 'http://news-aggregator:3004';
const REDDIT_URL = () => process.env.REDDIT_SERVICE_URL || '';

async function getJson(url: string, timeoutMs = 20000): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const clip = (s: unknown, n: number) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

export async function fetchNewsDigest(symbol: string): Promise<string> {
  const retrieved = new Date().toISOString();
  try {
    const body = await getJson(
      `${NEWS_URL()}/api/financial-news/${encodeURIComponent(symbol)}?pageSize=12&lookBackDays=7`
    );
    const articles: any[] = body?.data?.articles ?? body?.articles ?? body?.data ?? [];
    if (!Array.isArray(articles) || articles.length === 0) {
      return 'NEWS DATA UNAVAILABLE: no articles returned';
    }
    const lines = articles.slice(0, 12).map(a => {
      const src = a?.source?.name ?? a?.source ?? 'unknown';
      const when = a?.publishedAt ? String(a.publishedAt).slice(0, 10) : 'date n/a';
      const desc = clip(a?.description, 220);
      return `- [${src}] ${clip(a?.title, 200)} (${when})${desc ? ' — ' + desc : ''}`;
    });
    return (
      `NEWS DIGEST (retrieved ${retrieved}; latest available at fetch time, last 7 days, not point-in-time):\n` +
      lines.join('\n')
    );
  } catch (e: any) {
    return `NEWS DATA UNAVAILABLE: ${e?.message ?? e}`;
  }
}

async function fetchRedditDigest(symbol: string): Promise<string> {
  const base = REDDIT_URL();
  if (!base) return 'SOCIAL DATA UNAVAILABLE: REDDIT_SERVICE_URL not configured';
  const retrieved = new Date().toISOString();
  try {
    const body = await getJson(
      `${base}/api/search?query=${encodeURIComponent(symbol)}&timeframe=week&limit=15`
    );
    const posts: any[] = body?.data?.posts ?? body?.posts ?? body?.data ?? [];
    if (!Array.isArray(posts) || posts.length === 0) {
      return 'SOCIAL DATA UNAVAILABLE: no posts returned';
    }
    const lines = posts.slice(0, 15).map(p => {
      const sub = p?.subreddit ? `r/${p.subreddit}` : 'reddit';
      return `- [${sub}] ${clip(p?.title, 200)} (score ${p?.score ?? 'n/a'}, comments ${p?.num_comments ?? p?.numComments ?? 'n/a'})`;
    });
    return `SOCIAL DIGEST (retrieved ${retrieved}; last week):\n` + lines.join('\n');
  } catch (e: any) {
    return `SOCIAL DATA UNAVAILABLE: ${e?.message ?? e}`;
  }
}

async function fetchSentiSenseDigest(symbol: string): Promise<string> {
  const base = REDDIT_URL();
  if (!base) return 'SOCIAL DATA UNAVAILABLE: social service URL not configured';
  const retrieved = new Date().toISOString();
  try {
    const body = await getJson(`${base}/api/sentisense/${encodeURIComponent(symbol)}`);
    const d = body?.data;
    const s = d?.score;
    const docs: any[] = Array.isArray(d?.documents) ? d.documents : [];
    if (!s && docs.length === 0) return 'SOCIAL DATA UNAVAILABLE: SentiSense returned no data';
    const out: string[] = [
      `SOCIAL DIGEST via SentiSense (retrieved ${retrieved}; end-of-day data, may lag intraday moves):`
    ];
    if (d?.isPreview) out.push('NOTE: SentiSense free-tier PREVIEW slice, not full coverage.');
    if (s) {
      out.push(
        `SentiSense Score (-100 bearish .. +100 bullish): latest ${s.latest?.score} on ${s.latest?.date}; 7-day avg ${s.avg7d}` +
          (s.avgPrev7d !== null && s.avgPrev7d !== undefined ? `; prior 7-day avg ${s.avgPrev7d}` : '') +
          `; latest day mentions: bull ${s.latest?.bull ?? 'n/a'}, bear ${s.latest?.bear ?? 'n/a'} of ${s.latest?.directional ?? 'n/a'} directional`
      );
      if (s.latestIsPartialDay) out.push('NOTE: the latest day is a PARTIAL day (very few mentions so far); weight the 7-day average and prior full days, not the latest score.');
      out.push('Recent daily scores: ' + (s.recent ?? []).map((r: any) => `${r.date} ${r.score}`).join(', '));
    }
    if (docs.length) {
      out.push('Recent posts/articles driving sentiment (sentiment -1..+1, reliability 0..1):');
      for (const x of docs.slice(0, 12)) {
        out.push(`- [${x.source}] ${x.tickerSentiment ?? 'n/a'} (avg ${x.averageSentiment}, rel ${x.reliability}) ${x.published?.slice(0, 10) ?? ''} ${x.url}`);
      }
    }
    return out.join('\n');
  } catch (e: any) {
    return `SOCIAL DATA UNAVAILABLE: ${e?.message ?? e}`;
  }
}

// SentiSense is the primary social source; Reddit is kept as a fallback only.
export async function fetchSocialDigest(symbol: string): Promise<string> {
  const primary = await fetchSentiSenseDigest(symbol);
  if (!primary.startsWith('SOCIAL DATA UNAVAILABLE')) return primary;
  const fallback = await fetchRedditDigest(symbol);
  if (!fallback.startsWith('SOCIAL DATA UNAVAILABLE')) return fallback;
  return `${primary} | Reddit fallback: ${fallback.replace('SOCIAL DATA UNAVAILABLE: ', '')}`.replace('SOCIAL DATA UNAVAILABLE: ', 'SOCIAL DATA UNAVAILABLE: ');
}