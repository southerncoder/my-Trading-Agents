import { round, type Bar } from './types.js'

/** A trigger at or above the price when the order is placed waits for a breakout; below it waits for a pullback. */
export function triggerWhen(trigger: number, refPrice: number): 'above' | 'below' {
  return trigger >= refPrice ? 'above' : 'below'
}

/**
 * The fill price of a trigger order on one bar, or null if the bar never reached it. A gap through the
 * trigger fills at the open (the first price actually available), never at the better trigger price.
 */
export function triggerFill(when: 'above' | 'below', trigger: number, bar: Bar): number | null {
  if (when === 'above') return bar.high >= trigger ? round(Math.max(bar.open, trigger)) : null
  return bar.low <= trigger ? round(Math.min(bar.open, trigger)) : null
}

/** Fractional shares for a fixed dollar amount, to 4 decimal places. */
export function quantityFor(amount: number, price: number): number {
  if (!(amount > 0) || !(price > 0)) throw new Error('Amount and price must be positive')
  const q = round(amount / price)
  if (!(q > 0)) throw new Error('Amount is too small for one ten-thousandth of a share')
  return q
}
