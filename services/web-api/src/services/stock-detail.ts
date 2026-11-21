import { readFile, stat } from 'fs/promises'
import { join } from 'path'
import type { LedgerRow } from './nightly-derive.js'

export const STAGE_KEYS = [
  'market',
  'social',
  'news',
  'fundamentals',
  'bull',
  'bear',
  'research_manager',
  'trader',
  'aggressive',
  'conservative',
  'neutral',
  'pm',
] as const

export interface HistoryPoint {
  date: string
  profile: string
  price: number
  label: string
  decision: string
  confidence: number
  trigger_price?: number
  trigger_type?: string
  walk_away?: number
}

/** The ticker's rows across nights, oldest first. Nights without the ticker are skipped. */
export function stockHistory(byDate: Map<string, LedgerRow[]>, ticker: string): HistoryPoint[] {
  const out: HistoryPoint[] = []
  for (const date of [...byDate.keys()].sort()) {
    const r = byDate.get(date)?.find((x) => x.ticker === ticker)
    if (!r) continue
    out.push({
      date,
      profile: r.profile,
      price: r.price,
      label: r.label,
      decision: r.decision,
      confidence: r.confidence,
      trigger_price: r.trigger_price,
      trigger_type: r.trigger_type,
      walk_away: r.walk_away,
    })
  }
  return out
}

type Pipeline = Record<string, Record<string, unknown>>
const MAX_CACHED = 3
const cache = new Map<string, { key: string; data: Pipeline }>()

async function readPipeline(file: string): Promise<Pipeline | null> {
  let info
  try {
    info = await stat(file)
  } catch {
    return null
  }
  const key = `${info.mtimeMs}:${info.size}`
  const hit = cache.get(file)
  if (hit && hit.key === key) return hit.data
  try {
    const parsed: unknown = JSON.parse((await readFile(file, 'utf8')).replace(/^\uFEFF/, ''))
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
    cache.delete(file)
    cache.set(file, { key, data: parsed as Pipeline })
    while (cache.size > MAX_CACHED) cache.delete(cache.keys().next().value as string)
    return parsed as Pipeline
  } catch {
    return null
  }
}

/** The ticker's stage write-ups for one night, or null when the night's file or ticker is unavailable. */
export async function loadStages(logsDir: string, date: string, ticker: string): Promise<Record<string, string> | null> {
  const pipeline = await readPipeline(join(logsDir, date, 'pipeline.json'))
  const entry = pipeline?.[ticker]
  if (typeof entry !== 'object' || entry === null) return null
  const stages: Record<string, string> = {}
  for (const k of STAGE_KEYS) {
    const v = entry[k]
    if (typeof v === 'string') stages[k] = v
  }
  return stages
}
