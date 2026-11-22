import { addDays } from '../domain/calendar.js'
import type { Bar } from '../domain/types.js'

/** The quote fields the portfolio uses (from the yahoo-finance service's POST /api/quotes). */
export interface Quote {
  symbol: string
  shortName?: string
  longName?: string
  displayName?: string
  regularMarketPrice?: number
  fiftyDayAverage?: number
  twoHundredDayAverage?: number
  fiftyTwoWeekHigh?: number
  fiftyTwoWeekLow?: number
  forwardPE?: number
  trailingPE?: number
  averageAnalystRating?: string
  marketCap?: number
  quoteType?: string
}

export interface Market {
  /** Daily bars from `from` through `to` inclusive. Empty when the service has none. */
  bars(ticker: string, from: string, to: string): Promise<Bar[]>
  quotes(tickers: string[]): Promise<Quote[]>
  profile(ticker: string): Promise<{ name: string | null; sector: string | null }>
}

export function parseBarsCsv(csv: string): Bar[] {
  const out: Bar[] = []
  for (const line of csv.split(/\r?\n/)) {
    const c = line.split(',')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(c[0] ?? '')) continue
    const [open, high, low, close] = c.slice(1, 5).map(Number)
    if ([open, high, low, close].every((n) => Number.isFinite(n) && n > 0)) out.push({ date: c[0], open, high, low, close })
  }
  return out
}

/** "2.1 - Buy" -> 2.1 (1 = strong buy, 5 = strong sell). */
export function parseRating(s: string | undefined): number | null {
  const m = /^\s*([0-9.]+)/.exec(s ?? '')
  return m ? Number(m[1]) : null
}

const TIMEOUT_MS = 40_000

export function createYahoo(baseUrl: string, fetchImpl: typeof fetch = fetch): Market {
  const get = (path: string, init?: RequestInit) => fetchImpl(`${baseUrl}${path}`, { signal: AbortSignal.timeout(TIMEOUT_MS), ...init })
  return {
    async bars(ticker, from, to) {
      const t = encodeURIComponent(ticker)
      const res = await get(`/api/historical/${t}?startDate=${from}&endDate=${addDays(to, 1)}`)
      if (res.status === 404) return []
      if (!res.ok) throw new Error(`Price history for ${ticker} failed (${res.status})`)
      return parseBarsCsv(await res.text()).filter((b) => b.date >= from && b.date <= to)
    },
    async quotes(tickers) {
      const out: Quote[] = []
      for (let i = 0; i < tickers.length; i += 100) {
        const res = await get('/api/quotes', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ symbols: tickers.slice(i, i + 100) }),
        })
        if (!res.ok) throw new Error(`Quotes failed (${res.status})`)
        const body = (await res.json()) as { data?: Quote[] | Quote }
        const data = body.data
        out.push(...(Array.isArray(data) ? data : data ? [data] : []))
      }
      return out
    },
    async profile(ticker) {
      try {
        const res = await get(`/api/quote-summary/${encodeURIComponent(ticker)}?modules=assetProfile,price`)
        if (!res.ok) return { name: null, sector: null }
        const d = ((await res.json()) as { data?: { assetProfile?: { sectorDisp?: string; sector?: string }; price?: { longName?: string; shortName?: string } } }).data
        return { name: d?.price?.longName ?? d?.price?.shortName ?? null, sector: d?.assetProfile?.sectorDisp ?? d?.assetProfile?.sector ?? null }
      } catch {
        return { name: null, sector: null }
      }
    },
  }
}
