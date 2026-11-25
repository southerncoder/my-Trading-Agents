export interface Bar {
  date: string
  open: number
  high: number
  low: number
  close: number
}

export interface ScoreInput {
  date: string
  ticker: string
  profile: string
  label: string
  action_now: string
  confidence: number
  price: number
  trigger_price?: number
  walk_away?: number
}

export type FillStatus = 'filled' | 'not_filled' | 'cancelled'

export interface CallResult {
  now_ret_pct: number
  excess_pct: number
  trigger?: { status: FillStatus; wait_ret_pct: number }
}

export interface TriggerStats {
  n: number
  fill_rate: number
  cancelled_rate: number
  wait_minus_now_pct: number
}

export interface Cell {
  key: string
  horizon: number
  n: number
  avg_ret_pct: number
  avg_excess_pct: number
  up_share: number
  enough: boolean
  trigger?: TriggerStats
}

export interface Scorecard {
  generated_at: string
  benchmark: 'SPY'
  horizons: number[]
  calls: number
  unscored: number
  matured: Record<string, number>
  groups: { label: Cell[]; band: Cell[]; profile: Cell[]; ticker: Cell[]; night: Cell[] }
  /** Every scored call at every horizon it has finished, for per-call charts. */
  detail: CallDetail[]
}

export interface CallDetail {
  date: string
  ticker: string
  label: string
  confidence: number
  horizon: number
  ret_pct: number
  excess_pct: number
  /** For "wait for the trigger" calls: whether it filled, and the return if it had. */
  fill?: FillStatus
  wait_ret_pct?: number
}

export const HORIZONS = [1, 3, 5]
export const MIN_SAMPLE = 10

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)
const r2 = (n: number) => Math.round(n * 100) / 100 + 0
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

/** Yahoo history CSV: `#` comment lines, a header, then Date,Open,High,Low,Close,... rows. */
export function parseBars(csv: string): Bar[] {
  const bars: Bar[] = []
  for (const line of csv.split(/\r?\n/)) {
    if (!/^\d{4}-\d{2}-\d{2},/.test(line)) continue
    const c = line.split(',')
    const [open, high, low, close] = [Number(c[1]), Number(c[2]), Number(c[3]), Number(c[4])]
    if ([open, high, low, close].every(Number.isFinite)) bars.push({ date: c[0], open, high, low, close })
  }
  return bars.sort((a, b) => a.date.localeCompare(b.date))
}

/** Last SPY close on or before the call date (the ledger price is the last close, also on a holiday). */
function spyBaseFor(call: ScoreInput, spy: Bar[]): Bar | undefined {
  let base: Bar | undefined
  for (const b of spy) if (b.date <= call.date && (!base || b.date > base.date) && b.close > 0) base = b
  return base
}

/** False when a call can never be scored (no usable price or SPY base), as opposed to not yet matured. */
export function isScorable(call: ScoreInput, spy: Bar[]): boolean {
  return call.price > 0 && spyBaseFor(call, spy) !== undefined
}

export function scoreCall(call: ScoreInput, bars: Bar[], spy: Bar[], horizon: number): CallResult | null {
  if (!(call.price > 0) || horizon < 1) return null
  const after = bars.filter((b) => b.date > call.date).sort((a, b) => a.date.localeCompare(b.date))
  const spyBase = spyBaseFor(call, spy)
  if (!spyBase || after.length < horizon) return null

  // Measure SPY over the same dates as the stock window, not the same bar position.
  const endBar = after[horizon - 1]
  const spyEnd = spy.find((b) => b.date === endBar.date)
  if (!spyEnd) return null

  const end = endBar.close
  const now = (end / call.price - 1) * 100
  const spyRet = (spyEnd.close / spyBase.close - 1) * 100
  if (!finite(now) || !finite(spyRet)) return null

  const result: CallResult = { now_ret_pct: now, excess_pct: now - spyRet }

  const trig = call.trigger_price
  if (call.action_now === 'wait_for_trigger' && finite(trig) && trig > 0) {
    const breakout = trig > call.price
    let status: FillStatus = 'not_filled'
    let wait = 0
    for (const b of after.slice(0, horizon)) {
      // Touching walk-away cancels the call, even on a bar that also reaches the trigger (conservative).
      if (finite(call.walk_away) && b.low <= call.walk_away) {
        status = 'cancelled'
        break
      }
      if (breakout ? b.high >= trig : b.low <= trig) {
        const fill = breakout ? Math.max(b.open, trig) : Math.min(b.open, trig)
        status = 'filled'
        wait = (end / fill - 1) * 100
        break
      }
    }
    result.trigger = { status, wait_ret_pct: wait }
  }
  return result
}

