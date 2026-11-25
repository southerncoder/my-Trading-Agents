import { parseBars } from '../scorecard/score.js'

/**
 * Recent daily closes per ticker (about 90 trading days), for the sparklines on the Today trigger table.
 * One Yahoo request per ticker, four at a time, kept for six hours.
 */

export interface SparkDeps {
  yahooUrl: string
  fetchText: (url: string) => Promise<string>
}

export type Closes = { date: string; close: number }[]

const TTL = 6 * 3600 * 1000
const FAIL_TTL = 15 * 60 * 1000
const cache = new Map<string, { at: number; ttl: number; data: Closes }>()
const DAY = 86_400_000
const iso = (t: number) => new Date(t).toISOString().slice(0, 10)

export async function loadSparks(d: SparkDeps, tickers: string[], now = Date.now()): Promise<Record<string, Closes>> {
  const out: Record<string, Closes> = {}
  const todo: string[] = []
  for (const t of [...new Set(tickers)].slice(0, 60)) {
    const hit = cache.get(t)
    if (hit && now - hit.at < hit.ttl) out[t] = hit.data
    else todo.push(t)
  }
  const start = iso(now - 140 * DAY)
  const end = iso(now + DAY)
  for (let i = 0; i < todo.length; i += 4) {
    await Promise.all(
      todo.slice(i, i + 4).map(async (t) => {
        try {
          const bars = parseBars(await d.fetchText(`${d.yahooUrl}/api/historical/${encodeURIComponent(t)}?startDate=${start}&endDate=${end}`))
          const data = bars.filter((b) => b.close > 0).slice(-90).map((b) => ({ date: b.date, close: Math.round(b.close * 100) / 100 }))
          cache.set(t, { at: now, ttl: data.length ? TTL : FAIL_TTL, data })
          out[t] = data
        } catch {
          cache.set(t, { at: now, ttl: FAIL_TTL, data: [] })
          out[t] = []
        }
      }),
    )
  }
  while (cache.size > 500) cache.delete(cache.keys().next().value as string)
  return out
}
