import { useState } from 'react'
import type { HistoryPoint } from '../../services/nightly'
import { decisionColor } from './DecisionCard'
import { fmtPrice } from '../today/format'
import { scale, useWidth, viz } from './charts'

const H = 180
const PAD = { top: 22, bottom: 34, left: 36, right: 8 }

const letter = (d: string) => (d.toUpperCase().includes('BUY') ? 'B' : d.toUpperCase().includes('SELL') ? 'S' : 'H')

/** One column per night: height is how sure the system was, color and letter are the call. Click to load a night. */
export function CallTimeline({ history, selected, onSelect }: { history: HistoryPoint[]; selected: string; onSelect: (d: string) => void }) {
  const [box, W] = useWidth<HTMLDivElement>(280, 720, 520)
  const [hover, setHover] = useState<string | null>(null)
  const rows = history.slice(-30)
  const band = (W - PAD.left - PAD.right) / Math.max(rows.length, 1)
  const bw = Math.max(6, Math.min(24, band - 4))
  const y = scale(0, 1, H - PAD.bottom, PAD.top)
  const h = rows.find((r) => r.date === hover)

  return (
    <div className="relative space-y-2" ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Confidence of each nightly call over ${rows.length} nights`}>
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke={viz.grid} />
            <text x={PAD.left - 6} y={y(t) + 4} fontSize="12" textAnchor="end" fill={viz.muted}>{t * 100}%</text>
          </g>
        ))}
        {rows.map((r, i) => {
          const cx = PAD.left + band * i + band / 2
          const top = y(r.confidence)
          const base = y(0)
          const on = r.date === selected
          const hgt = Math.max(4, base - top)
          const rad = Math.min(4, hgt / 2)
          // Rounded data end, square at the baseline.
          const d = `M${cx - bw / 2},${base} V${base - hgt + rad} Q${cx - bw / 2},${base - hgt} ${cx - bw / 2 + rad},${base - hgt} H${cx + bw / 2 - rad} Q${cx + bw / 2},${base - hgt} ${cx + bw / 2},${base - hgt + rad} V${base} Z`
          return (
            <g
              key={r.date}
              role="button"
              tabIndex={0}
              aria-label={`${r.date}: ${r.label}, ${Math.round(r.confidence * 100)}% sure. Load this night.`}
              className="cursor-pointer outline-none"
              onClick={() => onSelect(r.date)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(r.date))}
              onPointerEnter={() => setHover(r.date)}
              onPointerLeave={() => setHover(null)}
              onFocus={() => setHover(r.date)}
              onBlur={() => setHover(null)}
            >
              <rect x={cx - band / 2} y={PAD.top} width={band} height={base - PAD.top + 24} fill="transparent" />
              <path d={d} fill={decisionColor(r.decision.toUpperCase())} fillOpacity={on || hover === r.date ? 1 : 0.7} />
              {bw >= 14 && hgt >= 18 && (
                <text x={cx} y={base - 6} fontSize="11" fontWeight="700" textAnchor="middle" fill="#fff">{letter(r.decision)}</text>
              )}
              {on && <text x={cx} y={top - 6} fontSize="12" fontWeight="600" textAnchor="middle" fill="var(--color-text-primary, #0f172a)">{Math.round(r.confidence * 100)}%</text>}
              {on && <line x1={cx - bw / 2} x2={cx + bw / 2} y1={base + 6} y2={base + 6} stroke="var(--color-text-primary, #0f172a)" strokeWidth="2" strokeLinecap="round" />}
            </g>
          )
        })}
        {rows.length > 0 && (
          <>
            <text x={PAD.left} y={H - 8} fontSize="12" fill={viz.muted}>{rows[0].date.slice(5)}</text>
            <text x={W - PAD.right} y={H - 8} fontSize="12" textAnchor="end" fill={viz.muted}>{rows[rows.length - 1].date.slice(5)}</text>
          </>
        )}
      </svg>
      {h && (
        <div className="pointer-events-none absolute right-2 top-0 rounded-lg px-3 py-2 text-sm shadow-lg" style={{ background: viz.surface, border: '1px solid var(--color-border, #e2e8f0)' }}>
          <div className="text-xs" style={{ color: viz.muted }}>{h.date}</div>
          <div><strong>{Math.round(h.confidence * 100)}%</strong> <span style={{ color: viz.muted }}>sure</span></div>
          <div>{h.label} <span style={{ color: viz.muted }}>at {fmtPrice(h.price)}</span></div>
        </div>
      )}
      <div className="flex flex-wrap gap-x-4 text-sm" style={{ color: viz.ink }}>
        {(['BUY', 'HOLD', 'SELL'] as const).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: decisionColor(k) }} aria-hidden="true" />
            {k[0]} = {k.toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  )
}
