import { useEffect, useState } from 'react'
import { useBrand } from './brandStore'
import { badgeColor, faviconUrl, simpleIconSlug, simpleIconUrl } from './brand'

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
