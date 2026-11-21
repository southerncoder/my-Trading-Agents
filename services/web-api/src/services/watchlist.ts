import { readFile } from 'fs/promises'

export type WatchList = 'core' | 'brands'
export type Cadence = 'nightly' | 'weekly' | 'once' | 'paused'

export interface WatchEntry {
  ticker: string
  list: WatchList
  cadence: Cadence
  lesson?: string
}

export interface Watchlist {
  stocks: WatchEntry[]
  skipped: number
  available: boolean
}

const TICKER_RE = /^[A-Z][A-Z0-9.\-]{0,9}$/
const LISTS: readonly string[] = ['core', 'brands']
const CADENCES: readonly string[] = ['nightly', 'weekly', 'once', 'paused']

const UNAVAILABLE: Watchlist = { stocks: [], skipped: 0, available: false }

/** Mirrors tools/watchlist.ps1: bad ticker/list entries are skipped, an unknown cadence is paused. */
export async function loadWatchlist(path: string): Promise<Watchlist> {
  let text: string
  try {
    text = (await readFile(path, 'utf8')).replace(/^\uFEFF/, '')
  } catch {
    return { ...UNAVAILABLE }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ...UNAVAILABLE }
  }
  const list = (parsed as { stocks?: unknown } | null)?.stocks
  if (!Array.isArray(list)) return { ...UNAVAILABLE }

  const stocks: WatchEntry[] = []
  let skipped = 0
  for (const raw of list) {
    const r = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : null
    if (!r || typeof r.ticker !== 'string' || !TICKER_RE.test(r.ticker) || typeof r.list !== 'string' || !LISTS.includes(r.list)) {
      skipped++
      continue
    }
    const cadence = typeof r.cadence === 'string' && CADENCES.includes(r.cadence) ? (r.cadence as Cadence) : 'paused'
    const entry: WatchEntry = { ticker: r.ticker, list: r.list as WatchList, cadence }
    if (typeof r.lesson === 'string') entry.lesson = r.lesson
    stocks.push(entry)
  }
  return { stocks, skipped, available: true }
}
