import { useEffect, useRef, useState } from 'react'

/** Simple moving average of the closes; null until `n` closes exist. */
export function sma(values: number[], n: number): (number | null)[] {
  const out: (number | null)[] = []
  let sum = 0
  for (let i = 0; i < values.length; i++) {
    sum += values[i]
    if (i >= n) sum -= values[i - n]
    out.push(i >= n - 1 ? sum / n : null)
  }
  return out
}

/** About `count` round tick values covering [min, max] (steps of 1, 2, 2.5 or 5 times a power of ten). */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return []
  if (max === min) return [min]
  const raw = (max - min) / count
  const pow = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? 10 * pow
  const ticks: number[] = []
  for (let v = Math.ceil(min / step) * step; v <= max + step * 1e-9; v += step) ticks.push(Math.round(v * 1e6) / 1e6)
  return ticks
}

/** $13.4B, $812M, $4.2K. */
export function compactMoney(n: number): string {
  const a = Math.abs(n)
  const sign = n < 0 ? '−' : ''
  if (a >= 1e12) return `${sign}$${(a / 1e12).toFixed(1)}T`
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(1)}B`
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(0)}M`
  if (a >= 1e3) return `${sign}$${(a / 1e3).toFixed(1)}K`
  return `${sign}$${a.toFixed(0)}`
}

/** Linear scale from a domain to a pixel range. */
export const scale = (d0: number, d1: number, r0: number, r1: number) => (v: number) => (d1 === d0 ? (r0 + r1) / 2 : r0 + ((v - d0) / (d1 - d0)) * (r1 - r0))

/** The element's width, clamped, kept current with a ResizeObserver so labels keep their real pixel size. */
export function useWidth<T extends HTMLElement>(min: number, max: number, initial = max) {
  const ref = useRef<T>(null)
  const [w, setW] = useState(initial)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => setW(Math.max(min, Math.min(max, Math.round(e.contentRect.width)))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [min, max])
  return [ref, w] as const
}

export const viz = {
  s1: 'var(--viz-1, #3987e5)',
  s2: 'var(--viz-2, #d95926)',
  s3: 'var(--viz-3, #199e70)',
  surface: 'var(--viz-surface, #0f172a)',
  grid: 'var(--viz-grid, rgba(148,163,184,0.16))',
  ink: 'var(--color-text-secondary, #475569)',
  muted: 'var(--color-text-muted, #64748b)',
}

/** Short month label for an ISO date: "Nov", or "Jan 26" at a year change. */
export function monthLabel(date: string, withYear: boolean): string {
  const d = new Date(`${date}T00:00:00Z`)
  const m = d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
  return withYear ? `${m} ${String(d.getUTCFullYear()).slice(2)}` : m
}
