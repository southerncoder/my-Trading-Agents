import { describe, expect, it } from 'vitest'
import { orderDistancePct, planProgress, sectorShares } from './portfolioViz'

describe('planProgress', () => {
  const long = { direction: 'long' as const, avg_cost: 100, stop_price: 90, target_price: 120 }
  it('runs from -1 at the stop through 0 at the cost to +1 at the target', () => {
    expect(planProgress({ ...long, mark: 100 })).toBe(0)
    expect(planProgress({ ...long, mark: 110 })).toBeCloseTo(0.5)
    expect(planProgress({ ...long, mark: 95 })).toBeCloseTo(-0.5)
    expect(planProgress({ ...long, mark: 120 })).toBeCloseTo(1)
  })
  it('flips for shorts', () => {
    expect(planProgress({ direction: 'short', avg_cost: 100, stop_price: 110, target_price: 80, mark: 90 })).toBeCloseTo(0.5)
    expect(planProgress({ direction: 'short', avg_cost: 100, stop_price: 110, target_price: 80, mark: 105 })).toBeCloseTo(-0.5)
  })
  it('is null without a plan or with a plan on the wrong side', () => {
    expect(planProgress({ ...long, stop_price: null, mark: 100 })).toBeNull()
    expect(planProgress({ ...long, target_price: 95, mark: 100 })).toBeNull()
  })
})

describe('orderDistancePct', () => {
  it('is negative when the price must fall', () => {
    expect(orderDistancePct({ trigger_price: 90 }, 100)).toBeCloseTo(-10)
    expect(orderDistancePct({ trigger_price: 110 }, 100)).toBeCloseTo(10)
    expect(orderDistancePct({ trigger_price: null }, 100)).toBeNull()
    expect(orderDistancePct({ trigger_price: 90 }, undefined)).toBeNull()
  })
})

describe('sectorShares', () => {
  it('groups by sector as a percent of value, largest first', () => {
    const s = sectorShares(
      [
        { sector: 'Tech', market_value: 300 },
        { sector: 'Energy', market_value: 100 },
        { sector: 'Tech', market_value: 200 },
        { sector: null, market_value: -50 },
      ],
      1000,
    )
    expect(s.map((x) => [x.sector, x.pct, x.count])).toEqual([
      ['Tech', 50, 2],
      ['Energy', 10, 1],
      ['Unknown', 5, 1],
    ])
  })
})
