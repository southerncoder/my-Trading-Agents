import { useEffect, useState } from 'react'
import { shortName } from './stock/research'

/** Company name and website per ticker, fetched in batches and kept for the session. */
export type Brand = { name?: string; domain?: string }

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// One request for every ticker on screen: everything asked within the same tick goes out as a single batch.
const known = new Map<string, Brand>()
const waiting = new Map<string, Array<(b: Brand) => void>>()
let timer: ReturnType<typeof setTimeout> | null = null

function flush() {
  timer = null
  const tickers = [...waiting.keys()].slice(0, 60)
  if (!tickers.length) return
  const done = (data: Record<string, Brand>) => {
    for (const t of tickers) {
      const b = data[t] ?? {}
      known.set(t, b)
      for (const cb of waiting.get(t) ?? []) cb(b)
      waiting.delete(t)
    }
    if (waiting.size) timer = setTimeout(flush, 20)
  }
  fetch(`${API_BASE_URL}/nightly/brands?tickers=${tickers.map(encodeURIComponent).join(',')}`)
    .then((r) => r.json())
    .then((body: { data?: Record<string, Brand> }) => done(body.data ?? {}))
    .catch(() => done({}))
}

function ask(ticker: string, cb: (b: Brand) => void) {
  waiting.set(ticker, [...(waiting.get(ticker) ?? []), cb])
  timer ??= setTimeout(flush, 20)
}

export function useBrand(ticker: string): Brand | undefined {
  const [brand, setBrand] = useState<Brand | undefined>(() => known.get(ticker))
  useEffect(() => {
    if (known.has(ticker)) {
      setBrand(known.get(ticker))
      return
    }
    let live = true
    ask(ticker, (b) => live && setBrand(b))
    return () => {
      live = false
    }
  }, [ticker])
  return brand
}

/** Short company names ("Coca-Cola", not "The Coca-Cola Company") for many tickers at once; missing ones are absent. */
export function useNames(tickers: string[]): Record<string, string> {
  const key = [...new Set(tickers)].sort().join(',')
  const read = () => {
    const out: Record<string, string> = {}
    for (const t of key ? key.split(',') : []) {
      const n = known.get(t)?.name
      if (n) out[t] = shortName(n, t)
    }
    return out
  }
  const [names, setNames] = useState<Record<string, string>>(read)
  useEffect(() => {
    setNames(read())
    const missing = (key ? key.split(',') : []).filter((t) => !known.has(t))
    if (!missing.length) return
    let live = true
    let left = missing.length
    for (const t of missing) {
      ask(t, () => {
        left--
        if (live && left === 0) setNames(read())
      })
    }
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return names
}

/** One ticker's short company name, or undefined until it is known (or if it has none). */
export function useName(ticker: string): string | undefined {
  const b = useBrand(ticker)
  return b?.name ? shortName(b.name, ticker) : undefined
}

/** Cuts a name to fit a chart label. */
export const clip = (s: string | undefined, max: number) => (!s ? '' : s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s)
