import { useState } from 'react'
import { Link } from 'react-router-dom'
import { scale, useWidth, viz } from '../stock/charts'
import { clip, useNames } from '../brandStore'

/**
 * Shared page and chart pieces so every page reads the same way: a big header, stat tiles, horizontal bars
 * (diverging around zero when values can be negative), a segmented whole and a sparkline.
 * Colors follow the dataviz palette in index.css (--viz-*); text never wears a series color.
 */

export const surface = {
  background: 'var(--color-surface, #fff)',
  border: '1px solid var(--color-border, #e2e8f0)',
  color: 'var(--color-text-primary, inherit)',
}
export const muted = { color: 'var(--color-text-muted, #64748b)' }

export const POS = 'var(--viz-1, #2a78d6)'
export const NEG = '#e34948'

export function PageHeader({ icon: Icon, title, sub, children }: { icon?: React.ElementType; title: string; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="flex items-center gap-3">
          {Icon && <Icon className="h-9 w-9" style={{ color: 'var(--color-primary, #2563eb)' }} aria-hidden="true" />}
          {title}
        </h1>
        {children}
      </div>
      {sub && <p className="max-w-3xl text-lg" style={muted}>{sub}</p>}
    </header>
  )
}

export function SectionTitle({ id, icon: Icon, title, sub }: { id?: string; icon?: React.ElementType; title: string; sub?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h2 id={id} className="flex items-center gap-2">
        {Icon && <Icon className="h-6 w-6" style={{ color: 'var(--color-primary, #2563eb)' }} aria-hidden="true" />}
        {title}
      </h2>
      {sub && <p className="text-base" style={muted}>{sub}</p>}
    </div>
  )
}

export function Card({ children, className = '', ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`rounded-2xl p-5 md:p-6 ${className}`} style={surface} {...rest}>
      {children}
    </div>
  )
}

export function StatTile({ label, value, hint, icon: Icon, to, accent }: { label: string; value: React.ReactNode; hint?: React.ReactNode; icon?: React.ElementType; to?: string; accent?: string }) {
  const body = (
    <>
      <div className="flex items-center gap-2 text-sm" style={muted}>
        {Icon && <Icon className="h-4 w-4" style={{ color: accent ?? 'var(--color-primary, #2563eb)' }} aria-hidden="true" />}
        {label}
      </div>
      <div className="mt-1 text-3xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-sm" style={muted}>{hint}</div>}
    </>
  )
  return to ? (
    <Link to={to} className="clickable block min-w-0 rounded-2xl p-4" style={surface}>{body}</Link>
  ) : (
    <div className="min-w-0 rounded-2xl p-4" style={surface}>{body}</div>
  )
}

export interface BarRow {
  key: string
  label: React.ReactNode
  value: number
  /** Text after the value, e.g. "(12 calls)". */
  note?: string
  /** Greys the bar out (e.g. too few data points). */
  faint?: boolean
  href?: string
  color?: string
  /** A stock ticker: its company name is shown under the label. */
  ticker?: string
}

/**
 * Horizontal bars, one per row. When any value is negative the bars diverge from a zero line (blue right,
 * red left, sign also printed), so direction never relies on color alone.
 */
