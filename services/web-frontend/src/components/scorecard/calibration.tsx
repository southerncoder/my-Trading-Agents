import type { ScoreDetail } from '../../services/nightly'
import { scale, useWidth, viz } from '../stock/charts'
import { muted } from '../viz'

/** Calls needed before the verdict is given; below it the chart still shows, marked as too early. */
export const MIN_CALLS = 200

export const BANDS: Array<{ key: string; lo: number; hi: number }> = [
  { key: 'under 55%', lo: 0, hi: 0.55 },
  { key: '55-59%', lo: 0.55, hi: 0.6 },
  { key: '60-64%', lo: 0.6, hi: 0.65 },
  { key: '65-69%', lo: 0.65, hi: 0.7 },
  { key: '70% and up', lo: 0.7, hi: 1.01 },
]

/** Wilson 95% interval for a share of k successes out of n (stays inside 0-1, sane for small n). */
export function wilson(k: number, n: number): { lo: number; hi: number } {
  if (!n) return { lo: 0, hi: 1 }
  const z = 1.96
  const p = k / n
  const den = 1 + (z * z) / n
  const mid = (p + (z * z) / (2 * n)) / den
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den
  return { lo: Math.max(0, mid - half), hi: Math.min(1, mid + half) }
}

export interface Band {
  key: string
  n: number
  beat: number
  rate: number
  lo: number
  hi: number
  avgExcess: number
}

export function bands(detail: ScoreDetail[]): Band[] {
  return BANDS.map((b) => {
    const rows = detail.filter((d) => d.confidence >= b.lo && d.confidence < b.hi)
    const beat = rows.filter((d) => d.excess_pct > 0).length
    const ci = wilson(beat, rows.length)
    return { key: b.key, n: rows.length, beat, rate: rows.length ? beat / rows.length : 0, lo: ci.lo, hi: ci.hi, avgExcess: rows.length ? rows.reduce((a, d) => a + d.excess_pct, 0) / rows.length : 0 }
  }).filter((b) => b.n > 0)
}

/**
 * A plain answer to "do surer calls do better?": compares the lowest and highest bands that have at least 20
 * calls, and only says yes or no when their 95% intervals do not overlap.
 */
export function verdict(bs: Band[], total: number): { tone: 'wait' | 'yes' | 'no' | 'unclear'; text: string } {
  if (total < MIN_CALLS) return { tone: 'wait', text: `Too early to judge: ${total} finished calls, and a fair test needs about ${MIN_CALLS}.` }
  const usable = bs.filter((b) => b.n >= 20)
  if (usable.length < 2) return { tone: 'unclear', text: 'Most calls share one confidence band, so there is nothing to compare yet.' }
  const low = usable[0]
  const high = usable[usable.length - 1]
  if (high.lo > low.hi) return { tone: 'yes', text: `Surer calls do better: ${Math.round(high.rate * 100)}% of ${high.key} calls beat SPY against ${Math.round(low.rate * 100)}% of ${low.key} calls, and the ranges do not overlap.` }
  if (high.hi < low.lo) return { tone: 'no', text: `Surer calls do worse: ${Math.round(high.rate * 100)}% of ${high.key} calls beat SPY against ${Math.round(low.rate * 100)}% of ${low.key} calls. The confidence number is misleading.` }
  return { tone: 'unclear', text: `No clear difference: ${Math.round(low.rate * 100)}% (${low.key}) against ${Math.round(high.rate * 100)}% (${high.key}), within each other's ranges. Confidence does not yet tell the good calls from the rest.` }
}

/** Share of calls that beat SPY per confidence band, with 95% error bars and the 50% coin-flip line. */
export function CalibrationChart({ detail }: { detail: ScoreDetail[] }) {
  const [box, W] = useWidth<HTMLDivElement>(300, 900, 700)
  const bs = bands(detail)
  const v = verdict(bs, detail.length)
  const color = { wait: '#64748b', yes: '#0A8F80', no: '#b91c1c', unclear: '#b45309' }[v.tone]
  const H = 240
  const L = 44
  const x = scale(-0.5, bs.length - 0.5, L, W - 10)
  const y = scale(0, 1, H - 40, 10)
  return (
    <div ref={box} className="space-y-3">
      <p className="rounded-lg px-3 py-2 font-semibold" style={{ border: `1px solid ${color}`, color }}>{v.text}</p>
      {bs.length > 0 && (
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={bs.map((b) => `${b.key}: ${Math.round(b.rate * 100)}% of ${b.n} beat SPY (range ${Math.round(b.lo * 100)}-${Math.round(b.hi * 100)}%)`).join('; ')}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line x1={L} x2={W - 10} y1={y(t)} y2={y(t)} stroke={t === 0.5 ? viz.ink : viz.grid} strokeOpacity={t === 0.5 ? 0.5 : 1} strokeDasharray={t === 0.5 ? '4 3' : undefined} />
              <text x={L - 6} y={y(t) + 4} fontSize="11" textAnchor="end" fill={viz.muted}>{t * 100}%</text>
            </g>
          ))}
          <text x={W - 12} y={y(0.5) - 5} fontSize="11" textAnchor="end" fill={viz.muted}>coin flip</text>
          {bs.map((b, i) => (
            <g key={b.key} opacity={b.n < 20 ? 0.45 : 1}>
              <title>{`${b.key}: ${b.beat} of ${b.n} calls beat SPY (${Math.round(b.rate * 100)}%), 95% range ${Math.round(b.lo * 100)}-${Math.round(b.hi * 100)}%; average ${b.avgExcess >= 0 ? '+' : ''}${b.avgExcess.toFixed(2)}% against SPY`}</title>
              <line x1={x(i)} x2={x(i)} y1={y(b.lo)} y2={y(b.hi)} stroke={viz.s1} strokeWidth="2" />
              <line x1={x(i) - 6} x2={x(i) + 6} y1={y(b.lo)} y2={y(b.lo)} stroke={viz.s1} strokeWidth="2" />
              <line x1={x(i) - 6} x2={x(i) + 6} y1={y(b.hi)} y2={y(b.hi)} stroke={viz.s1} strokeWidth="2" />
              <circle cx={x(i)} cy={y(b.rate)} r="6" fill={viz.s1} stroke={viz.surface} strokeWidth="2" />
              <text x={x(i)} y={H - 22} fontSize="11" textAnchor="middle" fill="var(--color-text-primary, #0f172a)">{b.key}</text>
              <text x={x(i)} y={H - 8} fontSize="10" textAnchor="middle" fill={viz.muted}>{b.n} calls</text>
            </g>
          ))}
        </svg>
      )}
      <p className="text-xs" style={muted}>Dot: the share of calls in that confidence band that beat SPY. Bar: where the true share probably lies (95% range); short bars need many calls. Faded: fewer than 20 calls.</p>
    </div>
  )
}
