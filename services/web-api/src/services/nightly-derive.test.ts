import { describe, it, expect } from 'vitest'
import { deriveRows, summarize, expectedNightDate, type LedgerRow } from './nightly-derive.js'

function row(over: Partial<LedgerRow> = {}): LedgerRow {
  return {
    date: '2026-11-20',
    ticker: 'AAA',
    group: 'core',
    profile: 'ollama-cloud',
    label: 'Buy if price reaches trigger',
    action_now: 'wait_for_trigger',
    decision: 'HOLD',
    confidence: 0.6,
    price: 100,
    trigger_price: 102,
    atr: 4,
    stance: {},
    pm: {},
    ...over,
  }
}

describe('deriveRows', () => {
  it('change_pct is null when ticker absent from previous night', () => {
    const [r] = deriveRows([row()], [row({ ticker: 'BBB' })])
    expect(r.change_pct).toBeNull()
  })

  it('change_pct is null with no previous night at all', () => {
    expect(deriveRows([row()])[0].change_pct).toBeNull()
  })

  it('change_pct is (price/prev.price-1)*100', () => {
    const [r] = deriveRows([row({ price: 90 })], [row({ price: 100 })])
    expect(r.change_pct).toBeCloseTo(-10, 6)
  })

  it('buy-now row without trigger_price has null distance and inside_half_day false', () => {
    const [r] = deriveRows([row({ trigger_price: undefined, label: 'Buy now' })])
    expect(r.distance_to_trigger_pct).toBeNull()
    expect(r.inside_half_day).toBe(false)
  })

  it('inside_half_day true when |distance| <= half of atr percent', () => {
    expect(deriveRows([row({ trigger_price: 101.9 })])[0].inside_half_day).toBe(true)
    expect(deriveRows([row({ trigger_price: 102.1 })])[0].inside_half_day).toBe(false)
  })

  it('distance is signed percent of price', () => {
    expect(deriveRows([row({ trigger_price: 95 })])[0].distance_to_trigger_pct).toBeCloseTo(-5, 6)
  })
})

describe('summarize', () => {
  it('picks biggest absolute mover', () => {
    const rows = deriveRows(
      [row({ ticker: 'NVDA', price: 85.99 }), row({ ticker: 'XYZ', price: 103 })],
      [row({ ticker: 'NVDA', price: 100 }), row({ ticker: 'XYZ', price: 100 })],
    )
    const s = summarize(rows)
    expect(s.biggest_mover?.ticker).toBe('NVDA')
    expect(s.biggest_mover?.change_pct).toBeCloseTo(-14.01, 2)
  })

  it('counts by label and inside-half-day', () => {
    const rows = deriveRows([
      row({ trigger_price: 101 }),
      row({ ticker: 'B', trigger_price: 120 }),
      row({ ticker: 'C', label: 'Buy now', trigger_price: undefined }),
    ])
    const s = summarize(rows)
    expect(s.by_label['Buy if price reaches trigger']).toBe(2)
    expect(s.by_label['Buy now']).toBe(1)
    expect(s.inside_half_day).toBe(1)
  })

  it('biggest_mover is null with no previous night', () => {
    expect(summarize(deriveRows([row()])).biggest_mover).toBeNull()
  })
})

describe('expectedNightDate', () => {
  // Chicago is UTC-6 in November (CST)
  it('Saturday 10:00 -> Friday', () => {
    expect(expectedNightDate(new Date('2026-11-21T16:00:00Z'))).toBe('2026-11-20')
  })
  it('Monday 10:00 -> previous Friday', () => {
    expect(expectedNightDate(new Date('2026-11-23T16:00:00Z'))).toBe('2026-11-20')
  })
  it('Tuesday 19:00 -> Tuesday', () => {
    expect(expectedNightDate(new Date('2026-11-25T01:00:00Z'))).toBe('2026-11-24')
  })
  it('Tuesday 10:00 -> Monday', () => {
    expect(expectedNightDate(new Date('2026-11-24T16:00:00Z'))).toBe('2026-11-23')
  })
})
