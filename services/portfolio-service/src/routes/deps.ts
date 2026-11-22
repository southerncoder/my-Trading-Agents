import type pg from 'pg'
import { z } from 'zod'
import type { Market } from '../market/yahoo.js'
import { UserError } from './http.js'

export interface ServiceDeps {
  pool: pg.Pool
  market: Market
  ledgerPath: string
  /** Clock, replaceable in tests. */
  now?: () => Date
  /** Base URL of the news service (news-driven picks). */
  newsUrl?: string
  /** Ollama base URL and the model for the weekly review. */
  ollamaUrl?: string
  reviewModel?: () => string | null
  /** Tickers already on the watchlist (excluded from screen and news picks). */
  watchlist?: () => string[]
  /** Replaceable LLM call for the weekly review (tests). */
  llm?: (model: string, system: string, user: string) => Promise<string>
  /** Replaceable fetch for the news service (tests). */
  fetch?: typeof fetch
}

/** Today's date in the market's home time zone (the nightly run is on Chicago time). */
export function today(deps: ServiceDeps): string {
  const d = deps.now ? deps.now() : new Date()
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

export const tickerSchema = z
  .string()
  .transform((s) => s.trim().toUpperCase())
  .pipe(z.string().regex(/^[A-Z][A-Z0-9.-]{0,9}$/, 'must be a stock symbol like KO or BRK-B'))

export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD')
  .refine((s) => !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime()) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s), 'is not a real date')

/** The latest regular-market price for a ticker, or a clear error. */
export async function quotePrice(deps: ServiceDeps, ticker: string): Promise<number> {
  let q
  try {
    q = (await deps.market.quotes([ticker]))[0]
  } catch {
    throw new UserError('Could not get a price right now; enter the price yourself', 502)
  }
  const p = q?.regularMarketPrice
  if (!p || !(p > 0)) throw new UserError(`No price found for ${ticker}`, 404)
  return p
}
