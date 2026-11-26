import { parseBars } from '../scorecard/score.js'
import { lastCloseBefore } from './sparks.js'

/**
 * Two honesty checks for the Platform page.
 *
 * 1. Price cross-check: the last few daily closes from the Yahoo service against Nasdaq's public quote data.
 *    Every chart, score and backtest uses the Yahoo closes, so a silent fault there would mislead everything.
 * 2. Provider status: whether each data provider behind the services actually returns data (not just whether
 *    the service answers its health check).
 */

export interface PriceCheck {
  ticker: string
  status: 'match' | 'mismatch' | 'no_second_source' | 'no_prices'
  compared: number
  maxDiffPct: number | null
  worst?: { date: string; yahoo: number; nasdaq: number }
}

export interface CheckDeps {
  yahooUrl: string
  fetchText: (url: string) => Promise<string>
  /** GET with headers (Nasdaq answers only browser-like requests), returning the parsed JSON. */
  fetchJson: (url: string, headers: Record<string, string>) => Promise<unknown>
}

const TOLERANCE_PCT = 0.5
const iso = (t: number) => new Date(t).toISOString().slice(0, 10)

/** "11/24/2026" + "$155.38" rows from Nasdaq's historical endpoint, as date -> close. */
export function nasdaqCloses(body: unknown): Map<string, number> {
  const rows = (((body as { data?: { tradesTable?: { rows?: unknown[] } } })?.data?.tradesTable?.rows ?? []) as Array<Record<string, unknown>>)
  const out = new Map<string, number>()
  for (const r of rows) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(r.date ?? ''))
    const v = Number(String(r.close ?? '').replace(/[$,]/g, ''))
    if (m && Number.isFinite(v) && v > 0) out.set(`${m[3]}-${m[1]}-${m[2]}`, v)
  }
  return out
}

/** Compare the closes both sources have; a difference above half a percent on any day is a mismatch. */
export function compareCloses(ticker: string, yahoo: Map<string, number>, nasdaq: Map<string, number>, days = 5): PriceCheck {
  if (!yahoo.size) return { ticker, status: 'no_prices', compared: 0, maxDiffPct: null }
  if (!nasdaq.size) return { ticker, status: 'no_second_source', compared: 0, maxDiffPct: null }
  const dates = [...yahoo.keys()].filter((d) => nasdaq.has(d)).sort().slice(-days)
  if (!dates.length) return { ticker, status: 'no_second_source', compared: 0, maxDiffPct: null }
  let worst: PriceCheck['worst']
  let max = 0
  for (const d of dates) {
    const y = yahoo.get(d) as number
    const n = nasdaq.get(d) as number
    const diff = (Math.abs(y - n) / n) * 100
    if (diff >= max) {
      max = diff
      worst = { date: d, yahoo: Math.round(y * 100) / 100, nasdaq: n }
    }
  }
  return { ticker, status: max > TOLERANCE_PCT ? 'mismatch' : 'match', compared: dates.length, maxDiffPct: Math.round(max * 1000) / 1000, worst }
}

const priceCache = new Map<string, { at: number; check: PriceCheck }>()

