import { describe, expect, it } from 'vitest'
import { compactMoney, niceTicks, sma } from './charts'

describe('sma', () => {
  it('averages the last n values and is null before that', () => {
    expect(sma([1, 2, 3, 4], 2)).toEqual([null, 1.5, 2.5, 3.5])
  })
})

describe('niceTicks', () => {
  it('returns round ticks inside the range', () => {
    expect(niceTicks(71.3, 88.9, 4)).toEqual([75, 80, 85])
    expect(niceTicks(0, 13.4e9, 3)).toEqual([0, 5e9, 10e9])
  })
})

describe('compactMoney', () => {
  it('compacts billions and millions', () => {
    expect(compactMoney(13_380_000_000)).toBe('$13.4B')
    expect(compactMoney(-812_000_000)).toBe('−$812M')
  })
})
