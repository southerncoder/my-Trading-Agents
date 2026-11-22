import type { Db } from '../db/pool.js'
import { addTradingDays, isTradingDay } from '../domain/calendar.js'
import type { ServiceDeps } from '../routes/deps.js'
import { articlesFrom, countMentions } from './news.js'
import { loadUniverse, screen } from './screen.js'

export const SCREEN_LIMIT = Number(process.env.SCREEN_PICKS ?? 4)
export const NEWS_LIMIT = Number(process.env.NEWS_PICKS ?? 3)
const NEWS_MIN_STORIES = 2
const REPEAT_WINDOW_DAYS = 5
const NEWS_QUERIES = ['stock market movers today', 'shares jump after earnings', 'shares fall after downgrade']

interface StoredPick {
  ticker: string
  source: 'screen' | 'news'
  score: number | null
  reasons: Record<string, unknown>
}

export async function readSources(db: Db, date: string) {
  const { rows } = await db.query<StoredPick>(`SELECT ticker, source, score, reasons FROM source_picks WHERE run_date = $1 ORDER BY source, score DESC NULLS LAST, ticker`, [date])
  return { date, screen: rows.filter((r) => r.source === 'screen'), news: rows.filter((r) => r.source === 'news') }
}

/** The date n trading days before `date`. */
function tradingDaysBefore(date: string, n: number): string {
  let d = date
  for (let left = n; left > 0; ) {
    d = new Date(new Date(`${d}T00:00:00Z`).getTime() - 86400000).toISOString().slice(0, 10)
    if (isTradingDay(d)) left--
  }
  return d
}

/**
 * Tonight's extra tickers for the nightly analysis: the rule-based screen and news-driven names, each excluding the
 * watchlist and anything the same source picked in the last five trading days (news also skips tonight's screen
 * picks). Stored once per night: asking again returns the stored picks and spends no quota.
 */
export async function computeSources(deps: ServiceDeps, date: string) {
  const { pool } = deps
  const existing = await readSources(pool, date)
  if (existing.screen.length || existing.news.length) return { ...existing, notes: ['already chosen for this night'] }
  const notes: string[] = []
  const since = tradingDaysBefore(date, REPEAT_WINDOW_DAYS)
  const recent = async (source: string) =>
    new Set((await pool.query<{ ticker: string }>(`SELECT ticker FROM source_picks WHERE source = $1 AND run_date > $2 AND run_date < $3`, [source, since, date])).rows.map((r) => r.ticker))
  const watch = new Set(deps.watchlist?.() ?? [])
  const universe = loadUniverse()

  let screened: ReturnType<typeof screen> = []
  try {
    const quotes = await deps.market.quotes(universe.map((u) => u.ticker))
    screened = screen(quotes, { exclude: new Set([...watch, ...(await recent('screen'))]), limit: SCREEN_LIMIT })
  } catch (e) {
    notes.push(`screen skipped: ${(e as Error).message}`)
  }

  const news: StoredPick[] = []
  if (deps.newsUrl) {
    const f = deps.fetch ?? fetch
    const articles = []
    for (const q of NEWS_QUERIES) {
      try {
        const res = await f(`${deps.newsUrl}/api/news/aggregate?q=${encodeURIComponent(q)}&count=10`, { signal: AbortSignal.timeout(90_000) })
        if (!res.ok) throw new Error(`news service answered ${res.status}`)
        articles.push(...articlesFrom(await res.json()))
      } catch (e) {
        notes.push(`news query "${q}" failed: ${(e as Error).message}`)
      }
    }
    const skip = new Set([...watch, ...screened.map((s) => s.ticker), ...(await recent('news'))])
    const counts = [...countMentions(articles, universe).entries()]
      .filter(([t, c]) => !skip.has(t) && c.count >= NEWS_MIN_STORIES)
      .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
      .slice(0, NEWS_LIMIT)
    for (const [ticker, c] of counts) news.push({ ticker, source: 'news', score: c.count, reasons: { mentions: c.count, headlines: c.headlines, stories: articles.length } })
  }

  const all: StoredPick[] = [...screened.map((s) => ({ ticker: s.ticker, source: 'screen' as const, score: s.score, reasons: s.reasons })), ...news]
  for (const p of all) {
    await pool.query(
      `INSERT INTO source_picks (run_date, ticker, source, score, reasons) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      [date, p.ticker, p.source, p.score, JSON.stringify(p.reasons)],
    )
  }
  return { ...(await readSources(pool, date)), notes }
}

/** The forward paper test's pass/fail bar, written down before results exist. */
export const FORWARD_TEST = {
  tradingDays: 40,
  rule: 'After 40 trading days (8 weeks) the shadow portfolio passes if its return is at least SPY’s over the same period AND at least half of its closed positions beat SPY over their own holding days.',
}

export function forwardTestEnd(start: string) {
  return addTradingDays(start, FORWARD_TEST.tradingDays)
}
