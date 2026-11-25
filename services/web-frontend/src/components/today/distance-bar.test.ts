import { describe, it, expect } from 'vitest'
import { barPosition } from './DistanceBar'
import { typicalDays } from './triggerViz'

describe('barPosition', () => {
  it('0 distance -> 100', () => expect(barPosition(0, 4)).toBe(100))
  it('distance equal to one atr% -> 50', () => expect(barPosition(4, 4)).toBe(50))
  it('sign does not matter', () => expect(barPosition(-4, 4)).toBe(50))
  it('distance beyond 2 atr% clamps to 0', () => expect(barPosition(20, 4)).toBe(0))
  it('atrPct 0 -> 0', () => expect(barPosition(1, 0)).toBe(0))
})

describe('typicalDays', () => {
  it('divides the distance by the daily move', () => {
    expect(typicalDays({ distance_to_trigger_pct: -1.3, atr: 1.83, price: 95.88 })).toBeCloseTo(-0.68, 2)
    expect(typicalDays({ distance_to_trigger_pct: null, atr: 1, price: 10 })).toBeNull()
    expect(typicalDays({ distance_to_trigger_pct: 2, atr: null, price: 10 })).toBeNull()
  })
})
