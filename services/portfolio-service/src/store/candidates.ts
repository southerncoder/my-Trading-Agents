import { z } from 'zod'
import type { Db } from '../db/pool.js'
import { repairDeep } from './mojibake.js'

const num = z.number().finite().nullable().optional()
const str = z.string().nullable().optional()

/** One analysis result in the shape tools/nightly-brief.ps1 writes to data/ledger/decisions.jsonl. */
export const analysisSchema = z.looseObject({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ticker: z.string().regex(/^[A-Z][A-Z0-9.-]{0,9}$/),
  group: str,
  profile: str,
  fast_model: str,
  decision_model: str,
  adjustments: str,
  decision: z.string().min(1),
  confidence: num,
  action_now: str,
  label: z.string().min(1),
  price: num,
  ma50: num,
  ma200: num,
  target: num,
  range_pos: num,
  atr: num,
  trigger_price: num,
  trigger_type: str,
  trigger_reason: str,
  walk_away: num,
  seconds: num,
  pm: z.record(z.string(), z.unknown()).nullable().optional(),
  stance: z.record(z.string(), z.unknown()).nullable().optional(),
  educational_review: z.record(z.string(), z.string()).nullable().optional(),
})
export type Analysis = z.infer<typeof analysisSchema>

export interface EducationalReview {
  summary: string
  why_not_before_flag: string
  figures_explained: string
  buy_low_sell_high: string
  risk_temperament: string
  portfolio_fit: string
}

export type Source = 'watchlist' | 'screen' | 'news' | 'on_demand' | 'reanalysis'

/** The nightly ledger's group says where a ticker came from: screen and news picks, otherwise the watchlist. */
export function sourceForGroup(group: string | null | undefined): Source {
  return group === 'screen' || group === 'news' ? group : 'watchlist'
}

export interface Candidate {
  id: number
  run_date: string
  ticker: string
  source: Source
  decision: string
  confidence: number | null
  action_now: string | null
  label: string
  price: number | null
  trigger_price: number | null
  trigger_type: string | null
  walk_away: number | null
  rationale: string | null
  key_risks: string[]
  pm: Record<string, unknown> | null
  educational_review: EducationalReview | null
  inputs: Record<string, unknown>
  profile: string | null
  llm_seconds: number | null
}

/**
 * Stores one analysis in the decision journal. A re-run for the same night, ticker and source replaces it,
 * unless an order or position already points at it: then the journal keeps what the decision was based on.
 */
export async function upsertCandidate(db: Db, raw: Analysis, source: Source): Promise<number | null> {
  const a = repairDeep(raw)
  const pm = a.pm ?? null
  const review = a.educational_review ?? null
  const risks = Array.isArray(pm?.key_risks) ? (pm.key_risks as unknown[]).filter((r) => typeof r === 'string') : []
  const inputs = {
    price: a.price ?? null, ma50: a.ma50 ?? null, ma200: a.ma200 ?? null, target: a.target ?? null, range_pos: a.range_pos ?? null,
    atr: a.atr ?? null, stance: a.stance ?? null, trigger_reason: a.trigger_reason ?? null, adjustments: a.adjustments ?? null,
  }
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO candidates (run_date, ticker, source, decision, confidence, action_now, label, price, trigger_price, trigger_type,
       walk_away, rationale, key_risks, pm, educational_review, inputs, profile, fast_model, decision_model, llm_seconds)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
     ON CONFLICT (run_date, ticker, source) DO UPDATE SET
       decision = EXCLUDED.decision, confidence = EXCLUDED.confidence, action_now = EXCLUDED.action_now, label = EXCLUDED.label,
       price = EXCLUDED.price, trigger_price = EXCLUDED.trigger_price, trigger_type = EXCLUDED.trigger_type,
       walk_away = EXCLUDED.walk_away, rationale = EXCLUDED.rationale, key_risks = EXCLUDED.key_risks, pm = EXCLUDED.pm,
       educational_review = EXCLUDED.educational_review, inputs = EXCLUDED.inputs, profile = EXCLUDED.profile,
       fast_model = EXCLUDED.fast_model, decision_model = EXCLUDED.decision_model, llm_seconds = EXCLUDED.llm_seconds
     WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.candidate_id = candidates.id)
       AND NOT EXISTS (SELECT 1 FROM positions p WHERE p.candidate_id = candidates.id)
     RETURNING id`,
    [
      a.date, a.ticker, source, a.decision.toUpperCase(), a.confidence ?? null, a.action_now ?? null, a.label, a.price ?? null,
      a.trigger_price ?? null, a.trigger_type ?? null, a.walk_away ?? null,
      typeof pm?.rationale === 'string' ? pm.rationale : null, JSON.stringify(risks), pm ? JSON.stringify(pm) : null,
      review ? JSON.stringify(review) : null, JSON.stringify(inputs), a.profile ?? null, a.fast_model ?? null, a.decision_model ?? null,
      a.seconds === null || a.seconds === undefined ? null : Math.round(a.seconds),
    ],
  )
  return rows[0]?.id ?? null
}

export const TRADEABLE_LABELS = ['Buy now', 'Buy if price reaches trigger', 'Short (bet price falls)', 'Short if price reaches trigger'] as const

/** What a tradeable label asks for: direction, and whether to enter now or wait for the trigger. */
export function pickIntent(label: string): { direction: 'long' | 'short'; kind: 'market' | 'trigger' } | null {
  switch (label) {
    case 'Buy now':
      return { direction: 'long', kind: 'market' }
    case 'Buy if price reaches trigger':
      return { direction: 'long', kind: 'trigger' }
    case 'Short (bet price falls)':
      return { direction: 'short', kind: 'market' }
    case 'Short if price reaches trigger':
      return { direction: 'short', kind: 'trigger' }
    default:
      return null
  }
}
