import { describe, expect, it } from 'vitest'
import { latestResult, weekRange } from './week'
import type { HistoryRow } from '../../services/nightly'

describe('weekRange', () => {
  it('is the seven days ending on the Friday', () => {
    expect(weekRange('2026-11-20')).toEqual({ from: '2026-11-14', to: '2026-11-20' })
  })
})

describe('latestResult', () => {
  const row = (vs_spy: Record<string, number>) => ({ vs_spy }) as HistoryRow
  it('prefers the longest scored horizon', () => {
    expect(latestResult(row({ '1': 1, '3': 2, '5': 3 }))).toEqual({ h: 5, v: 3 })
    expect(latestResult(row({ '1': -1 }))).toEqual({ h: 1, v: -1 })
    expect(latestResult(row({}))).toBeNull()
  })
})
