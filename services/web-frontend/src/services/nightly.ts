import { z } from 'zod'
import { educationalReviewSchema } from './portfolio'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const numOpt = z.number().nullish()

export const nightlyRowSchema = z.object({
  date: z.string(),
  ticker: z.string(),
  group: z.string(),
  profile: z.string(),
  label: z.string(),
  action_now: z.string(),
  decision: z.string(),
  confidence: z.number(),
  price: z.number(),
  trigger_price: numOpt,
  trigger_type: z.string().nullish(),
  trigger_reason: z.string().nullish(),
  walk_away: numOpt,
  atr: numOpt,
  stance: z.record(z.string(), z.string()),
  pm: z.object({
    rationale: z.string().nullish(),
    key_risks: z.array(z.string()).nullish(),
    what_would_change_my_mind: z.string().nullish(),
  }),
  change_pct: z.number().nullable(),
  distance_to_trigger_pct: z.number().nullable(),
  inside_half_day: z.boolean(),
})

export const nightlyDaySchema = z.object({
  date: z.string(),
  profile: z.string(),
  stale: z.boolean(),
  expected_date: z.string(),
  skipped_lines: z.number(),
  rows: z.array(nightlyRowSchema),
  summary: z.object({
    by_label: z.record(z.string(), z.number()),
    inside_half_day: z.number(),
    biggest_mover: z.object({ ticker: z.string(), change_pct: z.number() }).nullable(),
  }),
})

export type NightlyRow = z.infer<typeof nightlyRowSchema>
export type NightlyDay = z.infer<typeof nightlyDaySchema>

async function getJson(path: string): Promise<unknown> {
  return getApi(`nightly/${path}`)
}

async function getApi(path: string): Promise<unknown> {
  const res = await fetch(`${API_BASE_URL}/${path}`)
  type Reply = { success?: boolean; data?: unknown; error?: string }
  // A proxy error page (nginx 502) is HTML, so a failed parse must not hide the status code.
  const body: Reply | null = await res.json().then(
    (b) => b as Reply,
    () => null,
  )
  if (!res.ok || !body || body.success === false) {
    throw new Error(body?.error || `Request failed (${res.status})`)
  }
  return body.data
}

export async function fetchLatestNight(): Promise<NightlyDay> {
  return nightlyDaySchema.parse(await getJson('latest'))
}

export async function fetchNight(date: string): Promise<NightlyDay> {
  return nightlyDaySchema.parse(await getJson(encodeURIComponent(date)))
}

export async function fetchNightDates(): Promise<string[]> {
  return z.array(z.string()).parse(await getJson('dates'))
}

export const historyPointSchema = z.object({
  date: z.string(),
  profile: z.string(),
  price: z.number(),
  label: z.string(),
  decision: z.string(),
  confidence: z.number(),
  trigger_price: numOpt,
  trigger_type: z.string().nullish(),
  walk_away: numOpt,
  ma50: numOpt,
  ma200: numOpt,
})

export const stockDetailSchema = z.object({
  ticker: z.string(),
  date: z.string(),
  history: z.array(historyPointSchema),
  stages: z.record(z.string(), z.string()).nullable(),
  review: educationalReviewSchema.nullable().optional(),
  stance: z.record(z.string(), z.string()).optional(),
})

export type HistoryPoint = z.infer<typeof historyPointSchema>
export type StockDetail = z.infer<typeof stockDetailSchema>

export async function fetchStock(ticker: string, date?: string): Promise<StockDetail> {
  const q = date ? `?date=${encodeURIComponent(date)}` : ''
  return stockDetailSchema.parse(await getJson(`stock/${encodeURIComponent(ticker)}${q}`))
}
export const macroIndicatorSchema = z.object({
  key: z.string(),
  source: z.string(),
  group: z.string(),
  label: z.string(),
  value: z.number(),
  display: z.string(),
  date: z.string(),
  dateLabel: z.string(),
  compare: z.array(z.object({ label: z.string(), value: z.number(), display: z.string() })),
  url: z.string(),
})

export const macroSchema = z.object({
  asOf: z.string(),
  sources: z.object({ bls: z.boolean(), fred: z.boolean() }),
  indicators: z.array(macroIndicatorSchema).default([]),
  notes: z.array(z.string()),
})

export type MacroIndicator = z.infer<typeof macroIndicatorSchema>
export type Macro = z.infer<typeof macroSchema>

/** Official macro figures (BLS, FRED) as known on a night: the same data the market analyst was given. */
export async function fetchMacro(date?: string): Promise<Macro> {
  const q = date ? `?date=${encodeURIComponent(date)}` : ''
  return macroSchema.parse(await getJson(`macro${q}`))
}

const cadenceSchema = z.enum(['nightly', 'weekly', 'once', 'paused'])

