import { z } from 'zod'

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
})

export const stockDetailSchema = z.object({
  ticker: z.string(),
  date: z.string(),
  history: z.array(historyPointSchema),
  stages: z.record(z.string(), z.string()).nullable(),
})

export type HistoryPoint = z.infer<typeof historyPointSchema>
export type StockDetail = z.infer<typeof stockDetailSchema>

export async function fetchStock(ticker: string, date?: string): Promise<StockDetail> {
  const q = date ? `?date=${encodeURIComponent(date)}` : ''
  return stockDetailSchema.parse(await getJson(`stock/${encodeURIComponent(ticker)}${q}`))
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
  }),
})

export type ScoreCell = z.infer<typeof scoreCellSchema>
export type Scorecard = z.infer<typeof scorecardSchema>

export async function fetchScorecard(): Promise<Scorecard | null> {
  const data = z.object({ scorecard: scorecardSchema.nullable() }).parse(await getJson('scorecard'))
  return data.scorecard
}
