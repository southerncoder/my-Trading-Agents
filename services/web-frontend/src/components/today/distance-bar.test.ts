import { describe, it, expect } from 'vitest'
import { barPosition } from './DistanceBar'

describe('barPosition', () => {
  it('0 distance -> 100', () => expect(barPosition(0, 4)).toBe(100))
  it('distance equal to one atr% -> 50', () => expect(barPosition(4, 4)).toBe(50))
  it('sign does not matter', () => expect(barPosition(-4, 4)).toBe(50))
  it('distance beyond 2 atr% clamps to 0', () => expect(barPosition(20, 4)).toBe(0))
  it('atrPct 0 -> 0', () => expect(barPosition(1, 0)).toBe(0))
})