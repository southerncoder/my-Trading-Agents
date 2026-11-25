import { useNavigate } from 'react-router-dom'
import type { Order, Position } from '../../services/portfolio'
import { scale, useWidth, viz } from '../stock/charts'
import type { Closes } from '../today/triggerViz'
import { fmtPct } from '../today/format'
import { money } from './ui'

const TARGET = '#0A8F80'
const STOP = '#D4501A'
const COST = '#8a94a6'

/**
 * How far along its exit plan a position is: 0 at the buy price, +1 at the target, -1 at the stop.
 * Works for shorts too (their stop is above the cost). Null when the plan has no stop or target.
 */
export function planProgress(p: Pick<Position, 'direction' | 'avg_cost' | 'mark' | 'stop_price' | 'target_price'>): number | null {
  const { avg_cost: cost, mark, stop_price: stop, target_price: target } = p
  if (!cost || !mark || !stop || !target) return null
  const s = p.direction === 'short' ? -1 : 1
  const move = s * (mark - cost)
  const up = s * (target - cost)
  const down = s * (cost - stop)
  if (up <= 0 || down <= 0) return null
  return move >= 0 ? move / up : move / down
}

/** Percent the price must move from the last close to reach a waiting order's trigger (negative = must fall). */
export function orderDistancePct(o: Pick<Order, 'trigger_price'>, last: number | undefined): number | null {
  if (!o.trigger_price || !last) return null
  return ((o.trigger_price - last) / last) * 100
}

/** Market value per sector as a percent of the portfolio's value, largest first. */
export function sectorShares(positions: Pick<Position, 'sector' | 'market_value'>[], equity: number): { sector: string; pct: number; value: number; count: number }[] {
  const by = new Map<string, { value: number; count: number }>()
  for (const p of positions) {
    const k = p.sector || 'Unknown'
    const e = by.get(k) ?? { value: 0, count: 0 }
    e.value += Math.abs(p.market_value)
    e.count++
    by.set(k, e)
  }
  return [...by.entries()]
    .map(([sector, e]) => ({ sector, value: e.value, count: e.count, pct: equity > 0 ? (e.value / equity) * 100 : 0 }))
    .sort((a, b) => b.value - a.value)
}

