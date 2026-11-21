import { describe, it, expect } from 'vitest'
import { pivot } from './pivot'
import type { ScoreCell } from '../../services/nightly'

const c = (key: string, horizon: number, n: number): ScoreCell => ({
  key,
  horizon,
  n,
  avg_ret_pct: 0,
  avg_excess_pct: 0,
  up_share: 0.5,
  enough: n >= 10,
})

describe('pivot', () => {
  it('makes one row per key with a cell per horizon, undefined where there is none', () => {
    const rows = pivot([c('B', 1, 3), c('A', 1, 12), c('A', 3, 5)], [1, 3, 5])
    expect(rows.map((r) => r.key)).toEqual(['A', 'B'])
    expect(rows[0].cells.map((x) => x?.n)).toEqual([12, 5, undefined])
    expect(rows[1].cells.map((x) => x?.n)).toEqual([3, undefined, undefined])
  })

  it('returns no rows for no cells', () => {
    expect(pivot([], [1, 3, 5])).toEqual([])
  })
})