export async function crossCheckPrices(d: CheckDeps, tickers: string[], now = Date.now()): Promise<PriceCheck[]> {
  const start = iso(now - 14 * 86_400_000)
  const end = iso(now + 86_400_000)
  const out: PriceCheck[] = []
  const todo = tickers.filter((t) => {
    const hit = priceCache.get(t)
    if (hit && hit.at >= lastCloseBefore(now) && now - hit.at < 6 * 3600_000) {
      out.push(hit.check)
      return false
    }
    return true
  })
  for (let i = 0; i < todo.length; i += 4) {
    const batch = await Promise.all(
      todo.slice(i, i + 4).map(async (t) => {
        let yahoo = new Map<string, number>()
        try {
          yahoo = new Map(parseBars(await d.fetchText(`${d.yahooUrl}/api/historical/${encodeURIComponent(t)}?startDate=${start}&endDate=${end}`)).map((b) => [b.date, b.close]))
        } catch {
          // counted as no_prices
        }
        let nasdaq = new Map<string, number>()
        for (const cls of t === 'SPY' ? ['etf', 'stocks'] : ['stocks', 'etf']) {
          try {
            nasdaq = nasdaqCloses(await d.fetchJson(`https://api.nasdaq.com/api/quote/${encodeURIComponent(t)}/historical?assetclass=${cls}&fromdate=${start}&todate=${end}&limit=20`, { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' }))
          } catch {
            // try the other asset class
          }
          if (nasdaq.size) break
        }
        const check = compareCloses(t, yahoo, nasdaq)
        if (check.status !== 'no_second_source') priceCache.set(t, { at: now, check })
        return check
      }),
    )
    out.push(...batch)
  }
  return out.sort((a, b) => a.ticker.localeCompare(b.ticker))
}

export interface ProviderItem {
  group: string
  name: string
  ok: boolean
  /** Not a failure: switched off on purpose or not needed (shown grey). */
  off?: boolean
  detail: string
}

export interface ProviderDeps {
  newsUrl: string
  governmentDataUrl: string
  socialUrl: string
  yahooUrl: string
  getJson: (url: string) => Promise<{ status: number; body: unknown }>
  /**
   * logs/provider-cache/status.json, written by the analysis runs. The metered vendors (Finnhub, Alpha Vantage,
   * Marketstack) are reported from it rather than called here: a status check must not spend their small quotas.
   */
  readVendorStatus?: () => Promise<unknown>
}

const VENDORS: Array<{ key: string; group: string; name: string; use: string }> = [
  { key: 'finnhub', group: 'Fundamentals', name: 'Finnhub', use: 'analyst ratings, earnings record, insider trades' },
  { key: 'alpha-vantage', group: 'Fundamentals', name: 'Alpha Vantage', use: 'company overview' },
  { key: 'marketstack', group: 'Prices', name: 'Marketstack', use: 'second source for closes' },
]

/** One row per metered vendor from the runs' status file; never throws. */
export function vendorItems(status: unknown): ProviderItem[] {
  const all = o(status)
  return VENDORS.map((v) => {
    const s = o(all[v.key])
    if (!Object.keys(s).length) return { group: v.group, name: v.name, ok: false, off: true, detail: `${v.use}; not used by a run yet` }
    const limits = o(s.limits)
    const used = limits.perMonth !== undefined ? `${s.usedThisMonth}/${limits.perMonth} this month` : `${s.usedToday}/${limits.perDay} today`
    const when = String(s.at ?? '').slice(0, 16).replace('T', ' ')
    return { group: v.group, name: v.name, ok: s.ok === true, detail: `${String(s.detail ?? '')} (${used}; ${when} UTC)` }
  })
}

type Obj = Record<string, unknown>
const o = (v: unknown): Obj => (v && typeof v === 'object' ? (v as Obj) : {})

/** Ask each service a small real question and report every provider behind it. Never throws. */
export async function providerStatus(d: ProviderDeps): Promise<ProviderItem[]> {
  const safe = async (url: string) => {
    try {
      return await d.getJson(url)
    } catch (e) {
      return { status: 0, body: { error: (e as Error).message } }
    }
  }
  const [news, macro, sec, census, senti, reddit, quote] = await Promise.all([
    safe(`${d.newsUrl}/api/financial-news/KO?lookBackDays=3&pageSize=5`),
    safe(`${d.governmentDataUrl}/api/macro`),
    safe(`${d.governmentDataUrl}/api/company/KO/fundamentals`),
    safe(`${d.governmentDataUrl}/api/census/states/2022`),
    safe(`${d.socialUrl}/api/sentisense/SPY`),
    safe(`${d.socialUrl}/health`),
    safe(`${d.yahooUrl}/api/quote/SPY`),
  ])
  const items: ProviderItem[] = []

  const rep = o(o(news.body).providers)
  const list = (k: string) => (Array.isArray(rep[k]) ? (rep[k] as unknown[]) : [])
  for (const u of list('used')) items.push({ group: 'News', name: String(o(u).name), ok: true, detail: `${o(u).articles} articles for KO` })
  for (const n of list('empty')) items.push({ group: 'News', name: String(n), ok: false, detail: 'answered with no articles' })
  for (const f of list('failed')) items.push({ group: 'News', name: String(o(f).name), ok: false, detail: String(o(f).error ?? 'failed') })
  for (const s of list('skipped')) items.push({ group: 'News', name: String(s), ok: false, detail: 'skipped as unhealthy' })
  if (!items.some((i) => i.group === 'News')) items.push({ group: 'News', name: 'news service', ok: false, detail: news.status ? `answered ${news.status}` : 'not reachable' })
  items.push({ group: 'News', name: 'serp-api', ok: false, off: true, detail: 'switched off on purpose (charges per search)' })

  const m = o(macro.body)
  const src = o(m.sources)
  const notes = Array.isArray(m.notes) ? (m.notes as string[]) : []
  items.push({ group: 'Government', name: 'BLS (jobs, inflation)', ok: src.bls === true, detail: src.bls === true ? 'in the macro summary' : notes.find((n) => /labor/i.test(n)) ?? 'missing from the macro summary' })
  items.push({ group: 'Government', name: 'FRED (rates, yields, volatility)', ok: src.fred === true, detail: src.fred === true ? 'in the macro summary' : notes.find((n) => /fred/i.test(n)) ?? 'missing from the macro summary' })
  const f = o(sec.body)
  items.push({ group: 'Government', name: 'SEC (filings, fundamentals)', ok: sec.status === 200 && !!f.name, detail: sec.status === 200 && f.name ? `${f.name}: ${Array.isArray(f.recentFilings) ? f.recentFilings.length : 0} recent filings` : `answered ${sec.status}` })
  items.push(
    census.status === 503
      ? { group: 'Government', name: 'Census', ok: false, off: true, detail: 'needs a free API key; nothing in the analysis uses it' }
      : { group: 'Government', name: 'Census', ok: census.status === 200, detail: census.status === 200 ? 'answering' : `answered ${census.status}` },
  )

  const sd = o(o(senti.body).data)
  items.push({ group: 'Social', name: 'SentiSense', ok: !!sd.score, detail: sd.score ? `score and ${Array.isArray(sd.documents) ? sd.documents.length : 0} documents for SPY` : `answered ${senti.status}` })
  const r = o(o(o(reddit.body).platforms).reddit)
  items.push(
    r.configured === false
      ? { group: 'Social', name: 'Reddit', ok: false, off: true, detail: 'no credentials configured' }
      : { group: 'Social', name: 'Reddit', ok: r.ok === true, detail: r.ok === true ? 'login works' : String(r.error ?? 'login not checked') },
  )

  const q = o(o(quote.body).data)
  items.push({ group: 'Prices', name: 'Yahoo Finance', ok: quote.status === 200 && Number(q.regularMarketPrice) > 0, detail: quote.status === 200 && q.regularMarketPrice ? `SPY ${q.regularMarketPrice}` : `answered ${quote.status}` })
  let vendorStatus: unknown = null
  try {
    vendorStatus = d.readVendorStatus ? await d.readVendorStatus() : null
  } catch {
    // no runs yet, or the file is mid-write: shown as not used yet
  }
  items.push(...vendorItems(vendorStatus))
  return items
}
