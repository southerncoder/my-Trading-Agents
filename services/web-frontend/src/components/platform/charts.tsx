import { CheckCircle2, XCircle } from 'lucide-react'
import type { Platform } from '../../services/nightly'
import { niceTicks, scale, useWidth, viz } from '../stock/charts'
import { muted } from '../viz'

/** Pick sources in a fixed color order; anything else is grey. */
export const SOURCES = [
  { key: 'core', name: 'Watchlist (core)', color: 'var(--viz-1, #2a78d6)' },
  { key: 'brands', name: 'Watchlist (brands)', color: 'var(--viz-2, #eb6834)' },
  { key: 'screen', name: 'Screen', color: 'var(--viz-3, #1baf7a)' },
  { key: 'news', name: 'In the news', color: 'var(--viz-4, #eda100)' },
] as const
const OTHER = { key: 'other', name: 'Other', color: '#94a3b8' }

/** The sources that appear in the nights, in the fixed order, with "other" last if anything else shows up. */
export function sourcesIn(nights: Platform['nights']) {
  const seen = new Set(nights.flatMap((n) => Object.keys(n.bySource)))
  const known: { key: string; name: string; color: string }[] = SOURCES.filter((s) => seen.has(s.key))
  return [...known, ...([...seen].some((k) => !SOURCES.some((s) => s.key === k)) ? [OTHER] : [])]
}

const countOf = (n: Platform['nights'][number], key: string) =>
  key === 'other' ? Object.entries(n.bySource).filter(([k]) => !SOURCES.some((s) => s.key === k)).reduce((a, [, v]) => a + v, 0) : (n.bySource[key] ?? 0)

