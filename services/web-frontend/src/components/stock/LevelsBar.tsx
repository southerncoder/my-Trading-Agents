import type { HistoryPoint } from '../../services/nightly'
import { decisionColor } from './DecisionCard'
import { fmtPrice } from '../today/format'
import { scale, useWidth, viz } from './charts'

const H = 128
const PADX = 16
const AXIS = 72

interface Mark {
  value: number
  label: string
  color: string
  above: boolean
  price?: boolean
}

/**
 * The night's price on one number line with the levels that matter: walk-away, trigger and the two moving
 * averages. The band between walk-away and trigger is where the plan says "wait".
 */
export function LevelsBar({ point }: { point: HistoryPoint }) {
  const [box, W] = useWidth<HTMLDivElement>(300, 720, 520)
  const marks: Mark[] = []
  if (point.walk_away) marks.push({ value: point.walk_away, label: 'Walk away', color: decisionColor('SELL'), above: false })
  if (point.trigger_price) marks.push({ value: point.trigger_price, label: 'Trigger', color: decisionColor('BUY'), above: false })
  if (point.ma50) marks.push({ value: point.ma50, label: '50-day', color: viz.s2, above: true })
  if (point.ma200) marks.push({ value: point.ma200, label: '200-day', color: viz.s3, above: true })
  marks.push({ value: point.price, label: 'Price', color: viz.s1, above: true, price: true })

  const vals = marks.map((m) => m.value)
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const pad = (hi - lo) * 0.08 || point.price * 0.02
  const x = scale(lo - pad, hi + pad, PADX, W - PADX)

  // Spread labels on each side so neighbours never overlap (at least 64px apart).
  const placed = (side: boolean) => {
    const list = marks.filter((m) => m.above === side).sort((a, b) => a.value - b.value)
    const xs = list.map((m) => x(m.value))
    for (let i = 1; i < xs.length; i++) xs[i] = Math.max(xs[i], xs[i - 1] + 64)
    return list.map((m, i) => ({ ...m, lx: Math.min(xs[i], W - 32 - 64 * (list.length - 1 - i)) }))
  }

  const pct = (a: number, b: number) => ((b - a) / a) * 100
  const toTrigger = point.trigger_price ? pct(point.price, point.trigger_price) : null
  const overWalk = point.walk_away ? pct(point.walk_away, point.price) : null
  const zone =
    point.walk_away && point.trigger_price ? [Math.min(point.walk_away, point.trigger_price), Math.max(point.walk_away, point.trigger_price)] : null

  return (
    <div className="space-y-3">
      <div ref={box}>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Price ${fmtPrice(point.price)}${point.trigger_price ? `, trigger ${fmtPrice(point.trigger_price)}` : ''}${point.walk_away ? `, walk away ${fmtPrice(point.walk_away)}` : ''}`}>
          <line x1={PADX} x2={W - PADX} y1={AXIS} y2={AXIS} stroke={viz.grid} strokeWidth="6" strokeLinecap="round" />
          {zone && (
            <rect x={x(zone[0])} y={AXIS - 3} width={Math.max(2, x(zone[1]) - x(zone[0]))} height="6" rx="3" fill="var(--color-primary, #2563eb)" fillOpacity="0.35">
              <title>Between the walk-away and the trigger: the plan is to wait</title>
            </rect>
          )}
          {placed(true).map((m) => (
            <g key={m.label}>
              {!m.price && <line x1={x(m.value)} x2={x(m.value)} y1={AXIS - 14} y2={AXIS + 2} stroke={m.color} strokeWidth="2" />}
              <text x={m.lx} y={AXIS - 34} fontSize="12" fontWeight={m.price ? 700 : 400} textAnchor="middle" fill={m.price ? 'var(--color-text-primary, #0f172a)' : viz.muted}>{m.label}</text>
              <text x={m.lx} y={AXIS - 20} fontSize="12" fontWeight={m.price ? 700 : 400} textAnchor="middle" fill="var(--color-text-primary, #0f172a)" className="tabular-nums">{fmtPrice(m.value)}</text>
            </g>
          ))}
          {placed(false).map((m) => (
            <g key={m.label}>
              <line x1={x(m.value)} x2={x(m.value)} y1={AXIS - 2} y2={AXIS + 14} stroke={m.color} strokeWidth="2" />
              <text x={m.lx} y={AXIS + 30} fontSize="12" textAnchor="middle" fill={viz.muted}>{m.label}</text>
              <text x={m.lx} y={AXIS + 44} fontSize="12" fontWeight="600" textAnchor="middle" fill="var(--color-text-primary, #0f172a)" className="tabular-nums">{fmtPrice(m.value)}</text>
            </g>
          ))}
          <circle cx={x(point.price)} cy={AXIS} r="9" fill={viz.s1} stroke={viz.surface} strokeWidth="3">
            <title>Price {fmtPrice(point.price)}</title>
          </circle>
        </svg>
      </div>
      <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 text-sm">
        {toTrigger !== null && (
          <div className="rounded-lg p-3" style={{ background: 'color-mix(in srgb, var(--color-primary, #2563eb) 8%, transparent)' }}>
            <div style={{ color: viz.muted }}>To the trigger</div>
            <div className="text-2xl font-semibold">{toTrigger > 0 ? '+' : '−'}{Math.abs(toTrigger).toFixed(1)}%</div>
          </div>
        )}
        {overWalk !== null && (
          <div className="rounded-lg p-3" style={{ background: 'color-mix(in srgb, var(--color-primary, #2563eb) 8%, transparent)' }}>
            <div style={{ color: viz.muted }}>Room above walk-away</div>
            <div className="text-2xl font-semibold">{overWalk >= 0 ? '' : '−'}{Math.abs(overWalk).toFixed(1)}%</div>
          </div>
        )}
      </div>
    </div>
  )
}
