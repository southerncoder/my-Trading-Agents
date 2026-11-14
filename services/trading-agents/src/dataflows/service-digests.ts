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

export async function fetchSocialDigest(symbol: string): Promise<string> {
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
