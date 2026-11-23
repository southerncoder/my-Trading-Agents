import { z } from 'zod'

const pct = z.number().positive().max(100)
export const rulesSchema = z.object({
  /** Dollars per new position (fixed: confidence is not calibrated yet). */
  position_size: z.number().positive().max(1e9),
  max_position_pct: pct,
  max_sector_pct: pct,
  /** Stop distance used when the call gave no usable walk-away price. */
  stop_pct: pct,
  target_pct: z.number().positive().max(1000),
  max_hold_days: z.number().int().positive().max(1000),
  order_expiry_days: z.number().int().positive().max(250),
  drawdown_alert_pct: pct,
  max_open_positions: z.number().int().positive().max(500),
  /** Baseline portfolio only: shares bought or sold on each call. */
  follow_shares: z.number().positive().max(10000).optional(),
})
export type Rules = z.infer<typeof rulesSchema>

export const DEFAULT_RULES: Rules = {
  position_size: 1000,
  max_position_pct: 15,
  max_sector_pct: 35,
  stop_pct: 8,
  target_pct: 15,
  max_hold_days: 60,
  order_expiry_days: 10,
  drawdown_alert_pct: 10,
  max_open_positions: 20,
}

/** Stored rules merged over the defaults; anything out of range is an error. */
export function parseRules(partial: unknown): Rules {
  return rulesSchema.parse({ ...DEFAULT_RULES, ...(partial && typeof partial === 'object' ? partial : {}) })
}

const pctOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0)

/**
 * Checks a new opening order. Not enough cash, or a new ticker past the open-position cap, refuses it; size and
 * sector limits only warn, because the nightly risk alerts keep reporting them.
 */
export function preTradeCheck(a: {
  cash: number
  equity: number
  amount: number
  ticker: string
  rules: Rules
  openTickers: string[]
  tickerValue: number
  sector?: string | null
  sectorValue: number
}): { ok: boolean; error?: string; warnings: string[] } {
  const warnings: string[] = []
  if (a.amount > a.cash + 1e-6) {
    return { ok: false, error: `Not enough cash: this needs $${a.amount.toFixed(2)} and the portfolio has $${a.cash.toFixed(2)}`, warnings }
  }
  if (!a.openTickers.includes(a.ticker) && a.openTickers.length >= a.rules.max_open_positions) {
    return { ok: false, error: `The portfolio already holds ${a.openTickers.length} positions (limit ${a.rules.max_open_positions})`, warnings }
  }
  const after = pctOf(a.tickerValue + a.amount, a.equity)
  if (after > a.rules.max_position_pct) warnings.push(`${a.ticker} would be ${after}% of the portfolio (limit ${a.rules.max_position_pct}%)`)
  if (a.sector) {
    const s = pctOf(a.sectorValue + a.amount, a.equity)
    if (s > a.rules.max_sector_pct) warnings.push(`${a.sector} would be ${s}% of the portfolio (limit ${a.rules.max_sector_pct}%)`)
  }
  return { ok: true, warnings }
}

export interface AlertDraft {
  kind: string
  ticker: string
  severity: 'action' | 'info'
  message: string
  data: Record<string, unknown>
}

/** Nightly portfolio risk checks on market values (gross: longs and shorts both count as exposure). */
export function riskAlerts(a: {
  rules: Rules
  equity: number
  peakEquity: number
  positions: { ticker: string; value: number; sector: string | null }[]
}): AlertDraft[] {
  const out: AlertDraft[] = []
  const { rules, equity } = a
  for (const p of a.positions) {
    const share = pctOf(p.value, equity)
    if (share > rules.max_position_pct) {
      out.push({ kind: 'risk_position', ticker: p.ticker, severity: 'action', message: `${p.ticker} is ${share}% of the portfolio, over the ${rules.max_position_pct}% limit. Consider trimming.`, data: { sharePct: share } })
    }
  }
  const bySector = new Map<string, number>()
  for (const p of a.positions) if (p.sector) bySector.set(p.sector, (bySector.get(p.sector) ?? 0) + p.value)
  for (const [sector, value] of bySector) {
    const share = pctOf(value, equity)
    if (share > rules.max_sector_pct) {
      out.push({ kind: 'risk_sector', ticker: `sector:${sector}`, severity: 'action', message: `${sector} is ${share}% of the portfolio, over the ${rules.max_sector_pct}% sector limit.`, data: { sector, sharePct: share } })
    }
  }
  if (a.peakEquity > 0) {
    const dd = Math.round(((a.peakEquity - equity) / a.peakEquity) * 1000) / 10
    if (dd >= rules.drawdown_alert_pct) {
      out.push({ kind: 'risk_drawdown', ticker: '', severity: 'action', message: `The portfolio is ${dd}% below its peak value (alert at ${rules.drawdown_alert_pct}%).`, data: { drawdownPct: dd } })
    }
  }
  return out
}