export function confidenceBand(c: number): string {
  return c >= 0.7 ? '0.70+' : c >= 0.6 ? '0.60-0.69' : '<0.60'
}

type Scored = { call: ScoreInput; horizon: number; res: CallResult }

function cells(scored: Scored[], keyOf: (c: ScoreInput) => string): Cell[] {
  const buckets = new Map<string, Scored[]>()
  for (const s of scored) {
    const k = `${keyOf(s.call)}\u0000${s.horizon}`
    const list = buckets.get(k)
    if (list) list.push(s)
    else buckets.set(k, [s])
  }
  const out: Cell[] = []
  for (const [k, list] of buckets) {
    const [key] = k.split('\u0000')
    const trig = list.filter((s) => s.res.trigger)
    const cell: Cell = {
      key,
      horizon: list[0].horizon,
      n: list.length,
      avg_ret_pct: r2(mean(list.map((s) => s.res.now_ret_pct))),
      avg_excess_pct: r2(mean(list.map((s) => s.res.excess_pct))),
      up_share: r2(list.filter((s) => s.res.excess_pct > 0).length / list.length),
      enough: list.length >= MIN_SAMPLE,
    }
    if (trig.length > 0) {
      cell.trigger = {
        n: trig.length,
        fill_rate: r2(trig.filter((s) => s.res.trigger?.status === 'filled').length / trig.length),
        cancelled_rate: r2(trig.filter((s) => s.res.trigger?.status === 'cancelled').length / trig.length),
        wait_minus_now_pct: r2(mean(trig.map((s) => (s.res.trigger?.wait_ret_pct ?? 0) - s.res.now_ret_pct))),
      }
    }
    out.push(cell)
  }
  return out.sort((a, b) => a.key.localeCompare(b.key) || a.horizon - b.horizon)
}

export function buildScorecard(calls: ScoreInput[], barsByTicker: Map<string, Bar[]>, spy: Bar[], now: Date): Scorecard {
  const scored: Scored[] = []
  const matured: Record<string, number> = {}
  for (const h of HORIZONS) matured[String(h)] = 0
  let unscored = 0

  for (const call of calls) {
    const bars = barsByTicker.get(call.ticker)
    if (!bars || bars.length === 0 || !isScorable(call, spy)) {
      unscored++
      continue
    }
    for (const horizon of HORIZONS) {
      const res = scoreCall(call, bars, spy, horizon)
      if (!res) continue
      matured[String(horizon)]++
      scored.push({ call, horizon, res })
    }
  }

  return {
    generated_at: now.toISOString(),
    benchmark: 'SPY',
    horizons: HORIZONS,
    calls: calls.length,
    unscored,
    matured,
    groups: {
      label: cells(scored, (c) => c.label),
      band: cells(scored, (c) => confidenceBand(c.confidence)),
      profile: cells(scored, (c) => c.profile || 'unknown'),
      ticker: cells(scored, (c) => c.ticker),
      night: cells(scored, (c) => c.date),
    },
    detail: scored
      .map((s) => ({
        date: s.call.date,
        ticker: s.call.ticker,
        label: s.call.label,
        confidence: s.call.confidence,
        horizon: s.horizon,
        ret_pct: r2(s.res.now_ret_pct),
        excess_pct: r2(s.res.excess_pct),
        ...(s.res.trigger ? { fill: s.res.trigger.status, wait_ret_pct: r2(s.res.trigger.wait_ret_pct) } : {}),
      }))
      .sort((a, b) => a.date.localeCompare(b.date) || a.ticker.localeCompare(b.ticker) || a.horizon - b.horizon),
  }
}
