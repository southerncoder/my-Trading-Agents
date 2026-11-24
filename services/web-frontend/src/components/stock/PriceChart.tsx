import { useMemo, useState } from 'react'
import type { HistoryPoint } from '../../services/nightly'
import { decisionColor } from './DecisionCard'
import { fmtPct, fmtPrice } from '../today/format'
import { monthLabel, niceTicks, scale, sma, useWidth, viz } from './charts'

const RANGES = [
  { key: '3M', days: 63 },
  { key: '6M', days: 126 },
  { key: '1Y', days: 252 },
] as const

const H = 320
const PAD = { top: 16, right: 132, bottom: 28, left: 48 }

type Kind = 'BUY' | 'SELL' | 'HOLD'
const kindOf = (d: string): Kind => (d.toUpperCase().includes('BUY') ? 'BUY' : d.toUpperCase().includes('SELL') ? 'SELL' : 'HOLD')

/** A night's call as a shape, so it reads without color: triangle up = buy, down = sell, circle = hold. */
function CallMark({ x, y, kind, r, ring }: { x: number; y: number; kind: Kind; r: number; ring: string }) {
  const color = decisionColor(kind)
  if (kind === 'HOLD') return <circle cx={x} cy={y} r={r} fill={color} stroke={ring} strokeWidth="2" />
  const s = r * 1.25
  const d = kind === 'BUY' ? `M${x},${y - s} L${x + s},${y + s * 0.8} L${x - s},${y + s * 0.8} Z` : `M${x},${y + s} L${x + s},${y - s * 0.8} L${x - s},${y - s * 0.8} Z`
  return <path d={d} fill={color} stroke={ring} strokeWidth="2" strokeLinejoin="round" />
}

function LineKey({ color, dash }: { color: string; dash?: string }) {
  return (
    <svg width="20" height="8" aria-hidden="true">
      <line x1="0" y1="4" x2="20" y2="4" stroke={color} strokeWidth="2" strokeDasharray={dash} strokeLinecap="round" />
    </svg>
  )
}

interface Props {
  prices: { date: string; close: number }[]
  history: HistoryPoint[]
  selected: string
  onSelect: (date: string) => void
}

/**
 * Daily closes with the 50- and 200-day averages, every night's call marked on the line, and the selected night's
 * trigger and walk-away levels. Hover for the numbers; click a call to load that night.
 */
