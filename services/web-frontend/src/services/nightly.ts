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
  const res = await fetch(`${API_BASE_URL}/nightly/${path}`)
  const body = (await res.json()) as { success?: boolean; data?: unknown; error?: string }
  if (!res.ok || body.success === false) {
    throw new Error(body.error || `Request failed (${res.status})`)
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