import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ScoreCell, ScoreDetail } from '../../services/nightly'
import { niceTicks, scale, useWidth, viz } from '../stock/charts'
import { fmtPct, muted } from '../today/format'
import { clip, useNames } from '../brandStore'

/** Four call families in a fixed color order, so a color always means the same kind of call. */
export const FAMILIES = [
  { key: 'buy_now', name: 'Buy now', color: 'var(--viz-1, #2a78d6)' },
  { key: 'trigger', name: 'Buy at a trigger', color: 'var(--viz-2, #eb6834)' },
  { key: 'wait', name: 'Wait or keep', color: 'var(--viz-3, #1baf7a)' },
  { key: 'exit', name: 'Exit, trim or sell', color: 'var(--viz-4, #eda100)' },
] as const
export type Family = (typeof FAMILIES)[number]['key']

export function familyOf(label: string): Family {
  const l = label.toLowerCase()
  if (l.includes('exit') || l.includes('trim') || l.includes('sell') || l.includes('short')) return 'exit'
  if (l.includes('buy') && (l.includes('trigger') || l.includes('if'))) return 'trigger'
  if (l.includes('buy')) return 'buy_now'
  return 'wait'
}
const colorOf = (f: Family) => FAMILIES.find((x) => x.key === f)!.color

function Legend({ items }: { items: { name: string; color: string; n?: number }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {items.map((i) => (
        <span key={i.name} className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: i.color }} aria-hidden="true" />
          {i.name}
          {i.n !== undefined && <span style={muted}>{i.n}</span>}
        </span>
      ))}
    </div>
  )
}

/**
 * Every finished call as a dot: how sure the model said it was (across) against how the stock did against
 * the benchmark (up = beat it). If confidence meant something, dots would climb to the right.
 */
