import { parseBars, type Bar } from '../scorecard/score.js'
import { lastCloseBefore } from './sparks.js'

/**
 * Replays the ledger's past calls on real daily prices with simple, fixed rules, so "what if I had followed
 * them?" has a number. Every rule is spelled out in the result; nothing is optimised after the fact.
 */

export interface BacktestCall {
  date: string
  ticker: string
  group: string
  label: string
  confidence: number
  price: number
  trigger_price?: number
  walk_away?: number
}

export interface BacktestRules {
  /** Which calls to take: "buy now" ones, "buy at a trigger" ones, or both. */
  calls: 'now' | 'trigger' | 'both'
  /** Only calls from this source group ("all" for every source). */
  source: string
  /** Sell at the close this many trading days after buying. */
  hold: number
  /** Also sell early if the price falls to the call's walk-away price. */
  stop: boolean
  /** Skip calls below this confidence. */
  minConfidence: number
  /** Trading days a trigger call waits for its price before it is dropped. */
  triggerDays: number
  /** Dollars per trade. */
  size: number
}

export const DEFAULT_RULES: BacktestRules = { calls: 'both', source: 'all', hold: 5, stop: true, minConfidence: 0, triggerDays: 5, size: 1000 }

export type Outcome = 'closed' | 'open' | 'cancelled' | 'expired' | 'held' | 'no_prices'

export interface Trade {
  ticker: string
  callDate: string
  label: string
  confidence: number
  outcome: Outcome
  entryDate?: string
  entry?: number
  exitDate?: string
  exit?: number
  exitReason?: 'hold' | 'stop' | 'marked'
  retPct?: number
  spyRetPct?: number
  pnl?: number
}

export interface BacktestResult {
  rules: BacktestRules
  from: string | null
  to: string | null
  trades: Trade[]
  equity: { date: string; strategy: number; spy: number }[]
  stats: {
    calls: number
    taken: number
    closed: number
    open: number
    wins: number
    winRatePct: number | null
    pnl: number
    spyPnl: number
    avgRetPct: number | null
    avgVsSpyPct: number | null
    maxDrawdown: number
    outcomes: Record<Outcome, number>
  }
}

const r2 = (n: number) => Math.round(n * 100) / 100 + 0
const isTrigger = (label: string) => /trigger/i.test(label) && /buy/i.test(label)
const isNow = (label: string) => /^buy now$/i.test(label.trim())

