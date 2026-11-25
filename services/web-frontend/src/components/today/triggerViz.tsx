import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { NightlyRow } from '../../services/nightly'
import { fmtPct, fmtPrice } from './format'
import { scale, useWidth, viz } from '../stock/charts'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
const TRIGGER = '#0A8F80'
const WALK = '#D4501A'

export type Closes = { date: string; close: number }[]

/** Recent daily closes for every ticker in the list, in one request. */
export function useSparks(tickers: string[]): Record<string, Closes> {
  const key = [...new Set(tickers)].sort().join(',')
  const [data, setData] = useState<{ key: string; sparks: Record<string, Closes> }>({ key: '', sparks: {} })
  useEffect(() => {
    if (!key) return
    let live = true
    fetch(`${API_BASE_URL}/nightly/sparks?tickers=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((b: { data?: Record<string, Closes> }) => live && setData({ key, sparks: b.data ?? {} }))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [key])
  return data.key === key ? data.sparks : {}
}

/** Typical days (ATR) between the price and the trigger: negative = must fall to it, positive = must rise. */
export function typicalDays(r: Pick<NightlyRow, 'distance_to_trigger_pct' | 'atr' | 'price'>): number | null {
  if (r.distance_to_trigger_pct === null || !r.atr || !r.price) return null
  const atrPct = (r.atr / r.price) * 100
  return atrPct > 0 ? r.distance_to_trigger_pct / atrPct : null
}

/** Recent closes with the trigger (green dashes) and walk-away (red dashes) drawn across. */
export function PriceSpark({ closes, trigger, walk, width = 150, height = 40, axis = false }: { closes: Closes; trigger?: number | null; walk?: number | null; width?: number; height?: number; axis?: boolean }) {
  if (closes.length < 2) return <span className="inline-block" style={{ width, height }} />
  const vals = closes.map((c) => c.close)
  const levels = [trigger, walk].filter((v): v is number => typeof v === 'number' && v > 0)
  const lo = Math.min(...vals, ...levels)
  const hi = Math.max(...vals, ...levels)
  const pad = (hi - lo) * 0.08 || 1
  const left = axis ? 44 : 2
  const x = scale(0, closes.length - 1, left, width - 6)
  const y = scale(lo - pad, hi + pad, height - (axis ? 18 : 3), 3)
  const d = closes.map((c, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(c.close).toFixed(1)}`).join('')
  const last = closes[closes.length - 1]
  const first = closes[0]
  const up = last.close >= first.close
  const label = `${closes.length} days: ${fmtPrice(first.close)} to ${fmtPrice(last.close)}${trigger ? `, trigger ${fmtPrice(trigger)}` : ''}${walk ? `, walk away ${fmtPrice(walk)}` : ''}`
  return (
    <svg width={axis ? undefined : width} height={axis ? undefined : height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className={axis ? 'block h-auto w-full' : undefined}>
      <title>{label}</title>
      {axis && (
        <>
          {[lo, hi].map((v) => (
            <g key={v}>
              <line x1={left} x2={width - 6} y1={y(v)} y2={y(v)} stroke={viz.grid} />
              <text x={left - 6} y={y(v) + 4} fontSize="11" textAnchor="end" fill={viz.muted}>{v.toFixed(v >= 100 ? 0 : 2)}</text>
            </g>
          ))}
          <text x={left} y={height - 4} fontSize="11" fill={viz.muted}>{first.date}</text>
          <text x={width - 6} y={height - 4} fontSize="11" textAnchor="end" fill={viz.muted}>{last.date}</text>
        </>
      )}
      <path d={`${d}L${x(closes.length - 1)},${height - (axis ? 18 : 3)}L${x(0)},${height - (axis ? 18 : 3)}Z`} fill={viz.s1} fillOpacity="0.08" />
      {trigger ? <line x1={left} x2={width - 6} y1={y(trigger)} y2={y(trigger)} stroke={TRIGGER} strokeWidth="1.5" strokeDasharray="4 3" /> : null}
      {walk ? <line x1={left} x2={width - 6} y1={y(walk)} y2={y(walk)} stroke={WALK} strokeWidth="1.5" strokeDasharray="4 3" /> : null}
      <path d={d} fill="none" stroke={viz.s1} strokeWidth={axis ? 2 : 1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(closes.length - 1)} cy={y(last.close)} r="3" fill={up ? viz.s1 : WALK} stroke={viz.surface} strokeWidth="1.5" />
    </svg>
  )
}

/**
 * The price on a short number line with the walk-away (red), the trigger (green flag) and a band of one
 * typical day's move either side of the price: a trigger inside the band could fire any day.
 */
export function Ladder({ r, width = 170 }: { r: NightlyRow; width?: number }) {
  const pts = [r.price, r.trigger_price, r.walk_away, r.atr ? r.price - r.atr : null, r.atr ? r.price + r.atr : null].filter(
    (v): v is number => typeof v === 'number' && v > 0,
  )
  if (pts.length < 2) return null
  const lo = Math.min(...pts)
  const hi = Math.max(...pts)
  const pad = (hi - lo) * 0.06 || 1
  const x = scale(lo - pad, hi + pad, 4, width - 4)
  const H = 26
  const mid = 15
  const label = `Price ${fmtPrice(r.price)}; trigger ${fmtPrice(r.trigger_price)} (${fmtPct(r.distance_to_trigger_pct)}); walk away ${fmtPrice(r.walk_away)}; one typical day ±${fmtPrice(r.atr)}`
  return (
    <svg width={width} height={H} viewBox={`0 0 ${width} ${H}`} role="img" aria-label={label}>
      <title>{label}</title>
      <line x1={4} x2={width - 4} y1={mid} y2={mid} stroke={viz.grid} strokeWidth="4" strokeLinecap="round" />
      {r.atr ? <rect x={x(r.price - r.atr)} y={mid - 4} width={Math.max(2, x(r.price + r.atr) - x(r.price - r.atr))} height="8" rx="4" fill={viz.s1} fillOpacity="0.22" /> : null}
      {r.walk_away ? <line x1={x(r.walk_away)} x2={x(r.walk_away)} y1={mid - 7} y2={mid + 7} stroke={WALK} strokeWidth="2.5" strokeLinecap="round" /> : null}
      {r.trigger_price ? (
        <g>
          <line x1={x(r.trigger_price)} x2={x(r.trigger_price)} y1={mid + 6} y2={2} stroke={TRIGGER} strokeWidth="2" />
          <path d={`M${x(r.trigger_price)},2 l8,3 l-8,3 Z`} fill={TRIGGER} />
        </g>
      ) : null}
      <circle cx={x(r.price)} cy={mid} r="5" fill={viz.s1} stroke={viz.surface} strokeWidth="2" />
    </svg>
  )
}

export function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100)
  return (
    <span className="inline-flex items-center gap-2" title={`${pct}% sure (not yet calibrated against results)`}>
      <span className="inline-block h-2 w-16 overflow-hidden rounded-full" style={{ background: 'var(--color-border, #e2e8f0)' }}>
        <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: viz.s1 }} />
      </span>
      <span className="tabular-nums">{pct}%</span>
    </span>
  )
}