export function ConfidenceScatter({ detail, benchmark }: { detail: ScoreDetail[]; benchmark: string }) {
  const go = useNavigate()
  const [box, W] = useWidth<HTMLDivElement>(300, 900, 700)
  const [hover, setHover] = useState<ScoreDetail | null>(null)
  if (detail.length < 3) return <p style={muted}>Too few finished calls to plot yet.</p>
  const H = 300
  const L = 48
  const B = 34
  const ys = detail.map((d) => d.excess_pct)
  const yLim = Math.min(25, Math.max(4, Math.ceil(Math.max(...ys.map(Math.abs)))))
  const cs = detail.map((d) => d.confidence)
  const cLo = Math.max(0, Math.floor(Math.min(...cs) * 20) / 20 - 0.05)
  const cHi = Math.min(1, Math.ceil(Math.max(...cs) * 20) / 20 + 0.05)
  const x = scale(cLo, cHi, L, W - 12)
  const y = scale(-yLim, yLim, H - B, 10)
  // A small sideways spread so calls with the same confidence do not hide behind each other.
  const jitter = (d: ScoreDetail, i: number) => ((((d.ticker.charCodeAt(0) * 7 + i * 13) % 11) - 5) * 0.6)
  const counts = FAMILIES.map((f) => ({ ...f, n: detail.filter((d) => familyOf(d.label) === f.key).length })).filter((f) => f.n > 0)
  const xt = niceTicks(cLo, cHi, 5).filter((t) => t >= cLo && t <= cHi)
  const yt = niceTicks(-yLim, yLim, 5).filter((t) => Math.abs(t) <= yLim)
  return (
    <div ref={box} className="space-y-2">
      <Legend items={counts.map((c) => ({ name: c.name, color: c.color, n: c.n }))} />
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${detail.length} calls: confidence against return versus ${benchmark}`} onPointerLeave={() => setHover(null)}>
          {yt.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - 12} y1={y(t)} y2={y(t)} stroke={t === 0 ? viz.ink : viz.grid} strokeOpacity={t === 0 ? 0.5 : 1} />
              <text x={L - 6} y={y(t) + 4} fontSize="11" textAnchor="end" fill={viz.muted}>{t > 0 ? `+${t}%` : `${t}%`}</text>
            </g>
          ))}
          {xt.map((t) => (
            <text key={t} x={x(t)} y={H - B + 16} fontSize="11" textAnchor="middle" fill={viz.muted}>{Math.round(t * 100)}%</text>
          ))}
          <text x={(L + W) / 2} y={H - 4} fontSize="11" textAnchor="middle" fill={viz.muted}>confidence the model gave</text>
          <text x={L + 4} y={22} fontSize="11" fill={viz.muted}>beat {benchmark} ↑</text>
          <text x={L + 4} y={H - B - 6} fontSize="11" fill={viz.muted}>lagged {benchmark} ↓</text>
          {detail.map((d, i) => {
            const v = Math.max(-yLim, Math.min(yLim, d.excess_pct))
            return (
              <circle
                key={`${d.date}-${d.ticker}-${i}`}
                cx={x(d.confidence) + jitter(d, i)}
                cy={y(v)}
                r={hover === d ? 7 : 5}
                fill={colorOf(familyOf(d.label))}
                fillOpacity="0.8"
                stroke={viz.surface}
                strokeWidth="1.5"
                className="cursor-pointer"
                onPointerEnter={() => setHover(d)}
                onClick={() => go(`/stock/${d.ticker}`)}
              >
                <title>{`${d.ticker} ${d.date}: ${d.label}, ${Math.round(d.confidence * 100)}% sure, ${fmtPct(d.excess_pct)} against ${benchmark}`}</title>
              </circle>
            )
          })}
        </svg>
        {hover && (
          <div className="pointer-events-none absolute right-2 top-2 rounded px-2 py-1 text-xs shadow" style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e2e8f0)' }}>
            <div className="font-semibold">{hover.ticker} · {hover.date}</div>
            <div>{hover.label}, {Math.round(hover.confidence * 100)}% sure</div>
            <div>{fmtPct(hover.excess_pct)} against {benchmark} ({fmtPct(hover.ret_pct)} on its own)</div>
          </div>
        )}
      </div>
    </div>
  )
}

/** Average beat of the benchmark for the calls of each night, as columns around zero. */
export function NightColumns({ cells, benchmark }: { cells: ScoreCell[]; benchmark: string }) {
  const [box, W] = useWidth<HTMLDivElement>(300, 1100, 900)
  const rows = [...cells].sort((a, b) => a.key.localeCompare(b.key))
  if (!rows.length) return <p style={muted}>Nothing has finished at this horizon yet.</p>
  const H = 220
  const L = 48
  const B = 40
  const lim = Math.max(1, Math.ceil(Math.max(...rows.map((r) => Math.abs(r.avg_excess_pct)))))
  // Headroom both ways so value labels clear the axis and the date labels.
  const y = scale(-lim * 1.25, lim * 1.15, H - B, 12)
  const slot = (W - L - 8) / rows.length
  const bw = Math.max(6, Math.min(48, slot - 8))
  const ticks = niceTicks(-lim, lim, 4).filter((t) => Math.abs(t) <= lim)
  const every = Math.ceil(rows.length / Math.max(1, Math.floor((W - L) / 64)))
  return (
    <div ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={rows.map((r) => `${r.key}: ${fmtPct(r.avg_excess_pct)} over ${r.n} calls`).join('; ')}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - 8} y1={y(t)} y2={y(t)} stroke={t === 0 ? viz.ink : viz.grid} strokeOpacity={t === 0 ? 0.5 : 1} />
            <text x={L - 6} y={y(t) + 4} fontSize="11" textAnchor="end" fill={viz.muted}>{t > 0 ? `+${t}%` : `${t}%`}</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const cx = L + slot * i + slot / 2
          const top = y(Math.max(0, r.avg_excess_pct))
          const h = Math.max(2, Math.abs(y(r.avg_excess_pct) - y(0)))
          const pos = r.avg_excess_pct >= 0
          return (
            <g key={r.key}>
              <title>{`Calls of ${r.key}: ${fmtPct(r.avg_excess_pct, 2)} against ${benchmark} on average, ${r.n} calls, ${Math.round(r.up_share * 100)}% beat it`}</title>
              <rect x={cx - bw / 2} y={pos ? top : y(0)} width={bw} height={h} rx="4" fill={pos ? viz.s1 : '#e34948'} opacity={r.enough ? 1 : 0.4} />
              <text x={cx} y={pos ? top - 4 : y(0) + h + 12} fontSize="11" textAnchor="middle" fill="var(--color-text-primary, #0f172a)">{fmtPct(r.avg_excess_pct)}</text>
              {i % every === 0 && <text x={cx} y={H - B + 16} fontSize="11" textAnchor="middle" fill={viz.muted}>{r.key.slice(5)}</text>}
              {i % every === 0 && <text x={cx} y={H - B + 30} fontSize="10" textAnchor="middle" fill={viz.muted}>{r.n} calls</text>}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** Average beat of the benchmark at each horizon, one line per call family: does the edge grow or fade with time? */
export function HorizonLines({ cells, horizons, benchmark }: { cells: ScoreCell[]; horizons: number[]; benchmark: string }) {
  const [box, W] = useWidth<HTMLDivElement>(300, 700, 600)
  // Combine the labels of a family, weighting each by its number of calls.
  const series = FAMILIES.map((f) => {
    const pts = horizons.map((h) => {
      const cs = cells.filter((c) => c.horizon === h && familyOf(c.key) === f.key)
      const n = cs.reduce((a, c) => a + c.n, 0)
      return n ? { h, v: cs.reduce((a, c) => a + c.avg_excess_pct * c.n, 0) / n, n } : null
    })
    return { ...f, pts }
  }).filter((s) => s.pts.some(Boolean))
  if (!series.length) return null
  const H = 220
  const L = 48
  const R = 16
  const vals = series.flatMap((s) => s.pts.flatMap((p) => (p ? [p.v] : [])))
  const lim = Math.max(1, Math.ceil(Math.max(...vals.map(Math.abs))))
  const x = scale(0, horizons.length - 1, L + 30, W - R - 40)
  const y = scale(-lim, lim, H - 30, 12)
  const ticks = niceTicks(-lim, lim, 4).filter((t) => Math.abs(t) <= lim)
  return (
    <div ref={box} className="space-y-2">
      <Legend items={series.map((s) => ({ name: s.name, color: s.color }))} />
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={series.map((s) => `${s.name}: ${s.pts.map((p) => (p ? `${p.h}d ${fmtPct(p.v)}` : '')).join(', ')}`).join('; ')}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke={t === 0 ? viz.ink : viz.grid} strokeOpacity={t === 0 ? 0.5 : 1} />
            <text x={L - 6} y={y(t) + 4} fontSize="11" textAnchor="end" fill={viz.muted}>{t > 0 ? `+${t}%` : `${t}%`}</text>
          </g>
        ))}
        {horizons.map((h, i) => (
          <text key={h} x={x(i)} y={H - 10} fontSize="11" textAnchor="middle" fill={viz.muted}>after {h} day{h === 1 ? '' : 's'}</text>
        ))}
        {series.map((s) => {
          const pts = s.pts.map((p, i) => (p ? { x: x(i), y: y(p.v), p } : null)).filter((p): p is NonNullable<typeof p> => p !== null)
          return (
            <g key={s.key}>
              <path d={pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join('')} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" />
              {pts.map((p) => (
                <circle key={p.p.h} cx={p.x} cy={p.y} r="5" fill={s.color} stroke={viz.surface} strokeWidth="2">
                  <title>{`${s.name}, after ${p.p.h} day${p.p.h === 1 ? '' : 's'}: ${fmtPct(p.p.v, 2)} against ${benchmark} (${p.p.n} calls)`}</title>
                </circle>
              ))}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** The best and worst finished calls at the horizon, as two ranked lists. */
export function BestWorst({ detail, benchmark }: { detail: ScoreDetail[]; benchmark: string }) {
  const names = useNames(detail.map((d) => d.ticker))
  const go = useNavigate()
  const sorted = [...detail].sort((a, b) => b.excess_pct - a.excess_pct)
  const best = sorted.slice(0, 6)
  const worst = sorted.slice(-6).reverse()
  const max = Math.max(1, ...sorted.map((d) => Math.abs(d.excess_pct)))
  const list = (title: string, rows: ScoreDetail[], color: string) => (
    <div className="space-y-2">
      <div className="text-sm font-semibold">{title}</div>
      <ol className="space-y-1.5">
        {rows.map((d, i) => (
          <li key={`${d.date}-${d.ticker}-${i}`}>
            <button type="button" onClick={() => go(`/stock/${d.ticker}?date=${d.date}`)} className="clickable flex w-full items-center gap-3 rounded-lg p-2 text-left" style={{ border: '1px solid var(--color-border, #e2e8f0)' }}>
              <span className="w-12 shrink-0 font-bold">{d.ticker}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm">{clip(names[d.ticker], 22) || d.ticker}</span>
                <span className="block truncate text-xs" style={muted}>{d.date} · {d.label} · {Math.round(d.confidence * 100)}% sure</span>
              </span>
              <span className="w-24 shrink-0">
                <span className="block text-right text-sm font-semibold tabular-nums">{fmtPct(d.excess_pct)}</span>
                <span className="mt-0.5 block h-1.5 rounded-full" style={{ width: `${(Math.abs(d.excess_pct) / max) * 100}%`, marginLeft: 'auto', background: color }} />
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  )
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {list(`Best against ${benchmark}`, best, viz.s1)}
      {list(`Worst against ${benchmark}`, worst, '#e34948')}
    </div>
  )
}