export function runBacktest(callsIn: BacktestCall[], bars: Map<string, Bar[]>, spy: Bar[], rules: BacktestRules): BacktestResult {
  const calls = callsIn
    .filter((c) => (rules.calls === 'both' ? isNow(c.label) || isTrigger(c.label) : rules.calls === 'now' ? isNow(c.label) : isTrigger(c.label)))
    .filter((c) => rules.source === 'all' || c.group === rules.source || (rules.source === 'watchlist' && (c.group === 'core' || c.group === 'brands')))
    .filter((c) => c.confidence >= rules.minConfidence)
    .sort((a, b) => a.date.localeCompare(b.date) || a.ticker.localeCompare(b.ticker))
  const spyOn = new Map(spy.map((b) => [b.date, b]))
  const busyUntil = new Map<string, string>() // ticker -> last date a trade is held (one position per stock)
  const trades: Trade[] = []

  for (const c of calls) {
    const t: Trade = { ticker: c.ticker, callDate: c.date, label: c.label, confidence: c.confidence, outcome: 'no_prices' }
    trades.push(t)
    const after = (bars.get(c.ticker) ?? []).filter((b) => b.date > c.date)
    if (!after.length) continue
    const held = busyUntil.get(c.ticker)
    if (held && held >= after[0].date) {
      t.outcome = 'held'
      continue
    }
    // Entry: the next open for "buy now"; for a trigger, the first day that trades through it (walk-away first cancels).
    let entryIdx = -1
    let entry = 0
    if (isNow(c.label)) {
      entryIdx = 0
      entry = after[0].open
    } else {
      const trig = c.trigger_price
      if (!trig) continue
      const breakout = trig > c.price
      t.outcome = 'expired'
      for (let i = 0; i < Math.min(rules.triggerDays, after.length); i++) {
        const b = after[i]
        // Touching the walk-away cancels the call, even on a day that also reaches the trigger (conservative, as the scorecard does).
        if (c.walk_away && b.low <= c.walk_away) {
          t.outcome = 'cancelled'
          break
        }
        if (breakout ? b.high >= trig : b.low <= trig) {
          entryIdx = i
          entry = breakout ? Math.max(b.open, trig) : Math.min(b.open, trig)
          break
        }
      }
      if (entryIdx < 0) continue
    }
    t.entryDate = after[entryIdx].date
    t.entry = r2(entry)
    // Exit: the walk-away (if on) on any later day, else the close `hold` trading days after the entry day.
    let exitIdx = -1
    let exit = 0
    for (let i = entryIdx + 1; i < after.length; i++) {
      const b = after[i]
      if (rules.stop && c.walk_away && b.low <= c.walk_away) {
        exitIdx = i
        exit = Math.min(b.open, c.walk_away)
        t.exitReason = 'stop'
        break
      }
      if (i - entryIdx >= rules.hold) {
        exitIdx = i
        exit = b.close
        t.exitReason = 'hold'
        break
      }
    }
    if (exitIdx < 0) {
      exitIdx = after.length - 1
      exit = after[exitIdx].close
      t.exitReason = 'marked'
      t.outcome = 'open'
    } else t.outcome = 'closed'
    t.exitDate = after[exitIdx].date
    t.exit = r2(exit)
    t.retPct = r2((exit / entry - 1) * 100)
    t.pnl = r2(rules.size * (exit / entry - 1))
    const s0 = spyOn.get(t.entryDate)
    const s1 = spyOn.get(t.exitDate)
    if (s0 && s1) t.spyRetPct = r2(((t.exitReason === 'marked' || t.exitReason === 'hold' ? s1.close : s1.open) / s0.open - 1) * 100)
    busyUntil.set(c.ticker, t.exitDate)
  }

  // Daily mark-to-market of every taken trade and of the same dollars in SPY over the same days.
  const taken = trades.filter((x) => x.entryDate && x.exitDate)
  const from = callsIn.length ? callsIn.map((c) => c.date).sort()[0] : null
  const dates = spy.map((b) => b.date).filter((d) => !from || d > from)
  const closeOn = (ticker: string, d: string) => {
    const bs = bars.get(ticker) ?? []
    let v: number | undefined
    for (const b of bs) if (b.date <= d) v = b.close
    return v
  }
  const spyClose = (d: string) => spyOn.get(d)?.close
  const equity = dates.map((d) => {
    let strat = 0
    let bench = 0
    for (const x of taken) {
      if (d < (x.entryDate as string)) continue
      const s0 = spyOn.get(x.entryDate as string)?.open
      if (d >= (x.exitDate as string)) {
        strat += x.pnl ?? 0
        if (s0 && x.spyRetPct !== undefined) bench += rules.size * (x.spyRetPct / 100)
      } else {
        const c = closeOn(x.ticker, d)
        if (c) strat += rules.size * (c / (x.entry as number) - 1)
        const sc = spyClose(d)
        if (s0 && sc) bench += rules.size * (sc / s0 - 1)
      }
    }
    return { date: d, strategy: r2(strat), spy: r2(bench) }
  })
  let peak = 0
  let dd = 0
  for (const e of equity) {
    peak = Math.max(peak, e.strategy)
    dd = Math.min(dd, e.strategy - peak)
  }

  const outcomes = { closed: 0, open: 0, cancelled: 0, expired: 0, held: 0, no_prices: 0 } as Record<Outcome, number>
  for (const x of trades) outcomes[x.outcome]++
  const rets = taken.map((x) => x.retPct as number)
  const vs = taken.filter((x) => x.spyRetPct !== undefined).map((x) => (x.retPct as number) - (x.spyRetPct as number))
  const wins = taken.filter((x) => (x.pnl ?? 0) > 0).length
  return {
    rules,
    from,
    to: dates[dates.length - 1] ?? null,
    trades,
    equity,
    stats: {
      calls: calls.length,
      taken: taken.length,
      closed: outcomes.closed,
      open: outcomes.open,
      wins,
      winRatePct: taken.length ? r2((wins / taken.length) * 100) : null,
      pnl: r2(taken.reduce((a, x) => a + (x.pnl ?? 0), 0)),
      spyPnl: equity.length ? equity[equity.length - 1].spy : 0,
      avgRetPct: rets.length ? r2(rets.reduce((a, b) => a + b, 0) / rets.length) : null,
      avgVsSpyPct: vs.length ? r2(vs.reduce((a, b) => a + b, 0) / vs.length) : null,
      maxDrawdown: r2(dd),
      outcomes,
    },
  }
}

/** Daily bars per ticker for the backtest, cached until the next US close. */
const barCache = new Map<string, { at: number; from: string; bars: Bar[] }>()

export async function loadBars(fetchText: (url: string) => Promise<string>, yahooUrl: string, tickers: string[], from: string, now = Date.now()): Promise<Map<string, Bar[]>> {
  const out = new Map<string, Bar[]>()
  const end = new Date(now + 86_400_000).toISOString().slice(0, 10)
  const todo = tickers.filter((t) => {
    const hit = barCache.get(t)
    if (hit && hit.from <= from && hit.at >= lastCloseBefore(now) && now - hit.at < 6 * 3600_000) {
      out.set(t, hit.bars)
      return false
    }
    return true
  })
  for (let i = 0; i < todo.length; i += 6) {
    await Promise.all(
      todo.slice(i, i + 6).map(async (t) => {
        try {
          const bars = parseBars(await fetchText(`${yahooUrl}/api/historical/${encodeURIComponent(t)}?startDate=${from}&endDate=${end}`))
          barCache.set(t, { at: now, from, bars })
          out.set(t, bars)
        } catch {
          out.set(t, [])
        }
      }),
    )
  }
  return out
}