/** Calls per night, stacked by where the stock came from (2px gaps between segments). */
export function CallsPerNight({ nights }: { nights: Platform['nights'] }) {
  const [box, W] = useWidth<HTMLDivElement>(300, 1100, 700)
  if (!nights.length) return null
  const src = sourcesIn(nights)
  const H = 220
  const L = 36
  const B = 30
  const max = Math.max(...nights.map((n) => n.calls))
  const ticks = niceTicks(0, max, 4)
  const top = Math.max(max, ticks[ticks.length - 1] ?? max)
  const y = scale(0, top, H - B, 12)
  const slot = (W - L - 8) / nights.length
  const bw = Math.max(8, Math.min(44, slot - 10))
  const every = Math.ceil(nights.length / Math.max(1, Math.floor((W - L) / 56)))
  return (
    <div ref={box} className="space-y-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {src.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: s.color }} aria-hidden="true" />
            {s.name}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={nights.map((n) => `${n.date}: ${n.calls} calls`).join('; ')}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - 8} y1={y(t)} y2={y(t)} stroke={viz.grid} />
            <text x={L - 6} y={y(t) + 4} fontSize="11" textAnchor="end" fill={viz.muted}>{t}</text>
          </g>
        ))}
        {nights.map((n, i) => {
          const cx = L + slot * i + slot / 2
          let acc = 0
          return (
            <g key={n.date}>
              <title>{`${n.date}: ${n.calls} calls (${src.map((s) => `${s.name} ${countOf(n, s.key)}`).join(', ')})`}</title>
              {src.map((s) => {
                const v = countOf(n, s.key)
                if (!v) return null
                const y0 = y(acc)
                acc += v
                const y1 = y(acc)
                return <rect key={s.key} x={cx - bw / 2} y={y1 + 1} width={bw} height={Math.max(1, y0 - y1 - 2)} rx="3" fill={s.color} />
              })}
              <text x={cx} y={y(n.calls) - 4} fontSize="11" textAnchor="middle" fill="var(--color-text-primary, #0f172a)">{n.calls}</text>
              {i % every === 0 && <text x={cx} y={H - B + 16} fontSize="11" textAnchor="middle" fill={viz.muted}>{n.date.slice(5)}</text>}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** Whole-run minutes per night (from the run's own summary); nights without a recorded time show a gap. */
export function RunMinutes({ nights }: { nights: Platform['nights'] }) {
  const [box, W] = useWidth<HTMLDivElement>(300, 1100, 700)
  const timed = nights.filter((n) => n.minutes !== null)
  if (!timed.length) return <p style={muted}>No run times recorded yet.</p>
  const H = 200
  const L = 36
  const B = 30
  const max = Math.max(...timed.map((n) => n.minutes as number))
  const ticks = niceTicks(0, max, 4)
  const top = Math.max(max, ticks[ticks.length - 1] ?? max)
  const y = scale(0, top, H - B, 12)
  const slot = (W - L - 8) / nights.length
  const bw = Math.max(8, Math.min(44, slot - 10))
  const every = Math.ceil(nights.length / Math.max(1, Math.floor((W - L) / 56)))
  return (
    <div ref={box}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={timed.map((n) => `${n.date}: ${n.minutes} minutes`).join('; ')}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - 8} y1={y(t)} y2={y(t)} stroke={viz.grid} />
            <text x={L - 6} y={y(t) + 4} fontSize="11" textAnchor="end" fill={viz.muted}>{t}m</text>
          </g>
        ))}
        {nights.map((n, i) => {
          const cx = L + slot * i + slot / 2
          return (
            <g key={n.date}>
              {n.minutes !== null ? (
                <>
                  <title>{`${n.date}: ${n.minutes} minutes for ${n.calls} calls${n.seconds_median ? `, median ${Math.round(n.seconds_median)}s per stock` : ''}`}</title>
                  <rect x={cx - bw / 2} y={y(n.minutes)} width={bw} height={Math.max(2, y(0) - y(n.minutes))} rx="4" fill={viz.s1} />
                  <text x={cx} y={y(n.minutes) - 4} fontSize="11" textAnchor="middle" fill="var(--color-text-primary, #0f172a)">{n.minutes}m</text>
                </>
              ) : (
                <text x={cx} y={y(0) - 4} fontSize="10" textAnchor="middle" fill={viz.muted}>—</text>
              )}
              {i % every === 0 && <text x={cx} y={H - B + 16} fontSize="11" textAnchor="middle" fill={viz.muted}>{n.date.slice(5)}</text>}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** One card per data service: up or down (icon and word, not color alone), how fast it answered, what it does. */
export function ServiceGrid({ services }: { services: Platform['services'] }) {
  return (
    <ul className="grid grid-cols-[repeat(1,minmax(0,1fr))] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))] lg:grid-cols-[repeat(3,minmax(0,1fr))]">
      {services.map((s) => {
        const color = s.ok ? '#0A8F80' : '#b91c1c'
        const Icon = s.ok ? CheckCircle2 : XCircle
        const slow = s.ok && (s.ms ?? 0) > 1000
        return (
          <li key={s.name} className="rounded-xl p-4" style={{ border: '1px solid var(--color-border, #e2e8f0)', borderLeft: `4px solid ${color}` }}>
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 shrink-0" style={{ color }} aria-hidden="true" />
              <span className="font-semibold">{s.name}</span>
              <span className="ml-auto text-sm font-semibold" style={{ color }}>{s.ok ? 'Up' : s.status ? `Error ${s.status}` : 'Not answering'}</span>
            </div>
            <div className="mt-1 text-sm" style={muted}>{s.role}</div>
            {s.ms !== null && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="inline-block h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--color-border, #e2e8f0)' }}>
                  <span className="block h-full rounded-full" style={{ width: `${Math.min(100, (s.ms / 1500) * 100)}%`, background: slow ? '#b45309' : viz.s1 }} />
                </span>
                <span className="tabular-nums" style={muted}>{s.ms} ms{slow ? ' (slow)' : ''}</span>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/** Which model setup ran each night, newest first, so a change of models is easy to line up with results. */
export function ModelTimeline({ nights }: { nights: Platform['nights'] }) {
  const rows = [...nights].reverse()
  return (
    <ol className="space-y-2">
      {rows.map((n, i) => {
        const changed = i < rows.length - 1 && (rows[i + 1].fast_model !== n.fast_model || rows[i + 1].decision_model !== n.decision_model)
        return (
          <li key={n.date} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg p-2 text-sm" style={{ border: '1px solid var(--color-border, #e2e8f0)' }}>
            <span className="w-24 shrink-0 font-semibold tabular-nums">{n.date}</span>
            <span className="rounded-full px-2 py-0.5 text-xs font-semibold" style={{ border: '1px solid var(--color-border, #cbd5e1)' }}>{n.profile || 'unknown'}</span>
            <span className="min-w-0 break-all" style={muted}>
              {n.fast_model ?? '?'} → {n.decision_model ?? '?'}
            </span>
            {changed && <span className="ml-auto rounded px-1.5 text-xs font-semibold" style={{ color: '#b45309', border: '1px solid #b45309' }}>models changed</span>}
          </li>
        )
      })}
    </ol>
  )
}
