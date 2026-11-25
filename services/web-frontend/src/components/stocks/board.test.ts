import { describe, expect, it } from 'vitest'
import { changeOver, rangePosition } from './board'

const c = (...v: number[]) => v.map((close, i) => ({ date: `2026-11-${String(i + 1).padStart(2, '0')}`, close }))

describe('stock board math', () => {
  it('changes over the last n days, or the whole history when shorter', () => {
    expect(changeOver(c(100, 110, 121), 1)).toBeCloseTo(10)
    expect(changeOver(c(100, 110, 121), 30)).toBeCloseTo(21)
    expect(changeOver(c(100), 30)).toBeNull()
    expect(changeOver(undefined, 30)).toBeNull()
  })
  it('places the last close in the range', () => {
    expect(rangePosition(c(10, 20, 15))).toBe(50)
    expect(rangePosition(c(10, 20, 20))).toBe(100)
    expect(rangePosition(c(5, 5))).toBe(50)
  })
})
