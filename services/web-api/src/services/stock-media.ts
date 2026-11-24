/**
 * Reading material for a stock page: news articles (news-aggregator, all providers merged) and the social
 * sentiment feed (SentiSense daily scores plus the documents behind them). Every item carries its link.
 * Cached per ticker, because the news providers have daily quotas.
 */

export interface Article {
  title: string
  url: string
  source: string
  published?: string
  description?: string
  image?: string
}

export interface SocialDoc {
  url: string
  domain: string
  /** Words taken from the link's address (SentiSense gives no headline). */
  title: string
  kind: string
  published?: string
  sentiment?: number
  stance?: string
}

export interface SentimentDay {
  date: string
  score: number
  bull: number
  bear: number
}

export interface StockMedia {
  articles: Article[]
  articlesError?: string
  social: { days: SentimentDay[]; avg7d?: number; docs: SocialDoc[] } | null
  socialError?: string
  fetchedAt: string
}

export interface MediaDeps {
  newsUrl: string
  socialUrl: string
  fetchText: (url: string) => Promise<string>
}

type Obj = Record<string, unknown>
const obj = (v: unknown): Obj => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Obj) : {})
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

const isHttp = (u?: string): u is string => !!u && /^https?:\/\//i.test(u)

export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/** "as-tech-stocks-crash-is-berkshire-a-safe-haven" -> "As tech stocks crash is berkshire a safe haven". */
export function titleFromUrl(url: string): string {
  let path = ''
  try {
    path = new URL(url).pathname
  } catch {
    return url
  }
  const parts = path.split('/').filter(Boolean)
  const slug = [...parts].reverse().find((p) => /[a-z]{3,}[-_][a-z]{3,}/i.test(p)) ?? parts[parts.length - 1] ?? ''
  const words = decodeURIComponent(slug)
    .replace(/\.(html?|php|aspx?)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b[0-9a-f]{8,}\b|\b\d{5,}\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (words.length < 8) return domainOf(url)
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** Articles from the news-aggregator response: real links only, newest first, one per address. */
export function pickArticles(body: unknown): Article[] {
  const seen = new Set<string>()
  const out: Article[] = []
  for (const a of arr(obj(obj(body).data).articles).map(obj)) {
    const url = str(a.url)
    const title = str(a.title)
    if (!isHttp(url) || !title || seen.has(url)) continue
    seen.add(url)
    const source = str(obj(a.source).name) ?? str(a.source) ?? domainOf(url)
    const image = str(a.urlToImage)
    out.push({
      title,
      url,
      source,
      published: str(a.publishedAt),
      description: str(a.description)?.replace(/^#+\s*/gm, '').replace(/\s+/g, ' ').slice(0, 280),
      image: isHttp(image) ? image : undefined,
    })
  }
  return out.sort((a, b) => (b.published ?? '').localeCompare(a.published ?? ''))
}

/** Daily scores and linked documents from the social-sentiment SentiSense response. */
export function pickSocial(body: unknown): StockMedia['social'] {
  const d = obj(obj(body).data)
  const score = obj(d.score)
  const days = arr(score.recent)
    .map(obj)
    .map((x) => ({ date: str(x.date) ?? '', score: num(x.score) ?? NaN, bull: num(x.bull) ?? 0, bear: num(x.bear) ?? 0 }))
    .filter((x) => x.date && Number.isFinite(x.score))
  const seen = new Set<string>()
  const docs: SocialDoc[] = []
  for (const x of arr(d.documents).map(obj)) {
    const url = str(x.url)
    if (!isHttp(url) || seen.has(url)) continue
    seen.add(url)
    docs.push({
      url,
      domain: domainOf(url),
      title: titleFromUrl(url),
      kind: str(x.source) ?? 'NEWS',
      published: str(x.published),
      sentiment: num(x.averageSentiment),
      stance: str(x.tickerSentiment),
    })
  }
  if (!days.length && !docs.length) return null
  return { days, avg7d: num(score.avg7d), docs }
}

const TTL_MS = 3 * 60 * 60 * 1000
const cache = new Map<string, { at: number; data: StockMedia }>()

export async function loadStockMedia(d: MediaDeps, ticker: string, now = Date.now()): Promise<StockMedia> {
  const hit = cache.get(ticker)
  if (hit && now - hit.at < TTL_MS) return hit.data
  const [news, social] = await Promise.allSettled([
    d.fetchText(`${d.newsUrl}/api/financial-news/${encodeURIComponent(ticker)}?lookBackDays=14&pageSize=30`).then((t) => pickArticles(JSON.parse(t))),
    d.fetchText(`${d.socialUrl}/api/sentisense/${encodeURIComponent(ticker)}`).then((t) => pickSocial(JSON.parse(t))),
  ])
  const data: StockMedia = {
    articles: news.status === 'fulfilled' ? news.value : [],
    articlesError: news.status === 'rejected' ? 'News could not be loaded' : undefined,
    social: social.status === 'fulfilled' ? social.value : null,
    socialError: social.status === 'rejected' ? 'Social sentiment could not be loaded' : undefined,
    fetchedAt: new Date(now).toISOString(),
  }
  // Only a complete answer is kept, so a provider outage is retried on the next view.
  if (news.status === 'fulfilled' && social.status === 'fulfilled') {
    cache.set(ticker, { at: now, data })
    while (cache.size > 200) cache.delete(cache.keys().next().value as string)
  }
  return data
}
