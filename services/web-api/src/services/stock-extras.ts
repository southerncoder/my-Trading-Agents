import { parseBars, type Bar } from '../scorecard/score.js'
import { exposureOf, findMatters, themesIn, type Exposure, type Matter } from './regulatory.js'
import type { HistoryPoint } from './stock-detail.js'
import { pickProfile, PROFILE_MODULES, type CompanyProfile } from './company-profile.js'

/** Daily closes for the price chart. */
export interface Close {
  date: string
  close: number
}

export interface QuarterFigures {
  end: string
  filed: string
  derived?: boolean
  revenue?: number
  netIncome?: number
  epsDiluted?: number
}

export interface Fundamentals {
  name: string
  cik: string
  industry?: string
  asOf: string
  quarterly: QuarterFigures[]
  annual: QuarterFigures[]
  recentFilings: { form: string; filed: string; period?: string; items?: string[]; url?: string }[]
  company?: {
    incorporatedIn?: string
    fiscalYearEnd?: string
    exchanges: string[]
    filerCategory?: string
    businessAddress?: string
    formerNames: { name: string; to?: string }[]
  }
}

/** Item 2 (Properties) of the latest 10-K, quoted. */
export interface PropertiesSection {
  form: string
  filed: string
  url: string
  text: string
  truncated: boolean
}

export interface MatterOut extends Matter {
  firstSeen?: string
  /** Stock and S&P 500 change from the close on the first night it was mentioned to the night shown. */
  sinceFirst?: { from: string; stockPct: number; spyPct?: number }
}

export interface StockExtras {
  profile: CompanyProfile | null
  properties: PropertiesSection | null
  prices: Close[]
  pricesError?: string
  fundamentals: Fundamentals | null
  fundamentalsError?: string
  regulatory: { exposure: Exposure; matters: MatterOut[]; nightsChecked: number }
}

export interface ExtrasDeps {
  yahooUrl: string
  governmentDataUrl: string
  fetchText: (url: string) => Promise<string>
  /** Stage write-ups for a night, or null. */
  stagesFor: (date: string) => Promise<Record<string, string> | null>
}

/** Themes found per ticker and past night: a past night's write-ups do not change, and each file is ~1 MB. */
const themeCache = new Map<string, string[]>()

const DAY = 86_400_000
const iso = (t: number) => new Date(t).toISOString().slice(0, 10)

/** Last close on or before `date`. */
function closeOn(bars: Bar[], date: string): number | undefined {
  let v: number | undefined
  for (const b of bars) if (b.date <= date) v = b.close
  return v
}

const pct = (a: number, b: number) => Math.round((b / a - 1) * 1000) / 10

/**
 * Everything the stock page draws besides the ledger: ~15 months of daily closes up to today (enough for a
 * 200-day average over the last year), SEC quarterly figures as filed by the night shown, and the regulatory
 * matters in that night's write-ups. Each part fails on its own, so one slow service never blanks the page.
 */
export async function loadStockExtras(
  d: ExtrasDeps,
  ticker: string,
  date: string,
  history: HistoryPoint[],
  today = new Date(),
): Promise<StockExtras> {
  const start = iso(Date.parse(date) - 460 * DAY)
  const end = iso(today.getTime() + DAY)
  const bars = (t: string) =>
    d.fetchText(`${d.yahooUrl}/api/historical/${encodeURIComponent(t)}?startDate=${start}&endDate=${end}`).then(parseBars)

  const [own, spy, fund, stages, prof, props] = await Promise.allSettled([
    bars(ticker),
    bars('SPY'),
    d.fetchText(`${d.governmentDataUrl}/api/company/${encodeURIComponent(ticker)}/fundamentals?asOf=${date}`).then((t) => JSON.parse(t) as Fundamentals),
    d.stagesFor(date),
    d.fetchText(`${d.yahooUrl}/api/quote-summary/${encodeURIComponent(ticker)}?modules=${PROFILE_MODULES}`).then((t) => pickProfile(JSON.parse(t))),
    d.fetchText(`${d.governmentDataUrl}/api/company/${encodeURIComponent(ticker)}/properties?asOf=${date}`).then((t) => JSON.parse(t) as PropertiesSection),
  ])

  const prices = own.status === 'fulfilled' ? own.value.filter((b) => b.close > 0).map((b) => ({ date: b.date, close: b.close })) : []
  const spyBars = spy.status === 'fulfilled' ? spy.value : []

  let fundamentals: Fundamentals | null = null
  if (fund.status === 'fulfilled' && fund.value && Array.isArray(fund.value.quarterly)) {
    const f = fund.value
    fundamentals = {
      name: f.name,
      cik: f.cik,
      industry: f.industry,
      asOf: f.asOf,
      quarterly: f.quarterly,
      annual: f.annual ?? [],
      recentFilings: f.recentFilings ?? [],
      company: f.company,
    }
  }

  const profile = prof.status === 'fulfilled' ? prof.value : null
  const night = stages.status === 'fulfilled' ? stages.value : null
  const matters = night ? findMatters(night, [ticker, fundamentals?.name ?? '', profile?.name.replace(/^The /, '') ?? '']) : []

  // Earlier nights, for when each matter first showed up (at most the last 60 nights on record).
  const dates = history.map((h) => h.date).filter((x) => x <= date).slice(-60)
  const nights: Array<[string, string[]]> = []
  if (matters.length) {
    for (const x of dates) {
      const k = `${ticker}|${x}`
      let keys = x === date ? themesIn(night) : themeCache.get(k)
      if (!keys) {
        keys = themesIn(await d.stagesFor(x).catch(() => null))
        themeCache.set(k, keys)
        if (themeCache.size > 5000) themeCache.delete(themeCache.keys().next().value as string)
      }
      nights.push([x, keys])
    }
  }

  const priceOn = (x: string) => history.find((h) => h.date === x)?.price
  const out: MatterOut[] = matters.map((m) => {
    const first = nights.find(([, keys]) => keys.includes(m.key))?.[0]
    const a = first ? priceOn(first) : undefined
    const b = priceOn(date)
    if (!first || first === date || !a || !b) return { ...m, firstSeen: first }
    const sa = closeOn(spyBars, first)
    const sb = closeOn(spyBars, date)
    return { ...m, firstSeen: first, sinceFirst: { from: first, stockPct: pct(a, b), spyPct: sa && sb ? pct(sa, sb) : undefined } }
  })

  const properties = props.status === 'fulfilled' && typeof props.value?.text === 'string' ? props.value : null
  return {
    profile,
    properties,
    prices,
    pricesError: own.status === 'rejected' ? 'Daily prices could not be loaded' : undefined,
    fundamentals,
    fundamentalsError: fundamentals ? undefined : 'SEC figures could not be loaded',
    regulatory: { exposure: exposureOf(matters), matters: out, nightsChecked: nights.length || (night ? 1 : 0) },
  }
}
