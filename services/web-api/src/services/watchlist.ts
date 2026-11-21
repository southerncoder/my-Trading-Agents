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
    const ticker = typeof r?.ticker === 'string' ? r.ticker.trim().toUpperCase() : ''
    if (!r || !TICKER_RE.test(ticker)) {
      skipped++
      continue
    }
    // watchlist.ps1: any list other than core is brands; a missing cadence is nightly; cadence is case-insensitive.
    const list = r.list === 'core' ? 'core' : 'brands'
    const rawCadence = typeof r.cadence === 'string' && r.cadence ? r.cadence.toLowerCase() : 'nightly'
    const cadence = CADENCES.includes(rawCadence) ? (rawCadence as Cadence) : 'paused'
    const entry: WatchEntry = { ticker, list, cadence }
    if (typeof r.lesson === 'string' && r.lesson) entry.lesson = r.lesson
    stocks.push(entry)
  }  return { stocks, skipped, available: true }
}