export function PriceChart({ prices, history, selected, onSelect }: Props) {
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('6M')
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  const [box, W] = useWidth<HTMLDivElement>(320, 1100, 900)

  const all = useMemo(() => {
    const closes = prices.map((p) => p.close)
    const m50 = sma(closes, 50)
    const m200 = sma(closes, 200)
    return prices.map((p, i) => ({ ...p, ma50: m50[i], ma200: m200[i] }))
  }, [prices])

  // On a phone the trigger and walk-away values move to the legend so the plot keeps its width.
  const narrow = W < 560
  const P = narrow ? { ...PAD, right: 60, left: 36 } : PAD
  const days = RANGES.find((r) => r.key === range)!.days
  const rows = all.slice(-days)
  const night = history.find((h) => h.date === selected)

  if (rows.length < 2) return null

  const first = rows[0].date
  const nights = history.filter((h) => h.date >= first)
  const levels = [night?.trigger_price, night?.walk_away].filter((v): v is number => typeof v === 'number' && v > 0)
  const vals = rows.flatMap((r) => [r.close, r.ma50, r.ma200]).filter((v): v is number => typeof v === 'number')
  const lo0 = Math.min(...vals, ...levels)
  const hi0 = Math.max(...vals, ...levels)
  const padY = (hi0 - lo0) * 0.06 || 1
  const lo = lo0 - padY
  const hi = hi0 + padY

  const x = scale(0, rows.length - 1, P.left, W - P.right)
  const y = scale(lo, hi, H - P.bottom, P.top)
  const idx = new Map(rows.map((r, i) => [r.date, i]))
  // A night falls on its own date, or on the last trading day before it (weekend runs).
  const indexOf = (date: string) => {
    if (idx.has(date)) return idx.get(date)!
    let best = -1
    rows.forEach((r, i) => {
      if (r.date <= date) best = i
    })
    return best
  }

  const path = (key: 'close' | 'ma50' | 'ma200') => {
    let d = ''
    rows.forEach((r, i) => {
      const v = r[key]
      if (typeof v !== 'number') return
      d += `${d ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`
    })
    return d
  }
  const pricePath = path('close')
  const area = `${pricePath}L${x(rows.length - 1)},${H - P.bottom}L${x(0)},${H - P.bottom}Z`

  const ticks = niceTicks(lo, hi, 4)
  const months: Array<{ i: number; label: string }> = []
  rows.forEach((r, i) => {
    const prev = rows[i - 1]
    if (prev && r.date.slice(5, 7) !== prev.date.slice(5, 7)) months.push({ i, label: monthLabel(r.date, r.date.slice(5, 7) === '01') })
  })
  const step = Math.ceil(months.length / Math.max(2, Math.floor((W - P.left - P.right) / 70)))
  const shownMonths = months.filter((_, k) => k % step === 0)

  const last = rows[rows.length - 1]
  const firstClose = rows[0].close
  const changePct = (last.close / firstClose - 1) * 100

  const endLabels: Array<{ y: number; text: string; color: string; dash?: string }> = []
  endLabels.push({ y: y(last.close), text: fmtPrice(last.close), color: viz.s1 })
  if (!narrow && night?.trigger_price) endLabels.push({ y: y(night.trigger_price), text: `Trigger ${fmtPrice(night.trigger_price)}`, color: decisionColor('BUY'), dash: '6 4' })
  if (!narrow && night?.walk_away) endLabels.push({ y: y(night.walk_away), text: `Walk away ${fmtPrice(night.walk_away)}`, color: decisionColor('SELL'), dash: '6 4' })
  // Keep end labels 14px apart so they never overlap (sorted top to bottom).
  endLabels.sort((a, b) => a.y - b.y)
  const labelY = endLabels.map((l) => l.y)
  for (let i = 1; i < labelY.length; i++) labelY[i] = Math.max(labelY[i], labelY[i - 1] + 14)

  const h = hover === null ? null : rows[hover]
  const hNight = h ? history.find((n) => indexOf(n.date) === hover) : undefined

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    const i = Math.round(((px - P.left) / (W - P.left - P.right)) * (rows.length - 1))
    setHover(Math.max(0, Math.min(rows.length - 1, i)))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm" style={{ color: viz.ink }}>
        <div role="group" aria-label="Time range" className="flex overflow-hidden rounded-md" style={{ border: '1px solid var(--color-border, #cbd5e1)' }}>
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              aria-pressed={range === r.key}
              onClick={() => setRange(r.key)}
              className="px-3 py-1.5 text-sm font-medium"
              style={range === r.key ? { background: 'color-mix(in srgb, var(--color-primary, #2563eb) 18%, transparent)', color: 'var(--color-text-primary)' } : undefined}
            >
              {r.key}
            </button>
          ))}
        </div>
        <span className="flex items-center gap-1.5"><LineKey color={viz.s1} />Price</span>
        <span className="flex items-center gap-1.5"><LineKey color={viz.s2} />50-day average</span>
        <span className="flex items-center gap-1.5"><LineKey color={viz.s3} />200-day average</span>
        <span className="flex items-center gap-1.5" title="Each night the system made a call">
          <svg width="40" height="12" aria-hidden="true">
            <CallMark x={6} y={6} kind="BUY" r={4} ring="transparent" />
            <CallMark x={20} y={6} kind="HOLD" r={4} ring="transparent" />
            <CallMark x={34} y={6} kind="SELL" r={4} ring="transparent" />
          </svg>
          Nightly call (buy / hold / sell)
        </span>
        {narrow && night?.trigger_price && <span className="flex items-center gap-1.5"><LineKey color={decisionColor('BUY')} dash="5 3" />Trigger {fmtPrice(night.trigger_price)}</span>}
        {narrow && night?.walk_away && <span className="flex items-center gap-1.5"><LineKey color={decisionColor('SELL')} dash="5 3" />Walk away {fmtPrice(night.walk_away)}</span>}
        <button type="button" className="ml-auto underline" onClick={() => setTable(!table)}>
          {table ? 'Show chart' : 'Show as table'}
        </button>
      </div>

      {table ? (
        <div className="max-h-80 overflow-auto rounded-lg" style={{ border: '1px solid var(--color-border, #e2e8f0)' }}>
          <table className="w-full text-sm tabular-nums">
            <thead className="sticky top-0" style={{ background: viz.surface, color: viz.ink }}>
              <tr><th className="p-2 text-left font-normal">Date</th><th className="p-2 text-right font-normal">Close</th><th className="p-2 text-right font-normal">50-day</th><th className="p-2 text-right font-normal">200-day</th><th className="p-2 text-left font-normal">Call</th></tr>
            </thead>
            <tbody>
              {[...rows].reverse().map((r) => {
                const n = history.find((q) => q.date === r.date)
                return (
                  <tr key={r.date} style={{ borderTop: '1px solid var(--color-border, #e2e8f0)' }}>
                    <td className="p-2">{r.date}</td>
                    <td className="p-2 text-right">{fmtPrice(r.close)}</td>
                    <td className="p-2 text-right">{fmtPrice(r.ma50)}</td>
                    <td className="p-2 text-right">{fmtPrice(r.ma200)}</td>
                    <td className="p-2">{n?.label ?? ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative" ref={box}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full touch-none select-none"
            role="img"
            aria-label={`Price over ${range}: from ${fmtPrice(firstClose)} to ${fmtPrice(last.close)} (${fmtPct(changePct)}), with ${nights.length} nightly calls marked`}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={P.left} x2={W - P.right} y1={y(t)} y2={y(t)} stroke={viz.grid} strokeWidth="1" />
                <text x={P.left - 8} y={y(t) + 4} fontSize="12" textAnchor="end" fill={viz.muted} className="tabular-nums">
                  {t >= 100 ? t.toFixed(0) : t.toFixed(t % 1 ? 1 : 0)}
                </text>
              </g>
            ))}
            {shownMonths.map((m) => (
              <text key={m.i} x={x(m.i)} y={H - 8} fontSize="12" textAnchor="middle" fill={viz.muted}>{m.label}</text>
            ))}

            <path d={area} fill={viz.s1} fillOpacity="0.1" />
            <path d={path('ma200')} fill="none" stroke={viz.s3} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <path d={path('ma50')} fill="none" stroke={viz.s2} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <path d={pricePath} fill="none" stroke={viz.s1} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

            {night?.trigger_price && (
              <line x1={P.left} x2={W - P.right} y1={y(night.trigger_price)} y2={y(night.trigger_price)} stroke={decisionColor('BUY')} strokeWidth="1.5" strokeDasharray="6 4" />
            )}
            {night?.walk_away && (
              <line x1={P.left} x2={W - P.right} y1={y(night.walk_away)} y2={y(night.walk_away)} stroke={decisionColor('SELL')} strokeWidth="1.5" strokeDasharray="6 4" />
            )}

            {(() => {
              const i = indexOf(selected)
              return i >= 0 ? <line x1={x(i)} x2={x(i)} y1={P.top} y2={H - P.bottom} stroke={viz.ink} strokeOpacity="0.35" strokeWidth="1" /> : null
            })()}

            {nights.map((n) => {
              const i = indexOf(n.date)
              if (i < 0) return null
              const on = n.date === selected
              const cy = y(rows[i].close)
              return (
                <g
                  key={n.date}
                  role="button"
                  tabIndex={0}
                  aria-label={`${n.date}: ${n.label} at ${fmtPrice(n.price)}. Load this night.`}
                  className="cursor-pointer outline-none"
                  onClick={() => onSelect(n.date)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(n.date))}
                  onFocus={() => setHover(i)}
                >
                  <circle cx={x(i)} cy={cy} r="12" fill="transparent" />
                  <CallMark x={x(i)} y={cy} kind={kindOf(n.decision)} r={on ? 7 : 5} ring={viz.surface} />
                </g>
              )
            })}

            {hover !== null && (
              <g pointerEvents="none">
                <line x1={x(hover)} x2={x(hover)} y1={P.top} y2={H - P.bottom} stroke={viz.ink} strokeOpacity="0.5" strokeWidth="1" />
                <circle cx={x(hover)} cy={y(rows[hover].close)} r="4" fill={viz.s1} stroke={viz.surface} strokeWidth="2" />
              </g>
            )}

            {endLabels.map((l, k) => (
              <g key={l.text}>
                {Math.abs(labelY[k] - l.y) > 2 && <line x1={W - P.right + 2} x2={W - P.right + 8} y1={l.y} y2={labelY[k]} stroke={viz.muted} strokeWidth="1" />}
                <text x={W - P.right + 10} y={labelY[k] + 4} fontSize="12" fontWeight={k === 0 ? 600 : 500} fill="var(--color-text-primary, #0f172a)">{l.text}</text>
              </g>
            ))}
          </svg>

          {h && (
            <div
              className="pointer-events-none absolute top-2 z-10 min-w-44 rounded-lg px-3 py-2 text-sm shadow-lg"
              style={{
                background: viz.surface,
                border: '1px solid var(--color-border, #e2e8f0)',
                left: x(hover!) / W > 0.55 ? undefined : `calc(${((x(hover!) / W) * 100).toFixed(1)}% + 12px)`,
                right: x(hover!) / W > 0.55 ? `calc(${(100 - (x(hover!) / W) * 100).toFixed(1)}% + 12px)` : undefined,
              }}
            >
              <div className="text-xs" style={{ color: viz.muted }}>{h.date}</div>
              <div className="flex items-center gap-2"><LineKey color={viz.s1} /><strong className="tabular-nums">{fmtPrice(h.close)}</strong><span style={{ color: viz.muted }}>close</span></div>
              {h.ma50 != null && <div className="flex items-center gap-2"><LineKey color={viz.s2} /><strong className="tabular-nums">{fmtPrice(h.ma50)}</strong><span style={{ color: viz.muted }}>50-day</span></div>}
              {h.ma200 != null && <div className="flex items-center gap-2"><LineKey color={viz.s3} /><strong className="tabular-nums">{fmtPrice(h.ma200)}</strong><span style={{ color: viz.muted }}>200-day</span></div>}
              {hNight && (
                <div className="mt-1 border-t pt-1" style={{ borderColor: 'var(--color-border, #e2e8f0)' }}>
                  <strong>{hNight.label}</strong> <span style={{ color: viz.muted }}>· {Math.round(hNight.confidence * 100)}% sure</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      <p className="text-sm" style={{ color: viz.muted }}>
        {range}: {fmtPrice(firstClose)} → {fmtPrice(last.close)} ({fmtPct(changePct)}). Dashed lines are the {selected} night&apos;s trigger and walk-away
        levels. Daily closes from Yahoo Finance, averages worked out from them.
      </p>
    </div>
  )
}
