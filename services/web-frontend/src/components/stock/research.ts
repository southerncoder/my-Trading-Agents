/** Turning a risk the analysis named into searches and matching articles, so it can be read up on. */

const STOP = new Set(
  'a an and are as at be been but by can could for from has have if in into is it its may might more most of on or over risk risks than that the their there these this to under was were which while will with would about after against any due further lack lacks limited near no not only other possible potential short term'.split(' '),
)

/** The company's everyday name: "The Coca-Cola Company" -> "Coca-Cola", "Microsoft Corporation" -> "Microsoft". */
export function shortName(name: string | undefined | null, ticker: string): string {
  if (!name) return ticker
  const n = name
    .replace(/^the\s+/i, '')
    .replace(/[,.]?\s+(inc|incorporated|corp|corporation|co|company|plc|ltd|limited|holdings?|group|n\.?v|s\.?a|ag|pbc|class [a-c])\.?$/i, '')
    .replace(/[,.]?\s+(inc|corp|co|company|holdings?)\.?$/i, '')
    // "JPMorgan Chase & Co." loses "Co." above: drop the "&" left dangling.
    .replace(/[\s,&]+$/, '')
    .trim()
  // SEC names are upper case ("COCA COLA CO"): title-case them, but keep initialisms like "AT&T".
  if (n !== n.toUpperCase()) return n
  return n
    .split(' ')
    .map((w) => (w.includes('&') ? w : w.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())))
    .join(' ')
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

/** Words that describe almost any risk, so they narrow a news search without making it more relevant. */
const VAGUE = new Set(
  'stock stocks share shares price prices company companies market markets continued continuing ongoing increased increasing rising higher lower could downside upside volatility volatile concerns concern pressure pressures weak weaker weakness decline declines declining negative positive significant sustained persistent broader overall near-term long-term short-term near long sharp sharply further impact impacts affect affecting heightened elevated reduced slowing'.split(' '),
)

/** Chart-reading terms: a risk built from these is about the price pattern, which news stories do not discuss. */
const TECHNICAL = /\b(macd|rsi|moving averages?|sma|ema|support|resistance|overbought|oversold|breakdown|breakout|crossover|bollinger|momentum|50-day|200-day|death cross|golden cross|bearish|bullish|technicals?|trend ?line|downtrend|uptrend)\b/i

export function isTechnicalRisk(risk: string): boolean {
  if (!TECHNICAL.test(risk)) return false
  const left = keywords(risk.replace(new RegExp(TECHNICAL.source, 'gi'), ' '), 8).filter((w) => !VAGUE.has(w.toLowerCase()))
  return left.length < 2
}

/**
 * A news search for this company and this risk. Requiring every word of the risk finds almost nothing, so the
 * company name is required and any one of the risk's two or three most specific words may match:
 * "AT&T" (copper OR landlines OR FCC). A chart-pattern risk ("bearish MACD") searches the company's stock news.
 */
export function riskQuery(company: string, risk: string): string {
  if (isTechnicalRisk(risk)) return `"${company}" stock`
  const name = company.toLowerCase()
  const words = keywords(risk, 10)
    .filter((w) => !VAGUE.has(w.toLowerCase()) && !name.includes(w.toLowerCase()))
    // Acronyms and longer words are the specific ones ("FCC", "antitrust"); keep the risk's own order among them.
    .map((w, i) => ({ w, i, s: (/^[A-Z]{2,}$/.test(w) ? 20 : 0) + w.length }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.w)
  if (!words.length) return `"${company}" stock`
  return words.length === 1 ? `"${company}" ${words[0]}` : `"${company}" (${words.join(' OR ')})`
}

export interface SearchLink {
  label: string
  url: string
}

/** The query as Google News, Bing News and Reuters take it. Google is limited to the last 30 days; Reuters' own search has no OR, so it gets the name and the first word. */
export function newsSearches(query: string): SearchLink[] {
  const simple = query.replace(/\(([^)]*)\)/, (_m, inner: string) => inner.split(' OR ')[0])
  return [
    { label: 'Google News', url: `https://news.google.com/search?q=${encodeURIComponent(`${query} when:30d`)}` },
    { label: 'Bing News', url: `https://www.bing.com/news/search?q=${encodeURIComponent(query)}` },
    { label: 'Reuters', url: `https://www.reuters.com/site-search/?query=${encodeURIComponent(simple)}` },
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
