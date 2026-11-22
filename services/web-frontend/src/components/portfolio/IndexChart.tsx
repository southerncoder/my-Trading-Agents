import { useState } from 'react'
import { chartGeometry, pathOf } from './helpers'

const W = 640
const H = 220
const PAD = 28
// Portfolio in the theme's accent; SPY, the yardstick, in a quiet gray with a dashed line (identity is never color alone).
const PORT = 'var(--color-primary, #2563eb)'
const SPY = '#8a94a6'
const ink = { color: 'var(--color-text-secondary, #475569)' }

/** The portfolio against SPY, both indexed to 100 on the first day. Hover for the numbers; a table view is one click away. */
export function IndexChart({ series, name }: { series: { date: string; portfolio: number; spy: number | null }[]; name: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const [table, setTable] = useState(false)
  if (series.length === 0) return <p className="text-sm" style={ink}>No history yet. The first point is written by the next nightly run.</p>
  const g = chartGeometry(series, W, H, PAD)
  const last = g.portfolio[g.portfolio.length - 1]
  const lastSpy = g.spy.length ? g.spy[g.spy.length - 1] : undefined
  const ticks = [g.yMin, (g.yMin + g.yMax) / 2, g.yMax].map((v) => Math.round(v))
  const h = hover === null ? null : series[hover]

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - box.left) / box.width) * W
    let best = 0
    g.portfolio.forEach((p, i) => {
      if (Math.abs(p.x - x) < Math.abs(g.portfolio[best].x - x)) best = i
    })
    setHover(best)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={ink}>
        <span className="flex items-center gap-1">
          <svg width="18" height="6" aria-hidden="true"><line x1="0" y1="3" x2="18" y2="3" stroke={PORT} strokeWidth="2" /></svg>
          {name}
        </span>
        <span className="flex items-center gap-1">
          <svg width="18" height="6" aria-hidden="true"><line x1="0" y1="3" x2="18" y2="3" stroke={SPY} strokeWidth="2" strokeDasharray="4 3" /></svg>
          SPY (the S&amp;P 500)
        </span>
        <span>100 = where both started</span>
        <button type="button" className="ml-auto underline" onClick={() => setTable(!table)}>
          {table ? 'Show chart' : 'Show as table'}
        </button>
      </div>
      {table ? (
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-sm">
            <thead><tr style={ink}><th className="text-left">Date</th><th className="text-right">{name}</th><th className="text-right">SPY</th></tr></thead>
            <tbody>
              {series.map((s) => (
                <tr key={s.date}><td>{s.date}</td><td className="text-right">{s.portfolio.toFixed(1)}</td><td className="text-right">{s.spy === null ? '-' : s.spy.toFixed(1)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full touch-none"
            role="img"
            aria-label={`${name} ${last.value.toFixed(1)} against SPY ${lastSpy ? lastSpy.value.toFixed(1) : 'unknown'}, both starting at 100`}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD} x2={W - PAD} y1={g.y(t)} y2={g.y(t)} stroke="currentColor" strokeOpacity="0.08" />
                <text x={4} y={g.y(t) + 4} fontSize="10" fill="currentColor" fillOpacity="0.55">{t}</text>
              </g>
            ))}
            <line x1={PAD} x2={W - PAD} y1={g.y(100)} y2={g.y(100)} stroke="currentColor" strokeOpacity="0.25" strokeDasharray="2 3" />
            {g.spy.length > 1 && <path d={pathOf(g.spy)} fill="none" stroke={SPY} strokeWidth="2" strokeDasharray="5 4" strokeLinejoin="round" />}
            {g.portfolio.length > 1 && <path d={pathOf(g.portfolio)} fill="none" stroke={PORT} strokeWidth="2" strokeLinejoin="round" />}
            {g.portfolio.length === 1 && <circle cx={last.x} cy={last.y} r="4" fill={PORT} />}
            {hover !== null && (
              <g>
                <line x1={g.portfolio[hover].x} x2={g.portfolio[hover].x} y1={PAD / 2} y2={H - PAD / 2} stroke="currentColor" strokeOpacity="0.3" />
                <circle cx={g.portfolio[hover].x} cy={g.portfolio[hover].y} r="4" fill={PORT} stroke="var(--color-surface, #fff)" strokeWidth="2" />
              </g>
            )}
            <text x={W - PAD + 2} y={last.y + 4} fontSize="10" fill="currentColor" fillOpacity="0.8">{last.value.toFixed(1)}</text>
            {lastSpy && <text x={W - PAD + 2} y={lastSpy.y + 4} fontSize="10" fill="currentColor" fillOpacity="0.55">{lastSpy.value.toFixed(1)}</text>}
            <text x={PAD} y={H - 6} fontSize="10" fill="currentColor" fillOpacity="0.55">{series[0].date}</text>
            <text x={W - PAD} y={H - 6} fontSize="10" textAnchor="end" fill="currentColor" fillOpacity="0.55">{series[series.length - 1].date}</text>
          </svg>
          {h && (
            <div className="pointer-events-none absolute left-2 top-2 rounded px-2 py-1 text-xs shadow" style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e2e8f0)' }}>
              <div className="font-medium">{h.date}</div>
              <div>{name}: {h.portfolio.toFixed(1)}</div>
              <div style={ink}>SPY: {h.spy === null ? '-' : h.spy.toFixed(1)}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
