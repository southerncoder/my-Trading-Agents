import { useEffect, useState } from 'react'
import { badgeColor, faviconUrl, simpleIconSlug, simpleIconUrl } from './brand'

type Brand = { name?: string; domain?: string }

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// One request for every ticker on screen: icons ask within the same tick, then a single batch is fetched.
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

function useBrand(ticker: string): Brand | undefined {
  const [brand, setBrand] = useState<Brand | undefined>(() => known.get(ticker))
  useEffect(() => {
    if (known.has(ticker)) {
      setBrand(known.get(ticker))
      return
    }
    let live = true
    const cb = (b: Brand) => live && setBrand(b)
    waiting.set(ticker, [...(waiting.get(ticker) ?? []), cb])
    timer ??= setTimeout(flush, 20)
    return () => {
      live = false
    }
  }, [ticker])
  return brand
}

/**
 * The company's mark, best source first: its Simple Icons logo, its own site icon, then a lettered badge.
 * Images are loaded by the browser when shown, never copied or stored here.
 */
export function BrandIcon({ ticker, size = 20, className = '' }: { ticker: string; size?: number; className?: string }) {
  const brand = useBrand(ticker)
  const sources = [
    ...(brand?.name ? [simpleIconUrl(simpleIconSlug(brand.name))] : []),
    ...(brand?.domain ? [faviconUrl(brand.domain)] : []),
  ]
  const [failed, setFailed] = useState(0)
  useEffect(() => setFailed(0), [brand?.name, brand?.domain])
  const src = sources[failed]
  const box: React.CSSProperties = { width: size, height: size, borderRadius: Math.max(4, size / 5), flexShrink: 0 }

  if (src) {
    return (
      <span className={`inline-flex items-center justify-center overflow-hidden ${className}`} style={{ ...box, background: '#fff', border: '1px solid var(--color-border, #e2e8f0)' }}>
        <img
          src={src}
          alt=""
          width={Math.round(size * 0.72)}
          height={Math.round(size * 0.72)}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed((f) => f + 1)}
          // The favicon service answers a missing icon with a tiny placeholder; treat it as missing.
          onLoad={(e) => e.currentTarget.naturalWidth <= 1 && setFailed((f) => f + 1)}
        />
      </span>
    )
  }
  const letters = ticker.replace(/[^A-Z0-9]/gi, '').slice(0, size >= 32 ? 4 : 3)
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center font-bold text-white ${className}`}
      style={{ ...box, background: badgeColor(ticker), fontSize: Math.max(8, size * (letters.length > 2 ? 0.32 : 0.42)), letterSpacing: '-0.02em' }}
    >
      {letters}
    </span>
  )
}
