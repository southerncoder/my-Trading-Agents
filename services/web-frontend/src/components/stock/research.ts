/** Turning a risk the analysis named into searches and matching articles, so it can be read up on. */

const STOP = new Set(
  'a an and are as at be been but by can could for from has have if in into is it its may might more most of on or over risk risks than that the their there these this to under was were which while will with would about after against any due further lack lacks limited near no not only other possible potential short term'.split(' '),
)

/** The company's everyday name: "The Coca-Cola Company" -> "Coca-Cola", "Microsoft Corporation" -> "Microsoft". */
export function shortName(name: string | undefined | null, ticker: string): string {
  if (!name) return ticker
  const n = name
    .replace(/^the\s+/i, '')
    .replace(/[,.]?\s+(inc|incorporated|corp|corporation|co|company|plc|ltd|limited|holdings?|group|n\.?v|s\.?a|ag|class [a-c])\.?$/i, '')
    .replace(/[,.]?\s+(inc|corp|co|company|holdings?)\.?$/i, '')
    .trim()
  // SEC names are upper case ("COCA COLA CO"): title-case them.
  return n === n.toUpperCase() ? n.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : n
}

/** The meaningful words of a risk, at most `max`. */
export function keywords(text: string, max = 6): string[] {
  const out: string[] = []
  for (const w of text.replace(/[^\p{L}\p{N}&'\s-]/gu, ' ').split(/\s+/)) {
    const k = w.replace(/^'+|'+$/g, '')
    if ((k.length < 3 && !/^[A-Z]{2}$/.test(k)) || STOP.has(k.toLowerCase()) || /^\d+(\.\d+)?%?$/.test(k)) continue
    if (!out.some((o) => o.toLowerCase() === k.toLowerCase())) out.push(k)
    if (out.length >= max) break
  }
  return out
}

/** A news search for this company and this risk. */
export function riskQuery(company: string, risk: string): string {
  const words = keywords(risk, 5).filter((w) => w.toLowerCase() !== company.toLowerCase())
  return `"${company}" ${words.join(' ')}`.trim()
}

export interface SearchLink {
  label: string
  url: string
}

export function newsSearches(query: string): SearchLink[] {
  const q = encodeURIComponent(query)
  return [
    { label: 'Google News', url: `https://news.google.com/search?q=${q}` },
    { label: 'Bing News', url: `https://www.bing.com/news/search?q=${q}` },
    { label: 'Reuters', url: `https://www.reuters.com/site-search/?query=${q}` },
  ]
}

/** Places people talk about the ticker. */
export function socialSearches(ticker: string, company: string): SearchLink[] {
  const t = encodeURIComponent(ticker)
  const both = encodeURIComponent(`${ticker} ${company}`)
  return [
    { label: 'X (Twitter)', url: `https://x.com/search?q=%24${t}&f=live` },
    { label: 'StockTwits', url: `https://stocktwits.com/symbol/${t}` },
    { label: 'Google News', url: `https://news.google.com/search?q=${both}` },
    { label: 'Yahoo Finance', url: `https://finance.yahoo.com/quote/${t}/news/` },
    { label: 'SEC filings', url: `https://www.sec.gov/edgar/search/#/q=${both}` },
  ]
}

/** Items whose title or description share at least two of the risk's keywords (or one long, specific word). */
export function matching<T extends { title: string; description?: string | null }>(risk: string, items: T[], max = 3): T[] {
  const keys = keywords(risk, 8).map((k) => k.toLowerCase())
  if (!keys.length) return []
  const scored = items
    .map((it) => {
      const hay = `${it.title} ${it.description ?? ''}`.toLowerCase()
      const hits = keys.filter((k) => hay.includes(k))
      const score = hits.length + (hits.some((h) => h.length >= 8) ? 0.5 : 0)
      return { it, score, hits: hits.length }
    })
    .filter((x) => x.hits >= 2 || (x.hits === 1 && x.score >= 1.5))
    .sort((a, b) => b.score - a.score)
  return scored.slice(0, max).map((x) => x.it)
}

/** Reddit subreddits where stocks are discussed, each searched for this company (no login or API needed). */
export const STOCK_SUBREDDITS = ['stocks', 'investing', 'wallstreetbets', 'StockMarket', 'options', 'dividends', 'ValueInvesting', 'SecurityAnalysis']

/** Reddit search for the ticker and company: one link across all finance subreddits, then one per subreddit. */
export function redditSearches(ticker: string, company: string): SearchLink[] {
  // Single-letter tickers (F, T, M) match everything, so they search by company name only.
  const q = encodeURIComponent(ticker.length >= 3 ? `${ticker} OR "${company}"` : `"${company}"`)
  const tail = `search/?q=${q}&restrict_sr=1&sort=new&t=month`
  return [
    { label: 'All finance subreddits', url: `https://www.reddit.com/r/${STOCK_SUBREDDITS.join('+')}/${tail}` },
    ...STOCK_SUBREDDITS.map((sub) => ({ label: `r/${sub}`, url: `https://www.reddit.com/r/${sub}/${tail}` })),
    { label: 'All of Reddit', url: `https://www.reddit.com/search/?q=${q}&sort=new&t=month` },
  ]
}