export function HBars({ rows, format, max: fixedMax, labelWidth = 140, onRow }: { rows: BarRow[]; format: (v: number) => string; max?: number; labelWidth?: number; onRow?: (key: string) => void }) {
  const [box, W] = useWidth<HTMLDivElement>(280, 900, 600)
  const names = useNames(rows.flatMap((r) => (r.ticker ? [r.ticker] : [])))
  if (!rows.length) return null
  const narrow = W < 560
  const hasNote = rows.some((r) => r.note)
  const labelW = Math.min(labelWidth, W * 0.3)
  // Notes get their own column on wide screens and a second line under the label on narrow ones.
  const noteW = hasNote && !narrow ? Math.min(230, W * 0.3) : 0
  const valuePad = 62
  const negMax = Math.max(0, ...rows.map((r) => -r.value))
  const posMax = Math.max(0, ...rows.map((r) => r.value), fixedMax ?? 0)
  const a = labelW + (negMax > 0 ? valuePad : 8)
  const b = W - noteW - (posMax > 0 ? valuePad : 8)
  const total = negMax + posMax || 1
  const zero = a + ((b - a) * negMax) / total
  const px = (b - a) / total
  const hasName = rows.some((r) => r.ticker && names[r.ticker])
  const sub = (r: BarRow) => [r.ticker ? names[r.ticker] : undefined, narrow ? r.note : undefined].filter(Boolean).join(' · ')
  const rowH = (narrow && hasNote) || hasName ? 46 : 34
  const H = rows.length * rowH + 6
  const name = (r: BarRow) => (typeof r.label === 'string' ? r.label : r.key)
  return (
    <div ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={rows.map((r) => `${name(r)}: ${format(r.value)}`).join('; ')}>
        {negMax > 0 && <line x1={zero} x2={zero} y1={0} y2={H} stroke={viz.ink} strokeOpacity="0.4" />}
        {rows.map((r, i) => {
          const y = i * rowH + 6
          const w = Math.max(2, Math.abs(r.value) * px)
          const left = r.value < 0 ? zero - w : zero
          const color = r.color ?? (r.value < 0 ? NEG : POS)
          return (
            <g
              key={r.key}
              className={onRow ? 'cursor-pointer' : undefined}
              onClick={() => onRow?.(r.key)}
              role={onRow ? 'link' : undefined}
              tabIndex={onRow ? 0 : undefined}
              onKeyDown={(e) => onRow && e.key === 'Enter' && onRow(r.key)}
            >
              <title>{`${name(r)}${r.ticker && names[r.ticker] ? ` (${names[r.ticker]})` : ''}: ${format(r.value)}${r.note ? ` (${r.note})` : ''}`}</title>
              <rect x={0} y={y} width={W} height={rowH - 4} fill="transparent" />
              <text x={0} y={y + 17} fontSize="13" fontWeight={onRow ? 600 : 400} fill="var(--color-text-primary, #0f172a)" textDecoration={onRow ? 'underline' : undefined}>{name(r)}</text>
              {sub(r) && <text x={0} y={y + 34} fontSize="11" fill={viz.muted}>{clip(sub(r), Math.max(12, Math.floor((narrow ? W * 0.9 : labelW) / 6.2)))}</text>}
              <rect x={left} y={y + 5} width={w} height={18} rx="4" fill={color} opacity={r.faint ? 0.35 : 1} />
              <text x={r.value < 0 ? left - 6 : left + w + 6} y={y + 18} fontSize="13" fontWeight="600" textAnchor={r.value < 0 ? 'end' : 'start'} fill="var(--color-text-primary, #0f172a)" opacity={r.faint ? 0.6 : 1}>
                {format(r.value)}
              </text>
              {!narrow && r.note && <text x={W} y={y + 18} fontSize="12" textAnchor="end" fill={viz.muted}>{r.note}</text>}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export interface Part {
  label: string
  value: number
  color: string
  href?: string
}

/** One whole split into parts (28px tall), names in the legend, counts inside each block when they fit. */
export function SegmentBar({ parts, unit = '' }: { parts: Part[]; unit?: string }) {
  const total = parts.reduce((a, p) => a + p.value, 0)
  if (!total) return <p className="text-sm" style={muted}>Nothing to show yet.</p>
  const shown = parts.filter((p) => p.value > 0)
  return (
    <div className="space-y-2">
      <div className="flex h-7 w-full gap-[2px] overflow-hidden rounded-md" role="img" aria-label={shown.map((p) => `${p.label} ${p.value}${unit}`).join(', ')}>
        {shown.map((p) => (
          <div
            key={p.label}
            className="flex items-center overflow-hidden px-2 text-xs font-semibold text-white first:rounded-l-md last:rounded-r-md"
            style={{ width: `${(p.value / total) * 100}%`, background: p.color }}
            title={`${p.label}: ${p.value}${unit} (${Math.round((p.value / total) * 100)}%)`}
          >
            {(p.value / total) * 100 >= 8 ? p.value : ''}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {shown.map((p) => (
          <span key={p.label} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: p.color }} aria-hidden="true" />
            {p.href ? <Link to={p.href} className="underline">{p.label}</Link> : p.label}
            <span style={muted}>{p.value}{unit}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/** A small trend line with its last value marked. */
export function Sparkline({ values, width = 120, height = 32, color = POS, label }: { values: number[]; width?: number; height?: number; color?: string; label?: string }) {
  if (values.length < 2) return null
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const x = scale(0, values.length - 1, 3, width - 5)
  const y = scale(lo, hi === lo ? lo + 1 : hi, height - 4, 4)
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label ?? `trend from ${values[0]} to ${values[values.length - 1]}`}>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(values.length - 1)} cy={y(values[values.length - 1])} r="3" fill={color} stroke={viz.surface} strokeWidth="1.5" />
    </svg>
  )
}

/** Tabs as a compact button group (e.g. horizons). */
export function Segmented<T extends string | number>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="group" aria-label={label} className="inline-flex overflow-hidden rounded-lg" style={{ border: '1px solid var(--color-border, #cbd5e1)' }}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className="px-3 py-1.5 text-sm font-medium"
          style={o.value === value ? { background: 'color-mix(in srgb, var(--color-primary, #2563eb) 18%, transparent)' } : undefined}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Toggle between a chart and its table. */
export function useTableToggle() {
  const [table, setTable] = useState(false)
  const toggle = (
    <button type="button" className="text-sm underline" onClick={() => setTable((t) => !t)}>
      {table ? 'Show chart' : 'Show as table'}
    </button>
  )
  return [table, toggle] as const
}

/** Color for a call label: sell or exit red-orange, trim orange, buy now teal, buy-on-trigger blue, everything else hold amber. */
export function callColor(label: string): string {
  const l = label.toLowerCase()
  if (l.includes('sell') || l.includes('exit')) return '#D4501A'
  if (l.includes('trim') || l.includes('reduce')) return 'var(--viz-2, #eb6834)'
  if (l.includes('buy') && (l.includes('trigger') || l.includes('if') || l.includes('wait'))) return 'var(--viz-1, #2a78d6)'
  if (l.includes('buy')) return '#0A8F80'
  return '#B7791F'
}

/** Width of a radar name tag for a ticker and its (clipped) company name. */
export function tagWidth(ticker: string, name?: string): number {
  return ticker.length * 8 + (name ? clip(name, 12).length * 6.7 + 6 : 0) + 20
}

/** A pill on a radar chart: colored dot, bold ticker, then the short company name in muted ink. */
export function TickerTag({ cx, cy, w, color, ticker, name }: { cx: number; cy: number; w: number; color: string; ticker: string; name?: string }) {
  return (
    <>
      <rect x={cx - w / 2} y={cy - 9} width={w} height={18} rx="9" fill="var(--color-surface, #fff)" stroke={color} strokeWidth="1.5" />
      <circle cx={cx - w / 2 + 9} cy={cy} r="3.5" fill={color} />
      <text x={cx - w / 2 + 16} y={cy + 4} fontSize="12" fill="var(--color-text-primary, #0f172a)">
        <tspan fontWeight="600">{ticker}</tspan>
        {name && <tspan dx="5" fontSize="11" fill={viz.muted}>{clip(name, 12)}</tspan>}
      </text>
    </>
  )
}