export const watchlistSchema = z.object({
  available: z.boolean(),
  skipped: z.number(),
  counts: z.object({ nightly: z.number(), weekly: z.number(), once: z.number(), paused: z.number() }),
  pending: z
    .array(
      z.object({
        id: z.string(),
        at: z.string(),
        action: z.enum(['add', 'set_cadence']),
        ticker: z.string(),
        list: z.enum(['core', 'brands']).nullish(),
        cadence: cadenceSchema,
      }),
    )
    .default([]),
  stocks: z.array(
    z.object({
      ticker: z.string(),
      list: z.enum(['core', 'brands']),
      cadence: cadenceSchema,
      lesson: z.string().nullish(),
      latest: z
        .object({
          date: z.string(),
          price: z.number(),
          label: z.string(),
          decision: z.string(),
          confidence: z.number(),
          trigger_price: numOpt,
        })
        .nullable(),
    }),
  ),
})

export const runStatusSchema = z.object({
  status: z.object({ date: z.string(), lines: z.array(z.string()) }).nullable(),
  models: z
    .object({
      date: z.string(),
      profile: z.string(),
      fast_model: z.string().nullish(),
      decision_model: z.string().nullish(),
      rows: z.number(),
    })
    .nullable(),
})

export interface WatchlistRequestInput {
  action: 'add' | 'set_cadence'
  ticker: string
  cadence: 'nightly' | 'weekly' | 'once' | 'paused'
  list?: 'core' | 'brands'
  lesson?: string
}

