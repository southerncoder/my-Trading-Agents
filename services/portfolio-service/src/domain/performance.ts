import { round, type Direction } from './types.js'

export interface SnapshotPoint {
  date: string
  equity: number
  spy_close: number | null
}

/** Portfolio and SPY both indexed to 100 at the first snapshot; a missing SPY close carries the last one forward. */
export function indexSeries(snaps: SnapshotPoint[], startingCash: number): { date: string; portfolio: number; spy: number | null }[] {
  let base: number | null = null
  let last: number | null = null
  return snaps.map((s) => {
    if (s.spy_close !== null && s.spy_close > 0) {
      if (base === null) base = s.spy_close
      last = s.spy_close
    }
    return { date: s.date, portfolio: round((s.equity / startingCash) * 100, 2), spy: base && last ? round((last / base) * 100, 2) : null }
  })
}

/** Total return, SPY return over the same span, the difference, and the worst fall from a previous peak (all %). */
export function summarize(snaps: SnapshotPoint[], startingCash: number) {
  const series = indexSeries(snaps, startingCash)
  const lastPoint = series.at(-1)
  const returnPct = lastPoint ? round(lastPoint.portfolio - 100, 2) : 0
  const lastSpy = lastPoint ? lastPoint.spy : null
  const spyReturnPct = lastSpy !== null ? round(lastSpy - 100, 2) : null
  let peak = startingCash
  let maxDd = 0
  for (const s of snaps) {
    peak = Math.max(peak, s.equity)
    maxDd = Math.max(maxDd, (peak - s.equity) / peak)
  }
  return { returnPct, spyReturnPct, excessPct: spyReturnPct === null ? null : round(returnPct - spyReturnPct, 2), maxDrawdownPct: round(maxDd * 100, 2) }
}

/** Percent gained by a position from entry to exit (or to the current mark), signed by direction. */
export function positionReturn(direction: Direction, entry: number, exitOrMark: number): number {
  return direction === 'long' ? (exitOrMark / entry - 1) * 100 : (1 - exitOrMark / entry) * 100
}

function closeOnOrBefore(spy: Record<string, number>, date: string): number | null {
  let best: string | null = null
  for (const d of Object.keys(spy)) if (d <= date && (best === null || d > best)) best = d
  return best === null ? null : spy[best]
}

/** SPY's percent change over a holding window, using the latest close on or before each date. */
export function spyReturn(spy: Record<string, number>, from: string, to: string): number | null {
  const a = closeOnOrBefore(spy, from)
  const b = closeOnOrBefore(spy, to)
  return a && b ? (b / a - 1) * 100 : null
}

export interface SourceItem {
  source: string
  returnPct: number
  spyReturnPct: number | null
  closed: boolean
}

/** Results per pick source: how many, how often they made money, and how they did against SPY over the same days. */
export function sourceStats(items: SourceItem[]) {
  const groups = new Map<string, SourceItem[]>()
  for (const i of items) groups.set(i.source, [...(groups.get(i.source) ?? []), i])
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([source, g]) => {
      const withSpy = g.filter((i) => i.spyReturnPct !== null)
      return {
        source,
        positions: g.length,
        closed: g.filter((i) => i.closed).length,
        winRatePct: round((g.filter((i) => i.returnPct > 0).length / g.length) * 100, 1),
        avgReturnPct: round(g.reduce((s, i) => s + i.returnPct, 0) / g.length, 2),
        avgExcessPct: withSpy.length ? round(withSpy.reduce((s, i) => s + i.returnPct - (i.spyReturnPct as number), 0) / withSpy.length, 2) : null,
      }
    })
}