/** Recent closes with the buy price (grey), stop (red dashes) and target (green dashes), and the buy day marked. */
export function PositionSpark({ closes, p, width = 150, height = 40, axis = false }: { closes: Closes; p: Position; width?: number; height?: number; axis?: boolean }) {
  if (closes.length < 2) return <span className="inline-block" style={{ width, height }} />
  const vals = closes.map((c) => c.close)
  const levels = [p.avg_cost, p.stop_price, p.target_price].filter((v): v is number => typeof v === 'number' && v > 0)
  const lo = Math.min(...vals, ...levels)
  const hi = Math.max(...vals, ...levels)
  const pad = (hi - lo) * 0.08 || 1
  const left = axis ? 44 : 2
  const base = height - (axis ? 18 : 3)
  const x = scale(0, closes.length - 1, left, width - 6)
  const y = scale(lo - pad, hi + pad, base, 3)
  const d = closes.map((c, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(c.close).toFixed(1)}`).join('')
  const last = closes[closes.length - 1]
  const buyIdx = closes.findIndex((c) => c.date >= p.opened_on)
  const label = `${p.ticker}, ${closes.length} days to ${money(last.close)}; bought at ${money(p.avg_cost)}${p.stop_price ? `, stop ${money(p.stop_price)}` : ''}${p.target_price ? `, target ${money(p.target_price)}` : ''}`
  const hline = (v: number | null, color: string, dash?: string) =>
    v ? <line x1={left} x2={width - 6} y1={y(v)} y2={y(v)} stroke={color} strokeWidth="1.5" strokeDasharray={dash} /> : null
  return (
    <svg width={axis ? undefined : width} height={axis ? undefined : height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className={axis ? 'block h-auto w-full' : undefined}>
      <title>{label}</title>
      {axis &&
        [lo, hi].map((v) => (
          <g key={v}>
            <line x1={left} x2={width - 6} y1={y(v)} y2={y(v)} stroke={viz.grid} />
            <text x={left - 6} y={y(v) + 4} fontSize="11" textAnchor="end" fill={viz.muted}>{v.toFixed(v >= 100 ? 0 : 2)}</text>
          </g>
        ))}
      {axis && (
        <>
          <text x={left} y={height - 4} fontSize="11" fill={viz.muted}>{closes[0].date}</text>
          <text x={width - 6} y={height - 4} fontSize="11" textAnchor="end" fill={viz.muted}>{last.date}</text>
        </>
      )}
      {buyIdx >= 0 && <rect x={x(buyIdx)} y={3} width={Math.max(1, width - 6 - x(buyIdx))} height={base - 3} fill={viz.s1} fillOpacity="0.07" />}
      {hline(p.avg_cost, COST)}
      {hline(p.stop_price, STOP, '4 3')}
      {hline(p.target_price, TARGET, '4 3')}
      <path d={d} fill="none" stroke={viz.s1} strokeWidth={axis ? 2 : 1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(closes.length - 1)} cy={y(last.close)} r="3" fill={viz.s1} stroke={viz.surface} strokeWidth="1.5" />
    </svg>
  )
}

/** One position's plan on a number line: stop (red tick), buy price (grey), target (green flag) and the last close (dot). */
export function PlanBar({ p, width = 170 }: { p: Position; width?: number }) {
  const pts = [p.avg_cost, p.mark, p.stop_price, p.target_price].filter((v): v is number => typeof v === 'number' && v > 0)
  if (!p.stop_price || !p.target_price || pts.length < 3) return null
  const lo = Math.min(...pts)
  const hi = Math.max(...pts)
  const pad = (hi - lo) * 0.06 || 1
  const x = scale(lo - pad, hi + pad, 4, width - 4)
  const mid = 15
  const prog = planProgress(p)
  const label = `Last ${money(p.mark)}; bought ${money(p.avg_cost)}; stop ${money(p.stop_price)}; target ${money(p.target_price)}${prog === null ? '' : `; ${Math.round(Math.abs(prog) * 100)}% of the way to the ${prog >= 0 ? 'target' : 'stop'}`}`
  const gain = (p.mark - p.avg_cost) * (p.direction === 'short' ? -1 : 1) >= 0
  return (
    <svg width={width} height={26} viewBox={`0 0 ${width} 26`} role="img" aria-label={label}>
      <title>{label}</title>
      <line x1={4} x2={width - 4} y1={mid} y2={mid} stroke={viz.grid} strokeWidth="4" strokeLinecap="round" />
      <line x1={x(p.avg_cost)} x2={x(p.mark)} y1={mid} y2={mid} stroke={gain ? TARGET : STOP} strokeWidth="4" strokeOpacity="0.55" strokeLinecap="round" />
      <line x1={x(p.stop_price)} x2={x(p.stop_price)} y1={mid - 7} y2={mid + 7} stroke={STOP} strokeWidth="2.5" strokeLinecap="round" />
      <line x1={x(p.avg_cost)} x2={x(p.avg_cost)} y1={mid - 6} y2={mid + 6} stroke={COST} strokeWidth="2" />
      <line x1={x(p.target_price)} x2={x(p.target_price)} y1={mid + 6} y2={2} stroke={TARGET} strokeWidth="2" />
      <path d={`M${x(p.target_price)},2 l8,3 l-8,3 Z`} fill={TARGET} />
      <circle cx={x(p.mark)} cy={mid} r="5" fill={viz.s1} stroke={viz.surface} strokeWidth="2" />
    </svg>
  )
}

/**
 * Every open position on one axis from its stop (left) through its buy price (centre) to its target (right),
 * so the whole book's progress reads at a glance. Click a name for the stock.
 */
export function PlanMap({ positions }: { positions: Position[] }) {
  const go = useNavigate()
  const [box, W] = useWidth<HTMLDivElement>(300, 1100, 900)
  const pts = positions
    .map((p) => ({ p, v: planProgress(p) }))
    .filter((e): e is { p: Position; v: number } => e.v !== null)
    .sort((a, b) => a.v - b.v)
  if (!pts.length) return null
  const LIM = 1.15
  const x = scale(-LIM, LIM, 28, W - 28)
  const laneEnd: number[] = []
  const placed = pts.map((e) => {
    const cx = x(Math.max(-LIM, Math.min(LIM, e.v)))
    const w = e.p.ticker.length * 8 + 18
    let lane = laneEnd.findIndex((end) => cx - w / 2 > end + 4)
    if (lane < 0) {
      lane = laneEnd.length
      laneEnd.push(0)
    }
    laneEnd[lane] = cx + w / 2
    return { ...e, cx, w, lane }
  })
  const laneH = 26
  const top = 34
  const H = top + laneEnd.length * laneH + 30
  const axisY = H - 24
  const ticks: Array<[number, string]> = [
    [-1, 'stop'],
    [-0.5, '½ way'],
    [0, 'bought'],
    [0.5, '½ way'],
    [1, 'target'],
  ]
  return (
    <div ref={box} className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${pts.length} positions placed between their stop and target`}>
        <rect x={x(-LIM)} y={top - 8} width={x(0) - x(-LIM)} height={axisY - top + 8} rx="8" fill={STOP} fillOpacity="0.06" />
        <rect x={x(0)} y={top - 8} width={x(LIM) - x(0)} height={axisY - top + 8} rx="8" fill={TARGET} fillOpacity="0.06" />
        <text x={x(-LIM)} y={14} fontSize="12" fill={viz.muted}>← losing, toward the stop</text>
        <text x={x(LIM)} y={14} fontSize="12" textAnchor="end" fill={viz.muted}>gaining, toward the target →</text>
        <line x1={x(-LIM)} x2={x(LIM)} y1={axisY} y2={axisY} stroke={viz.ink} strokeOpacity="0.4" />
        {ticks.map(([t, name]) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={t === 0 || Math.abs(t) === 1 ? top - 8 : axisY - 4} y2={axisY + 4} stroke={t === -1 ? STOP : t === 1 ? TARGET : viz.ink} strokeOpacity={t === 0 || Math.abs(t) === 1 ? 0.5 : 0.4} strokeDasharray={t === 0 ? '2 3' : undefined} />
            <text x={x(t)} y={axisY + 17} fontSize="11" textAnchor="middle" fill={viz.muted}>{name}</text>
          </g>
        ))}
        {placed.map(({ p, v, cx, w, lane }) => {
          const cy = top + lane * laneH + 8
          const color = v < 0 ? STOP : TARGET
          return (
            <g key={p.id} role="link" tabIndex={0} className="cursor-pointer outline-none" onClick={() => go(`/stock/${p.ticker}`)} onKeyDown={(e) => e.key === 'Enter' && go(`/stock/${p.ticker}`)}>
              <title>{`${p.ticker}: ${fmtPct(p.returnPct)} since bought at ${money(p.avg_cost)}; ${Math.round(Math.abs(v) * 100)}% of the way to the ${v >= 0 ? `target ${money(p.target_price)}` : `stop ${money(p.stop_price)}`}`}</title>
              <line x1={cx} x2={cx} y1={cy + 9} y2={axisY} stroke={color} strokeOpacity="0.35" strokeDasharray="2 3" />
              <rect x={cx - w / 2} y={cy - 9} width={w} height={18} rx="9" fill="var(--color-surface, #fff)" stroke={color} strokeWidth="1.5" />
              <circle cx={cx - w / 2 + 9} cy={cy} r="3.5" fill={color} />
              <text x={cx + 5} y={cy + 4} fontSize="12" fontWeight="600" textAnchor="middle" fill="var(--color-text-primary, #0f172a)">{p.ticker}</text>
            </g>
          )
        })}
      </svg>
      <p className="text-xs" style={{ color: viz.muted }}>
        Each position&apos;s last close placed between its stop and its profit target, measured from the price it was bought at. Red: below the buy
        price; green: above. A name past the end has gone beyond its stop or target and will be closed at the next check.
      </p>
    </div>
  )
}