/** Queues a change for the next nightly run. The API never edits the watchlist itself. */
export async function postWatchlistRequest(req: WatchlistRequestInput): Promise<{ id: string }> {
  const res = await fetch(`${API_BASE_URL}/watchlist/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  type Reply = { success?: boolean; data?: { id?: string }; error?: string }
  const body: Reply | null = await res.json().then(
    (j: unknown) => j as Reply,
    () => null,
  )
  const id = body?.data?.id
  if (!res.ok || !body || body.success === false || typeof id !== 'string') {
    throw new Error(body?.error || `Could not save the change (error ${res.status})`)
  }
  return { id }
}

export type Watchlist = z.infer<typeof watchlistSchema>
export type WatchStock = Watchlist['stocks'][number]
export type RunStatus = z.infer<typeof runStatusSchema>

export async function fetchWatchlist(): Promise<Watchlist> {
  return watchlistSchema.parse(await getApi('watchlist'))
}

export async function fetchRunStatus(): Promise<RunStatus> {
  return runStatusSchema.parse(await getJson('status'))
}

const platformSchema = z.object({
  nights: z.array(
    z.object({
      date: z.string(),
      calls: z.number(),
      bySource: z.record(z.string(), z.number()),
      profile: z.string(),
      fast_model: z.string().optional(),
      decision_model: z.string().optional(),
      seconds_total: z.number().nullable(),
      seconds_median: z.number().nullable(),
      minutes: z.number().nullable(),
    }),
  ),
  lastNight: z.object({ date: z.string(), stocks: z.array(z.object({ ticker: z.string(), group: z.string(), seconds: z.number() })) }).nullable(),
  services: z.array(z.object({ name: z.string(), role: z.string(), ok: z.boolean(), ms: z.number().nullable(), status: z.number().nullable() })),
})
export type Platform = z.infer<typeof platformSchema>

export async function fetchPlatform(): Promise<Platform> {
  return platformSchema.parse(await getJson('platform'))
}

const scoreCellSchema = z.object({
  key: z.string(),
  horizon: z.number(),
  n: z.number(),
  avg_ret_pct: z.number(),
  avg_excess_pct: z.number(),
  up_share: z.number(),
  enough: z.boolean(),
  trigger: z
    .object({ n: z.number(), fill_rate: z.number(), cancelled_rate: z.number(), wait_minus_now_pct: z.number() })
    .nullish(),
})

export const scorecardSchema = z.object({
  generated_at: z.string(),
  benchmark: z.string(),
  horizons: z.array(z.number()),
  calls: z.number(),
  unscored: z.number(),
  matured: z.record(z.string(), z.number()),
  groups: z.object({
    label: z.array(scoreCellSchema),
    band: z.array(scoreCellSchema),
    profile: z.array(scoreCellSchema),
    ticker: z.array(scoreCellSchema).default([]),
    night: z.array(scoreCellSchema).default([]),
  }),
  detail: z
    .array(
      z.object({
        date: z.string(),
        ticker: z.string(),
        label: z.string(),
        confidence: z.number(),
        horizon: z.number(),
        ret_pct: z.number(),
        excess_pct: z.number(),
        fill: z.enum(['filled', 'not_filled', 'cancelled']).optional(),
        wait_ret_pct: z.number().optional(),
      }),
    )
    .default([]),
})

export type ScoreCell = z.infer<typeof scoreCellSchema>
export type ScoreDetail = z.infer<typeof scorecardSchema>['detail'][number]
export type Scorecard = z.infer<typeof scorecardSchema>

export async function fetchScorecard(): Promise<Scorecard | null> {
  const data = z.object({ scorecard: scorecardSchema.nullable() }).parse(await getJson('scorecard'))
  return data.scorecard
}

const mentionSchema = z.object({ stage: z.string(), text: z.string(), hypothetical: z.boolean() })

export const matterSchema = z.object({
  key: z.string(),
  title: z.string(),
  kind: z.enum(['enforcement', 'policy']),
  stages: z.array(z.string()),
  stage: z.number(),
  active: z.boolean(),
  reported: z.boolean(),
  agencies: z.array(z.string()),
  about: z.array(z.string()).default([]),
  mentions: z.array(mentionSchema),
  usedBy: z.array(z.string()),
  callText: z.array(z.object({ use: z.string(), text: z.string() })),
  fineCapPct: numOpt,
  firstSeen: z.string().nullish(),
  sinceFirst: z.object({ from: z.string(), stockPct: z.number(), spyPct: numOpt }).nullish(),
})

const figuresSchema = z.object({
  end: z.string(),
  filed: z.string(),
  derived: z.boolean().nullish(),
  revenue: numOpt,
  netIncome: numOpt,
  epsDiluted: numOpt,
})

const strOpt = z.string().nullish()

export const companyProfileSchema = z.object({
  name: z.string(),
  exchange: strOpt,
  sector: strOpt,
  industry: strOpt,
  summary: strOpt,
  address: strOpt,
  city: strOpt,
  state: strOpt,
  country: strOpt,
  phone: strOpt,
  website: strOpt,
  irWebsite: strOpt,
  employees: numOpt,
  officers: z.array(z.object({ name: z.string(), title: z.string(), age: numOpt })).default([]),
  marketCap: numOpt,
  trailingPE: numOpt,
  forwardPE: numOpt,
  dividendYield: numOpt,
  beta: numOpt,
  low52: numOpt,
  high52: numOpt,
  sharesOutstanding: numOpt,
  institutionsPct: numOpt,
  insidersPct: numOpt,
  shortPctFloat: numOpt,
  profitMargin: numOpt,
  nextEarnings: strOpt,
  exDividend: strOpt,
})

export type CompanyProfile = z.infer<typeof companyProfileSchema>

export const stockExtrasSchema = z.object({
  profile: companyProfileSchema.nullish(),
  properties: z.object({ form: z.string(), filed: z.string(), url: z.string(), text: z.string(), truncated: z.boolean() }).nullish(),
  prices: z.array(z.object({ date: z.string(), close: z.number() })),
  pricesError: z.string().nullish(),
  fundamentals: z
    .object({
      name: z.string(),
      cik: z.string(),
      industry: z.string().nullish(),
      asOf: z.string(),
      quarterly: z.array(figuresSchema),
      annual: z.array(figuresSchema),
      recentFilings: z.array(
        z.object({ form: z.string(), filed: z.string(), period: z.string().nullish(), items: z.array(z.string()).nullish(), url: z.string().nullish() }),
      ),
      company: z
        .object({
          incorporatedIn: z.string().nullish(),
          fiscalYearEnd: z.string().nullish(),
          exchanges: z.array(z.string()).default([]),
          filerCategory: z.string().nullish(),
          businessAddress: z.string().nullish(),
          formerNames: z.array(z.object({ name: z.string(), to: z.string().nullish() })).default([]),
        })
        .nullish(),
    })
    .nullable(),
  fundamentalsError: z.string().nullish(),
  regulatory: z.object({
    exposure: z.enum(['none', 'watch', 'elevated', 'high']),
    matters: z.array(matterSchema),
    nightsChecked: z.number(),
  }),
})

export type Matter = z.infer<typeof matterSchema>
export type StockExtras = z.infer<typeof stockExtrasSchema>

/** Daily prices, SEC quarters and the regulatory matters for a stock's night (loaded after the page itself). */
export async function fetchStockExtras(ticker: string, date?: string): Promise<StockExtras> {
  const q = date ? `?date=${encodeURIComponent(date)}` : ''
  return stockExtrasSchema.parse(await getJson(`stock/${encodeURIComponent(ticker)}/extras${q}`))
}

export const stockMediaSchema = z.object({
  articles: z.array(
    z.object({ title: z.string(), url: z.string(), source: z.string(), published: strOpt, description: strOpt, image: strOpt }),
  ),
  articlesError: strOpt,
  social: z
    .object({
      days: z.array(z.object({ date: z.string(), score: z.number(), bull: z.number(), bear: z.number() })),
      avg7d: numOpt,
      docs: z.array(
        z.object({ url: z.string(), domain: z.string(), title: z.string(), kind: z.string(), published: strOpt, sentiment: numOpt, stance: strOpt }),
      ),
    })
    .nullable(),
  socialError: strOpt,
  fetchedAt: z.string(),
})

export type StockMedia = z.infer<typeof stockMediaSchema>

/** News articles and social sentiment with links (cached a few hours on the server). */
export async function fetchStockMedia(ticker: string): Promise<StockMedia> {
  return stockMediaSchema.parse(await getJson(`stock/${encodeURIComponent(ticker)}/media`))
}
