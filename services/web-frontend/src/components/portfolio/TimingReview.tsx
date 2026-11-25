import { useEffect, useState } from 'react'
import { CheckCircle2, Clock, XCircle } from 'lucide-react'
import { fetchTiming, type Timing } from '../../services/portfolio'
import { scale, useWidth, viz } from '../stock/charts'
import { muted } from '../today/format'

const BUY = '#0A8F80'
const SELL = '#D4501A'
const TONE = { good: { icon: CheckCircle2, color: BUY }, bad: { icon: XCircle, color: SELL }, neutral: { icon: Clock, color: '#64748b' } }
const TOPIC: Record<string, string> = { entry: 'Buying', exit: 'Selling', after: 'After the sale', held: 'So far' }
const isBuyCall = (label: string, decision: string) => /^(buy|add)/i.test(label) || decision === 'BUY'

/** Daily closes with every call (triangles) and every trade (dots), and the best entry and best exit in hindsight (rings). */
function TimingChart({ t }: { t: Timing }) {
  const [box, W] = useWidth<HTMLDivElement>(300, 900, 640)
  const H = 190
  const closes = t.closes
  if (closes.length < 2) return <p className="text-sm" style={muted}>Not enough stored prices to draw this yet.</p>
  const idx = new Map(closes.map((c, i) => [c.date, i]))
  // Calls are made after the close: a call or trade on a non-trading day sits on the next bar.
  const at = (date: string) => {
    if (idx.has(date)) return idx.get(date)!
    const i = closes.findIndex((c) => c.date >= date)
    return i < 0 ? closes.length - 1 : i
  }
  const r = t.review
  const prices = [...closes.map((c) => c.close), ...t.trades.map((x) => x.price), ...t.calls.flatMap((c) => (c.price ? [c.price] : []))]
  const lo = Math.min(...prices)
  const hi = Math.max(...prices)
  const pad = (hi - lo) * 0.1 || 1
  const L = 48
  const x = scale(0, closes.length - 1, L, W - 10)
  const y = scale(lo - pad, hi + pad, H - 22, 10)
  const d = closes.map((c, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(c.close).toFixed(1)}`).join('')
  const ring = (p: { date: string; price: number } | null | undefined, color: string, key: string) =>
    p ? <circle key={key} cx={x(at(p.date))} cy={y(p.price)} r="8" fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="3 2" /> : null
  return (
    <div ref={box} className="space-y-1">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={muted}>
        <span><span style={{ color: BUY }}>▲</span> buy call</span>
        <span><span style={{ color: SELL }}>▼</span> sell call</span>
        <span><span style={{ color: BUY }}>●</span> bought</span>
        <span><span style={{ color: SELL }}>●</span> sold</span>
        <span><span style={{ color: BUY }}>◌</span> best entry in hindsight</span>
        <span><span style={{ color: SELL }}>◌</span> best close while held</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${t.ticker} closes from ${closes[0].date} to ${closes[closes.length - 1].date} with its calls and trades`}>
        {[lo, hi].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - 10} y1={y(v)} y2={y(v)} stroke={viz.grid} />
            <text x={L - 6} y={y(v) + 4} fontSize="11" textAnchor="end" fill={viz.muted}>{v.toFixed(v >= 100 ? 0 : 2)}</text>
          </g>
        ))}
        <text x={L} y={H - 4} fontSize="11" fill={viz.muted}>{closes[0].date}</text>
        <text x={W - 10} y={H - 4} fontSize="11" textAnchor="end" fill={viz.muted}>{closes[closes.length - 1].date}</text>
        {r?.exit && <rect x={x(at(r.entry.firstDate))} y={10} width={Math.max(1, x(at(r.exit.lastDate)) - x(at(r.entry.firstDate)))} height={H - 32} fill={viz.s1} fillOpacity="0.07" />}
        {r && !r.exit && <rect x={x(at(r.entry.firstDate))} y={10} width={Math.max(1, W - 10 - x(at(r.entry.firstDate)))} height={H - 32} fill={viz.s1} fillOpacity="0.07" />}
        <path d={d} fill="none" stroke={viz.s1} strokeWidth="2" strokeLinejoin="round" />
        {t.calls.map((c, i) => {
          if (!c.price) return null
          const buy = isBuyCall(c.label, c.decision)
          const sell = c.decision === 'SELL'
          if (!buy && !sell) return null
          const cx = x(at(c.run_date))
          const cy = y(c.price)
          return (
            <path key={`c${i}`} d={buy ? `M${cx},${cy + 7} l-6,9 l12,0 Z` : `M${cx},${cy - 7} l-6,-9 l12,0 Z`} fill={buy ? BUY : SELL}>
              <title>{`${c.run_date}: ${c.label} (${c.decision}) at $${c.price.toFixed(2)}`}</title>
            </path>
          )
        })}
        {t.trades.map((tr, i) => {
          const buy = tr.action === 'open' || tr.action === 'add'
          return (
            <circle key={`t${i}`} cx={x(at(tr.traded_on))} cy={y(tr.price)} r="5" fill={buy ? BUY : SELL} stroke={viz.surface} strokeWidth="2">
              <title>{`${tr.traded_on}: ${buy ? 'bought' : 'sold'} ${tr.quantity} at $${tr.price.toFixed(2)}`}</title>
            </circle>
          )
        })}
        {ring(r?.bestEntry, BUY, 'be')}
        {r?.exit && ring(r.bestWhileHeld, SELL, 'bh')}
      </svg>
    </div>
  )
}

/** Loads and shows a position's hindsight timing review: the chart and plain verdicts. */
export function TimingReview({ portfolioId, positionId }: { portfolioId: number; positionId: number }) {
  const [t, setT] = useState<Timing | null>(null)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    fetchTiming(portfolioId, positionId).then(
      (x) => live && setT(x),
      (e: Error) => live && setErr(e.message),
    )
    return () => {
      live = false
    }
  }, [portfolioId, positionId])
  if (err) return <p role="alert" className="text-sm" style={{ color: SELL }}>{err}</p>
  if (!t) return <p role="status" className="text-sm" style={muted}>Loading the timing review...</p>
  if (!t.review) return <p className="text-sm" style={muted}>No buys recorded for this position.</p>
  return (
    <div className="space-y-3">
      <TimingChart t={t} />
      <div className="grid gap-2 md:grid-cols-2">
        {t.review.lines.map((l, i) => {
          const tone = TONE[l.tone]
          const Icon = tone.icon
          return (
            <div key={i} className="flex gap-2 rounded-xl p-3 text-sm" style={{ border: '1px solid var(--color-border, #e2e8f0)', borderLeft: `3px solid ${tone.color}` }}>
              <Icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: tone.color }} aria-label={l.tone} />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide" style={muted}>{TOPIC[l.topic] ?? l.topic}</div>
                {l.text}
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-xs" style={muted}>Hindsight from stored daily closes only: it shows what would have been better, not what was knowable at the time.</p>
    </div>
  )
}

/** A button that opens the timing review under a position. */
export function TimingToggle({ portfolioId, positionId, closed, label }: { portfolioId: number; positionId: number; closed: boolean; label?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="w-full rounded-lg border border-dashed p-2 text-sm" style={{ borderColor: 'var(--color-border, #e2e8f0)' }}>
      <button type="button" className="font-medium underline" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {label ? `${label}: ` : ''}{open ? 'hide the timing review' : closed ? 'was it bought and sold at the right time?' : 'how is the timing so far?'}
      </button>
      {open && <div className="mt-2"><TimingReview portfolioId={portfolioId} positionId={positionId} /></div>}
    </div>
  )
}
