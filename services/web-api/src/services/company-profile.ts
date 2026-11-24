/**
 * Who the company is, from Yahoo Finance's quote summary (assetProfile, price, summaryDetail,
 * defaultKeyStatistics, calendarEvents). These are today's figures, not as of the night shown.
 */
export interface CompanyProfile {
  name: string
  exchange?: string
  sector?: string
  industry?: string
  summary?: string
  address?: string
  city?: string
  state?: string
  country?: string
  phone?: string
  website?: string
  irWebsite?: string
  employees?: number
  officers: { name: string; title: string; age?: number }[]
  marketCap?: number
  trailingPE?: number
  forwardPE?: number
  dividendYield?: number
  beta?: number
  low52?: number
  high52?: number
  sharesOutstanding?: number
  institutionsPct?: number
  insidersPct?: number
  shortPctFloat?: number
  profitMargin?: number
  nextEarnings?: string
  exDividend?: string
}

export const PROFILE_MODULES = 'assetProfile,price,summaryDetail,defaultKeyStatistics,calendarEvents'

type Obj = Record<string, unknown>
const obj = (v: unknown): Obj => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Obj) : {})
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
const day = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : undefined)

/** The profile from a quote-summary response body, or null when it names no company. */
export function pickProfile(body: unknown, today = new Date().toISOString().slice(0, 10)): CompanyProfile | null {
  const data = obj(obj(body).data)
  const a = obj(data.assetProfile)
  const p = obj(data.price)
  const s = obj(data.summaryDetail)
  const k = obj(data.defaultKeyStatistics)
  const c = obj(data.calendarEvents)
  const name = str(p.longName) ?? str(p.shortName)
  if (!name) return null

  const officers = (Array.isArray(a.companyOfficers) ? a.companyOfficers : [])
    .map(obj)
    .map((o) => ({ name: str(o.name)?.replace(/\s+/g, ' ').replace(/^(Mr|Ms|Mrs|Dr)\.\s+/, ''), title: str(o.title), age: num(o.age) }))
    .filter((o): o is { name: string; title: string; age: number | undefined } => !!o.name && !!o.title)
    .slice(0, 5)
    .map((o) => (o.age === undefined ? { name: o.name, title: o.title } : o))

  const earnings = (Array.isArray(obj(c.earnings).earningsDate) ? (obj(c.earnings).earningsDate as unknown[]) : []).map(day).filter((d): d is string => !!d)
  const nextEarnings = earnings.find((d) => d >= today)

  return {
    name,
    exchange: str(p.exchangeName),
    sector: str(a.sector),
    industry: str(a.industry),
    summary: str(a.longBusinessSummary),
    address: str(a.address1),
    city: str(a.city),
    state: str(a.state),
    country: str(a.country),
    phone: str(a.phone),
    website: str(a.website),
    irWebsite: str(a.irWebsite),
    employees: num(a.fullTimeEmployees),
    officers,
    marketCap: num(s.marketCap) ?? num(p.marketCap),
    trailingPE: num(s.trailingPE),
    forwardPE: num(s.forwardPE),
    dividendYield: num(s.dividendYield),
    beta: num(s.beta),
    low52: num(s.fiftyTwoWeekLow),
    high52: num(s.fiftyTwoWeekHigh),
    sharesOutstanding: num(k.sharesOutstanding),
    institutionsPct: num(k.heldPercentInstitutions),
    insidersPct: num(k.heldPercentInsiders),
    shortPctFloat: num(k.shortPercentOfFloat),
    profitMargin: num(k.profitMargins),
    nextEarnings,
    exDividend: day(c.exDividendDate) ?? day(s.exDividendDate),
  }
}
