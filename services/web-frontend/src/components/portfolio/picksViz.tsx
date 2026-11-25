import { useNavigate } from 'react-router-dom'
import type { Pick } from '../../services/portfolio'
import { scale, useWidth, viz } from '../stock/charts'
import { fmtPct } from '../today/format'
import { money } from './ui'

const TRIGGER = '#0A8F80'
const WALK = '#D4501A'

/** The price a pick enters at: the trigger when it waits for one, otherwise the last price. */
export function entryOf(p: Pick): number | null {
  return p.trigger_price ?? p.price ?? null
}

/** Percent from the last price to the entry: 0 for "buy now", negative when the price must fall to the trigger. */
export function toEntryPct(p: Pick): number | null {
  if (!p.price) return null
  if (p.trigger_price === null) return 0
  return ((p.trigger_price - p.price) / p.price) * 100
}

/** Percent the price can fall from the entry before the walk-away price drops the idea (a negative number). */
export function roomPct(p: Pick): number | null {
  const e = entryOf(p)
  if (!e || !p.walk_away) return null
  return ((p.walk_away - e) / e) * 100
}

/** Last price, trigger flag and walk-away tick on one short number line. */
export function PickLadder({ p, width = 200 }: { p: Pick; width?: number }) {
  const pts = [p.price, p.trigger_price, p.walk_away].filter((v): v is number => typeof v === 'number' && v > 0)
  if (!p.price || pts.length < 2) return null
  const lo = Math.min(...pts)
  const hi = Math.max(...pts)
  const pad = (hi - lo) * 0.08 || 1
  const x = scale(lo - pad, hi + pad, 4, width - 4)
  const mid = 15
  const e = entryOf(p)
  const label = `Price ${money(p.price)}${p.trigger_price ? `; trigger ${money(p.trigger_price)} (${fmtPct(toEntryPct(p))})` : '; buys now'}${p.walk_away ? `; walk away below ${money(p.walk_away)}` : ''}`
  return (
    <svg width={width} height={26} viewBox={`0 0 ${width} 26`} role="img" aria-label={label}>
      <title>{label}</title>
      <line x1={4} x2={width - 4} y1={mid} y2={mid} stroke={viz.grid} strokeWidth="4" strokeLinecap="round" />
      {p.walk_away && e ? <line x1={x(p.walk_away)} x2={x(e)} y1={mid} y2={mid} stroke={WALK} strokeOpacity="0.35" strokeWidth="4" /> : null}
      {p.walk_away ? <line x1={x(p.walk_away)} x2={x(p.walk_away)} y1={mid - 7} y2={mid + 7} stroke={WALK} strokeWidth="2.5" strokeLinecap="round" /> : null}
      {p.trigger_price ? (
        <g>
          <line x1={x(p.trigger_price)} x2={x(p.trigger_price)} y1={mid + 6} y2={2} stroke={TRIGGER} strokeWidth="2" />
          <path d={`M${x(p.trigger_price)},2 l8,3 l-8,3 Z`} fill={TRIGGER} />
        </g>
      ) : null}
      <circle cx={x(p.price)} cy={mid} r="5" fill={viz.s1} stroke={viz.surface} strokeWidth="2" />
    </svg>
  )
}

/**
 * Every pick on one axis by how far the price must move to its entry: "buy now" picks sit on the centre line,
 * pullbacks to the left, breakouts to the right. Click a name for the stock.
 */
export function EntryRadar({ picks }: { picks: Pick[] }) {
  const go = useNavigate()
  const [box, W] = useWidth<HTMLDivElement>(300, 1100, 900)
  const pts = picks
    .map((p) => ({ p, d: toEntryPct(p) }))
    .filter((e): e is { p: Pick; d: number } => e.d !== null)
    .sort((a, b) => a.d - b.d)
  if (!pts.length) return null
  // Fits the farthest pick (at least ±4%, at most ±10%); anything beyond sits at the edge, marked "+", exact figure in its tooltip.
  const LIM = Math.min(10, Math.max(4, Math.ceil(Math.max(...pts.map((e) => Math.abs(e.d))) / 2) * 2))
  const x = scale(-LIM, LIM, 28, W - 28)
  const laneEnd: number[] = []
  const placed = pts.map((e) => {
    const cx = x(Math.max(-LIM, Math.min(LIM, e.d)))
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
  const step = LIM <= 6 ? 2 : LIM <= 12 ? 4 : 5
  const ticks = Array.from({ length: Math.floor((2 * LIM) / step) + 1 }, (_, i) => -LIM + i * step).filter((t) => Math.abs(t) <= LIM)
  return (
    <div ref={box} className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${pts.length} picks placed by how far the price must move to their entry`}>
        <text x={x(-LIM)} y={14} fontSize="12" fill={viz.muted}>← must fall to the entry (pullback)</text>
        <text x={x(0)} y={14} fontSize="12" textAnchor="middle" fill={viz.muted}>buy now</text>
        <text x={x(LIM)} y={14} fontSize="12" textAnchor="end" fill={viz.muted}>must rise to the entry (breakout) →</text>
        <line x1={x(0)} x2={x(0)} y1={top - 8} y2={axisY} stroke={viz.s1} strokeOpacity="0.35" strokeDasharray="3 3" />
        <line x1={x(-LIM)} x2={x(LIM)} y1={axisY} y2={axisY} stroke={viz.ink} strokeOpacity="0.4" />
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={axisY - 4} y2={axisY + 4} stroke={viz.ink} strokeOpacity="0.4" />
            <text x={x(t)} y={axisY + 17} fontSize="11" textAnchor="middle" fill={viz.muted}>{t === 0 ? '0' : `${t > 0 ? '+' : ''}${t}%${Math.abs(t) === LIM ? '+' : ''}`}</text>
          </g>
        ))}
        {placed.map(({ p, d, cx, w, lane }) => {
          const cy = top + lane * laneH + 8
          const color = d === 0 ? viz.s1 : d < 0 ? WALK : TRIGGER
          return (
            <g key={p.id} role="link" tabIndex={0} className="cursor-pointer outline-none" onClick={() => go(`/stock/${p.ticker}`)} onKeyDown={(e) => e.key === 'Enter' && go(`/stock/${p.ticker}`)}>
              <title>{`${p.ticker}: ${p.label} at ${money(entryOf(p))}${d ? ` (${fmtPct(d)} from ${money(p.price)})` : ''}${p.walk_away ? `; walk away below ${money(p.walk_away)}` : ''}`}</title>
              <line x1={cx} x2={cx} y1={cy + 9} y2={axisY} stroke={color} strokeOpacity="0.35" strokeDasharray="2 3" />
              <rect x={cx - w / 2} y={cy - 9} width={w} height={18} rx="9" fill="var(--color-surface, #fff)" stroke={color} strokeWidth="1.5" />
              <circle cx={cx - w / 2 + 9} cy={cy} r="3.5" fill={color} />
              <text x={cx + 5} y={cy + 4} fontSize="12" fontWeight="600" textAnchor="middle" fill="var(--color-text-primary, #0f172a)">{p.ticker}</text>
            </g>
          )
        })}
      </svg>
      <p className="text-xs" style={{ color: viz.muted }}>
        Distance from the last price to where each pick buys. Blue: buys at the next open. Red: waits for the price to fall to its trigger. Green: waits
        for it to rise through its trigger. Click a name for the stock.
      </p>
    </div>
  )
}
