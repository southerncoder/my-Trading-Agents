import type { UniverseStock } from './screen.js'

export interface Article {
  title: string
  description: string
  url: string
  publishedAt?: string
}

/** Articles from every provider in a /api/news/aggregate reply, each story once (by url, else title). */
export function articlesFrom(reply: unknown): Article[] {
  const providers = (reply as { providers?: Record<string, { data?: { articles?: unknown[] } | null }> })?.providers ?? {}
  const seen = new Set<string>()
  const out: Article[] = []
  for (const p of Object.values(providers)) {
    for (const a of p?.data?.articles ?? []) {
      const x = a as Partial<Article>
      if (typeof x.title !== 'string' || !x.title.trim()) continue
      const key = x.url || x.title
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ title: x.title, description: typeof x.description === 'string' ? x.description : '', url: x.url ?? '', publishedAt: x.publishedAt })
    }
  }
  return out
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * How many distinct stories mention each company. Names match case-sensitively as whole words; a ticker counts
 * only when written as $TICKER or (TICKER) / (NYSE: TICKER), because bare tickers like IT, ALL or NOW are words.
 */
export function countMentions(articles: Article[], universe: UniverseStock[]): Map<string, { count: number; headlines: string[] }> {
  const patterns = universe.map((s) => ({
    ticker: s.ticker,
    re: new RegExp(
      [
        ...s.match.map((m) => `(?<![A-Za-z0-9])${esc(m)}(?![A-Za-z0-9])`),
        `\\$${esc(s.ticker)}(?![A-Za-z0-9])`,
        `\\((?:(?:NYSE|NASDAQ|Nasdaq|NYSE American)\\s*:\\s*)?${esc(s.ticker)}\\)`,
      ].join('|'),
    ),
  }))
  const counts = new Map<string, { count: number; headlines: string[] }>()
  const seen = new Set<string>()
  for (const a of articles) {
    const key = a.url || a.title
    if (seen.has(key)) continue
    seen.add(key)
    const text = `${a.title} ${a.description}`
    for (const p of patterns) {
      if (!p.re.test(text)) continue
      const c = counts.get(p.ticker) ?? { count: 0, headlines: [] }
      c.count++
      if (c.headlines.length < 3) c.headlines.push(a.title)
      counts.set(p.ticker, c)
    }
  }
  return counts
}
