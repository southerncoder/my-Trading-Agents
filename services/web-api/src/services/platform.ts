import { readFile } from 'fs/promises'
import { join } from 'path'
import type { LedgerRow } from './nightly-derive.js'

/**
 * Run history and live service health for the Platform page: per night, how many calls from which source,
 * which models, how long the analysis took; per stock last night, its analysis time; per service, whether
 * its health check answers and how fast.
 */

export interface NightStat {
  date: string
  calls: number
  bySource: Record<string, number>
  profile: string
  fast_model?: string
  decision_model?: string
  /** Sum and median of the per-stock analysis seconds the ledger recorded (when it did). */
  seconds_total: number | null
  seconds_median: number | null
  /** The whole run's wall-clock minutes, from that night's status.txt ("Took 27 minutes"). */
  minutes: number | null
}

export interface ServiceCheck {
  name: string
  role: string
  ok: boolean
  ms: number | null
  status: number | null
}

export interface PlatformData {
  nights: NightStat[]
  lastNight: { date: string; stocks: { ticker: string; group: string; seconds: number }[] } | null
  services: ServiceCheck[]
}

const median = (v: number[]) => {
  if (!v.length) return null
  const s = [...v].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export function nightStats(byDate: Map<string, LedgerRow[]>, minutesOf: Record<string, number | null>): NightStat[] {
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rows]) => {
      const bySource: Record<string, number> = {}
      for (const r of rows) bySource[r.group || 'other'] = (bySource[r.group || 'other'] ?? 0) + 1
      const secs = rows.flatMap((r) => (typeof r.seconds === 'number' && r.seconds > 0 ? [r.seconds] : []))
      return {
        date,
        calls: rows.length,
        bySource,
        profile: rows[0]?.profile ?? '',
        fast_model: rows.find((r) => r.fast_model)?.fast_model,
        decision_model: rows.find((r) => r.decision_model)?.decision_model,
        seconds_total: secs.length ? secs.reduce((a, b) => a + b, 0) : null,
        seconds_median: median(secs),
        minutes: minutesOf[date] ?? null,
      }
    })
}

/** "Took 27 minutes" (or "Took 1 hour 5 minutes") from a night's status.txt, as minutes. */
export function parseMinutes(status: string): number | null {
  const m = status.match(/took\s+(?:(\d+)\s*hours?\s*)?(?:(\d+)\s*minutes?)?/i)
  if (!m || (!m[1] && !m[2])) return null
  return Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0)
}

export async function runMinutes(logsDir: string, dates: string[]): Promise<Record<string, number | null>> {
  const out: Record<string, number | null> = {}
  await Promise.all(
    dates.map(async (d) => {
      try {
        out[d] = parseMinutes((await readFile(join(logsDir, d, 'status.txt'), 'utf8')).replace(/^\uFEFF/, ''))
      } catch {
        out[d] = null
      }
    }),
  )
  return out
}

export const SERVICES: { name: string; role: string; url: string }[] = [
  { name: 'Yahoo Finance', role: 'prices, quotes, company profiles', url: 'http://yahoo-finance:3002/health' },
  { name: 'News', role: 'merged news from several providers', url: 'http://news-aggregator:3004/health' },
  { name: 'Government data', role: 'SEC filings, BLS and FRED macro', url: 'http://government-data:3005/health' },
  { name: 'Finance aggregator', role: 'extra market data providers', url: 'http://finance-aggregator:3006/health' },
  { name: 'Social sentiment', role: 'social chatter and sentiment', url: 'http://social-sentiment:3007/health' },
  { name: 'Portfolios', role: 'paper portfolios, orders, picks', url: 'http://portfolio-service:3008/api/portfolio/health' },
]

/** Each service's health check, in parallel, three seconds at most. */
export async function checkServices(fetchFn: typeof fetch = fetch, list = SERVICES): Promise<ServiceCheck[]> {
  return Promise.all(
    list.map(async (s) => {
      const t0 = Date.now()
      try {
        const r = await fetchFn(s.url, { signal: AbortSignal.timeout(3000) })
        return { name: s.name, role: s.role, ok: r.ok, ms: Date.now() - t0, status: r.status }
      } catch {
        return { name: s.name, role: s.role, ok: false, ms: null, status: null }
      }
    }),
  )
}
