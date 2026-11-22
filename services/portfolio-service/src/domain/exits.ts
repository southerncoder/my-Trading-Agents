import { addTradingDays } from './calendar.js'
import type { Rules } from './risk.js'
import { round, type Bar, type Direction } from './types.js'

export interface ExitPlan {
  stop: number
  target: number
  holdUntil: string
}

/**
 * The exit plan set when a position opens. The analyst's walk-away price becomes the stop when it sits on the
 * losing side of the entry; otherwise the portfolio's stop_pct applies. Target and maximum hold come from the rules.
 */
export function exitPlan(a: { direction: Direction; entry: number; walkAway: number | null; rules: Rules; openedOn: string }): ExitPlan {
  const { direction, entry, walkAway, rules } = a
  const holdUntil = addTradingDays(a.openedOn, rules.max_hold_days)
  if (direction === 'long') {
    const usable = walkAway !== null && walkAway > 0 && walkAway < entry
    return { stop: round(usable ? walkAway : entry * (1 - rules.stop_pct / 100)), target: round(entry * (1 + rules.target_pct / 100)), holdUntil }
  }
  const usable = walkAway !== null && walkAway > entry
  return { stop: round(usable ? walkAway : entry * (1 + rules.stop_pct / 100)), target: round(entry * (1 - rules.target_pct / 100)), holdUntil }
}

export type ExitKind = 'stop_hit' | 'target_hit' | 'max_hold'

/**
 * Which exit rule a bar triggers, if any, and the price a mechanical exit would get. When one bar touches both
 * the stop and the target the stop wins: with daily bars the order is unknown, so assume the worse case.
 */
export function checkExit(
  pos: { direction: Direction; stop: number | null; target: number | null; holdUntil: string | null },
  bar: Bar,
): { kind: ExitKind; price: number } | null {
  if (pos.direction === 'long') {
    if (pos.stop !== null && bar.low <= pos.stop) return { kind: 'stop_hit', price: round(Math.min(bar.open, pos.stop)) }
    if (pos.target !== null && bar.high >= pos.target) return { kind: 'target_hit', price: round(Math.max(bar.open, pos.target)) }
  } else {
    if (pos.stop !== null && bar.high >= pos.stop) return { kind: 'stop_hit', price: round(Math.max(bar.open, pos.stop)) }
    if (pos.target !== null && bar.low <= pos.target) return { kind: 'target_hit', price: round(Math.min(bar.open, pos.target)) }
  }
  if (pos.holdUntil !== null && bar.date >= pos.holdUntil) return { kind: 'max_hold', price: round(bar.close) }
  return null
}

/** A one-day move against the position of at least 2 typical daily ranges (ATR), or 7% when ATR is unknown. */
export function isBigMove(direction: Direction, prevClose: number, close: number, atr: number | null): boolean {
  const against = direction === 'long' ? prevClose - close : close - prevClose
  if (against <= 0) return false
  return atr && atr > 0 ? against >= 2 * atr : against / prevClose >= 0.07
}

/** Tonight's call disagrees with holding: SELL against a long, BUY against a short. */
export function callSaysExit(direction: Direction, decision: string): boolean {
  const d = decision.toUpperCase()
  return direction === 'long' ? d === 'SELL' : d === 'BUY'
}
