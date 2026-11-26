import { describe, expect, it } from 'vitest'
import { bands, verdict, wilson } from './calibration'
import type { ScoreDetail } from '../../services/nightly'

const call = (confidence: number, excess_pct: number) => ({ date: '2026-11-20', ticker: 'X', label: 'Buy now', confidence, horizon: 5, ret_pct: excess_pct, excess_pct }) as ScoreDetail

describe('wilson', () => {
  it('gives a sensible 95% range', () => {
    const r = wilson(50, 100)
    expect(r.lo).toBeCloseTo(0.404, 2)
    expect(r.hi).toBeCloseTo(0.596, 2)
    expect(wilson(0, 0)).toEqual({ lo: 0, hi: 1 })
  })
})

describe('bands and verdict', () => {
  const many = (conf: number, beat: number, n: number) => Array.from({ length: n }, (_, i) => call(conf, i < beat ? 1 : -1))
  it('waits for enough calls', () => {
    expect(verdict(bands(many(0.6, 5, 10)), 10).tone).toBe('wait')
  })
  it('says yes only when the high band clearly beats the low one', () => {
    const d = [...many(0.52, 30, 100), ...many(0.72, 75, 100)]
    expect(verdict(bands(d), d.length).tone).toBe('yes')
  })
  it('says unclear when the ranges overlap', () => {
    const d = [...many(0.52, 48, 100), ...many(0.72, 53, 100)]
    expect(verdict(bands(d), d.length).tone).toBe('unclear')
  })
  it('says no when surer calls do clearly worse', () => {
    const d = [...many(0.52, 70, 100), ...many(0.72, 30, 100)]
    expect(verdict(bands(d), d.length).tone).toBe('no')
  })
})
