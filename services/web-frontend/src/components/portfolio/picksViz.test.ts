import { describe, expect, it } from 'vitest'
import type { Pick } from '../../services/portfolio'
import { entryOf, roomPct, toEntryPct } from './picksViz'

const pick = (o: Partial<Pick>) => ({ price: 100, trigger_price: null, walk_away: null, ...o }) as Pick

describe('pick geometry', () => {
  it('buys now at the price, or at the trigger', () => {
    expect(entryOf(pick({}))).toBe(100)
    expect(entryOf(pick({ trigger_price: 95 }))).toBe(95)
    expect(toEntryPct(pick({}))).toBe(0)
    expect(toEntryPct(pick({ trigger_price: 95 }))).toBeCloseTo(-5)
    expect(toEntryPct(pick({ trigger_price: 110 }))).toBeCloseTo(10)
    expect(toEntryPct(pick({ price: null }))).toBeNull()
  })
  it('measures the room from the entry down to the walk-away', () => {
    expect(roomPct(pick({ walk_away: 90 }))).toBeCloseTo(-10)
    expect(roomPct(pick({ trigger_price: 95, walk_away: 90 }))).toBeCloseTo(-5.263, 2)
    expect(roomPct(pick({}))).toBeNull()
  })
})