/**
 * Every waiting stock on one axis: how many typical days' moves its trigger is away. Left of centre the price
 * must fall to it (pullback), right of centre it must rise (breakout). The shaded band is within one day.
 */
export function TriggerRadar({ rows }: { rows: NightlyRow[] }) {
  const go = useNavigate()
  const [box, W] = useWidth<HTMLDivElement>(300, 1100, 900)
  const pts = rows
    .map((r) => ({ r, d: typicalDays(r) }))
    .filter((p): p is { r: NightlyRow; d: number } => p.d !== null)
    .sort((a, b) => a.d - b.d)
  if (!pts.length) return null
  // The scale fits the farthest stock (at least ±2 days, at most ±6), so the names spread out.
  const LIM = Math.min(6, Math.max(2, Math.ceil(Math.max(...pts.map((p) => Math.abs(p.d))))))
  const x = scale(-LIM, LIM, 28, W - 28)
  // Stack labels into lanes so neighbours never overlap.
  const laneEnd: number[] = []
  const placed = pts.map((p) => {
    const cx = x(Math.max(-LIM, Math.min(LIM, p.d)))
    const w = p.r.ticker.length * 8 + 18
    let lane = laneEnd.findIndex((end) => cx - w / 2 > end + 4)
    if (lane < 0) {
      lane = laneEnd.length
      laneEnd.push(0)
    }
    laneEnd[lane] = cx + w / 2
    return { ...p, cx, w, lane }
  })
  const laneH = 26
  const top = 34
  const H = top + laneEnd.length * laneH + 30
  const axisY = H - 24
  return (
    <div ref={box} className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`${pts.length} stocks placed by typical days to their trigger`}>
        <rect x={x(-1)} y={top - 8} width={x(1) - x(-1)} height={axisY - top + 8} rx="8" fill={viz.s1} fillOpacity="0.08" />
        <rect x={x(-0.5)} y={top - 8} width={x(0.5) - x(-0.5)} height={axisY - top + 8} rx="6" fill={viz.s1} fillOpacity="0.1" />
        <text x={x(0)} y={14} fontSize="12" textAnchor="middle" fill={viz.muted}>within one typical day</text>
        <text x={x(-LIM)} y={14} fontSize="12" fill={viz.muted}>← must fall (pullback)</text>
        <text x={x(LIM)} y={14} fontSize="12" textAnchor="end" fill={viz.muted}>must rise (breakout) →</text>
        <line x1={x(-LIM)} x2={x(LIM)} y1={axisY} y2={axisY} stroke={viz.ink} strokeOpacity="0.4" />
        {Array.from({ length: 2 * LIM + 1 }, (_, i) => i - LIM).map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={axisY - 4} y2={axisY + 4} stroke={viz.ink} strokeOpacity="0.4" />
            <text x={x(t)} y={axisY + 17} fontSize="11" textAnchor="middle" fill={viz.muted}>{t === 0 ? 'price' : `${t > 0 ? '+' : ''}${t}${Math.abs(t) === LIM ? '+' : ''} d`}</text>
          </g>
        ))}
        {placed.map(({ r, d, cx, w, lane }) => {
          const cy = top + lane * laneH + 8
          const color = d < 0 ? WALK : TRIGGER
          return (
            <g
              key={r.ticker}
              role="link"
              tabIndex={0}
              className="cursor-pointer outline-none"
              onClick={() => go(`/stock/${r.ticker}`)}
              onKeyDown={(e) => e.key === 'Enter' && go(`/stock/${r.ticker}`)}
            >
              <title>{`${r.ticker}: trigger ${fmtPrice(r.trigger_price)} is ${fmtPct(r.distance_to_trigger_pct)} away, about ${Math.abs(d).toFixed(1)} typical days`}</title>
              <line x1={cx} x2={cx} y1={cy + 9} y2={axisY} stroke={color} strokeOpacity="0.35" strokeDasharray="2 3" />
              <rect x={cx - w / 2} y={cy - 9} width={w} height={18} rx="9" fill="var(--color-surface, #fff)" stroke={color} strokeWidth="1.5" />
              <circle cx={cx - w / 2 + 9} cy={cy} r="3.5" fill={color} />
              <text x={cx + 5} y={cy + 4} fontSize="12" fontWeight="600" textAnchor="middle" fill="var(--color-text-primary, #0f172a)">{r.ticker}</text>
            </g>
          )
        })}
      </svg>
      <p className="text-xs" style={{ color: viz.muted }}>
        Distance to the trigger divided by the stock&apos;s typical daily move (ATR). Red: the price must fall to the trigger; green: it must rise. Click a
        name for the stock.
      </p>
    </div>
  )
}
