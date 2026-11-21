import type { Watchlist, WatchlistRequestInput } from '../../services/nightly'

export type PendingChange = Watchlist['pending'][number]

export const CADENCE_HELP: Record<string, string> = {
  nightly: 'analysed every night',
  weekly: 'analysed once a week',
  once: 'analysed one time',
  paused: 'skipped for now',
}

const TICKER = /^[A-Z][A-Z0-9.-]{0,9}$/
const MAX_NOTE = 200

export interface AddInput {
  ticker: string
  list: 'core' | 'brands'
  cadence: WatchlistRequestInput['cadence']
  lesson: string
}

export type Built = { ok: true; request: WatchlistRequestInput } | { ok: false; error: string }

/** Checks the add form the way the API will, so the reader gets a plain message before anything is sent. */
export function buildAddRequest(input: AddInput, knownTickers: string[]): Built {
  const ticker = input.ticker.trim().toUpperCase()
  if (!ticker) return { ok: false, error: 'Type a ticker symbol, for example KO.' }
  if (!TICKER.test(ticker)) return { ok: false, error: 'A ticker is letters and digits only, up to 10 characters, starting with a letter.' }
  if (knownTickers.some((t) => t.toUpperCase() === ticker)) return { ok: false, error: `${ticker} is already on the watchlist or waiting to be added.` }
  const lesson = input.lesson.trim()
  if (lesson.length > MAX_NOTE) return { ok: false, error: `Keep the note under ${MAX_NOTE} characters (it is ${lesson.length}).` }
  const request: WatchlistRequestInput = { action: 'add', ticker, list: input.list, cadence: input.cadence }
  if (lesson) request.lesson = lesson
  return { ok: true, request }
}

export function describePending(p: PendingChange): string {
  const how = CADENCE_HELP[p.cadence] ?? p.cadence
  return p.action === 'add' ? `Add ${p.ticker} to ${p.list ?? 'the watchlist'}, ${how}` : `Change ${p.ticker} to ${how}`
}

/** The change waiting for a stock. The queue is in order, so the last one wins. */
export function pendingFor(pending: PendingChange[], ticker: string): PendingChange | undefined {
  const t = ticker.toUpperCase()
  return [...pending].reverse().find((p) => p.ticker.toUpperCase() === t)
}

/** The schedule the row should show: the one waiting for the next run, so the reader can see it and change it back. */
export function shownCadence(pending: PendingChange[], stock: { ticker: string; cadence: PendingChange['cadence'] }): PendingChange['cadence'] {
  return pendingFor(pending, stock.ticker)?.cadence ?? stock.cadence
}
