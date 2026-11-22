import { round, type Direction } from './types.js'

export interface PositionState {
  direction: Direction
  quantity: number
  avgCost: number
}

const EPS = 1e-9

/** Adds shares to a position (or starts one) at a weighted average cost. */
export function applyOpen(pos: PositionState | null, fill: { direction: Direction; quantity: number; price: number }): PositionState {
  if (!(fill.quantity > 0) || !(fill.price > 0)) throw new Error('Quantity and price must be positive')
  if (!pos || pos.quantity <= EPS) return { direction: fill.direction, quantity: round(fill.quantity), avgCost: round(fill.price) }
  if (pos.direction !== fill.direction) throw new Error(`Cannot add a ${fill.direction} to a ${pos.direction} position (direction mismatch)`)
  const quantity = pos.quantity + fill.quantity
  return { direction: pos.direction, quantity: round(quantity), avgCost: round((pos.quantity * pos.avgCost + fill.quantity * fill.price) / quantity) }
}

/** Removes shares from a position; returns what is left and the profit or loss realized on the part closed. */
export function applyClose(pos: PositionState, quantity: number, price: number): { position: PositionState; realized: number } {
  if (!(quantity > 0) || !(price > 0)) throw new Error('Quantity and price must be positive')
  if (quantity > pos.quantity + EPS) throw new Error(`Cannot close ${quantity} shares: more than the ${pos.quantity} held`)
  const per = pos.direction === 'long' ? price - pos.avgCost : pos.avgCost - price
  const left = Math.max(0, pos.quantity - quantity)
  return { position: { ...pos, quantity: round(left) }, realized: round(per * Math.min(quantity, pos.quantity)) }
}

/** Change in cash from a trade. Shorting credits the proceeds; covering pays them back. */
export function cashDelta(direction: Direction, intent: 'open' | 'close', quantity: number, price: number): number {
  const gross = round(quantity * price)
  const pays = (direction === 'long' && intent === 'open') || (direction === 'short' && intent === 'close')
  return pays ? -gross : gross
}

/** Market value of the book. A ticker without a mark is valued at cost. */
export function valuation(
  cash: number,
  positions: { ticker: string; direction: Direction; quantity: number; avgCost: number }[],
  marks: Record<string, number | undefined>,
): { longValue: number; shortValue: number; equity: number } {
  let longValue = 0
  let shortValue = 0
  for (const p of positions) {
    const v = p.quantity * (marks[p.ticker] ?? p.avgCost)
    if (p.direction === 'long') longValue += v
    else shortValue += v
  }
  return { longValue: round(longValue), shortValue: round(shortValue), equity: round(cash + longValue - shortValue) }
}
