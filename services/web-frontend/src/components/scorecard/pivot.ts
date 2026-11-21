import type { ScoreCell } from '../../services/nightly'

export interface PivotRow {
  key: string
  cells: (ScoreCell | undefined)[]
}

/** One row per group key, one column per horizon (undefined where nothing has matured yet). */
export function pivot(cells: ScoreCell[], horizons: number[]): PivotRow[] {
  const byKey = new Map<string, PivotRow>()
  for (const c of cells) {
    let row = byKey.get(c.key)
    if (!row) {
      row = { key: c.key, cells: horizons.map(() => undefined) }
      byKey.set(c.key, row)
    }
    const i = horizons.indexOf(c.horizon)
    if (i >= 0) row.cells[i] = c
  }
  return [...byKey.values()].sort((a, b) => a.key.localeCompare(b.key))
}
