import { useNavigate } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import type { Platform } from '../../services/nightly'
import { useNames } from '../brandStore'
import { scale, viz } from '../stock/charts'
import { fmtPct, muted } from '../today/format'
import type { Closes } from '../today/triggerViz'
import { changeOver } from '../stocks/board'

const UP = 'var(--viz-1, #2a78d6)'
const DOWN = '#e34948'

/** Tint strength for a move: full at `cap` percent, a faint wash near zero. */
export function heatAlpha(pct: number, cap = 3): number {
  return Math.round(Math.min(1, Math.abs(pct) / cap) * 0.42 * 100) / 100 + 0.04
}

/**
 * The watchlist as a grid of tiles tinted by the move over the chosen days: blue up, red down, pale near
 * zero. Text stays in ink; the sign is printed, so the color is never the only cue. Click a tile for the stock.
 */
export function HeatMap({ tickers, sparks, days }: { tickers: string[]; sparks: Record<string, Closes>; days: number }) {
  const go = useNavigate()
  const names = useNames(tickers)
  const cap = days === 1 ? 3 : days <= 5 ? 6 : 15
  const tiles = tickers
    .map((t) => ({ t, ch: changeOver(sparks[t], days) }))
    .sort((a, b) => (b.ch ?? -999) - (a.ch ?? -999))
  return (
    <div className="space-y-2">
      <ul className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-1.5 sm:grid-cols-[repeat(5,minmax(0,1fr))] lg:grid-cols-[repeat(8,minmax(0,1fr))]">
        {tiles.map(({ t, ch }) => (
          <li key={t}>
            <button
              type="button"
              onClick={() => go(`/stock/${t}`)}
              className="clickable block w-full rounded-lg px-2 py-2 text-left"
              style={{
                background: ch === null ? 'transparent' : `color-mix(in srgb, ${ch >= 0 ? UP : DOWN} ${Math.round(heatAlpha(ch, cap) * 100)}%, transparent)`,
                border: '1px solid var(--color-border, #e2e8f0)',
              }}
              title={`${t}${names[t] ? ` (${names[t]})` : ''}: ${ch === null ? 'no prices' : fmtPct(ch)} over ${days} trading day${days === 1 ? '' : 's'}`}
            >
              <div className="text-sm font-bold">{t}</div>
              <div className="truncate text-[11px]" style={muted}>{names[t] ?? ' '}</div>
              <div className="text-sm font-semibold tabular-nums">{ch === null ? '—' : fmtPct(ch)}</div>
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 text-xs" style={muted}>
        <span>−{cap}% or worse</span>
        <span className="inline-block h-2 w-32 rounded-full" style={{ background: `linear-gradient(to right, color-mix(in srgb, ${DOWN} 46%, transparent), transparent, color-mix(in srgb, ${UP} 46%, transparent))`, border: '1px solid var(--color-border, #e2e8f0)' }} />
        <span>+{cap}% or better</span>
      </div>
    </div>
  )
}

/** A portfolio (solid) against SPY (dashed grey), both indexed to 100 on its first day. */
export function MiniVersus({ series, width = 220, height = 54 }: { series: { date: string; portfolio: number; spy: number | null }[]; width?: number; height?: number }) {
  if (series.length < 2) return <div className="text-xs" style={muted}>A line appears after a second night.</div>
  const vals = series.flatMap((s) => [s.portfolio, ...(s.spy === null ? [] : [s.spy])])
  const lo = Math.min(...vals, 100)
  const hi = Math.max(...vals, 100)
  const x = scale(0, series.length - 1, 2, width - 4)
  const y = scale(lo - 0.2, hi + 0.2, height - 3, 3)
  const path = (pick: (s: (typeof series)[number]) => number | null) =>
    series.map((s, i) => ({ i, v: pick(s) })).filter((p): p is { i: number; v: number } => p.v !== null).map((p, k) => `${k ? 'L' : 'M'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join('')
  const last = series[series.length - 1]
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block w-full" style={{ height }} role="img" aria-label={`Portfolio ${last.portfolio.toFixed(1)} against SPY ${last.spy?.toFixed(1) ?? 'unknown'}, both from 100`}>
      <line x1={2} x2={width - 4} y1={y(100)} y2={y(100)} stroke={viz.grid} strokeDasharray="2 3" vectorEffect="non-scaling-stroke" />
      <path d={path((s) => s.spy)} fill="none" stroke="#8a94a6" strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
      <path d={path((s) => s.portfolio)} fill="none" stroke={viz.s1} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/** One chip per data service: up or not, with the answer time. */
export function ServiceChips({ services }: { services: Platform['services'] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {services.map((s) => {
        const Icon = s.ok ? CheckCircle2 : XCircle
        const color = s.ok ? '#0A8F80' : '#b91c1c'
        return (
          <span key={s.name} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm" style={{ border: `1px solid ${color}` }} title={`${s.role}${s.ms !== null ? ` · ${s.ms} ms` : ''}`}>
            <Icon className="h-4 w-4" style={{ color }} aria-hidden="true" />
            {s.name}
            <span className="text-xs" style={muted}>{s.ok ? `${s.ms} ms` : 'down'}</span>
          </span>
        )
      })}
    </div>
  )
}
