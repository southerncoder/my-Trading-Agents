/** Pure helpers for brand icons: Simple Icons slugs, favicon URLs and the lettered fallback badge. */

/** Simple Icons slug for a company name, using its rules (+ -> plus, . -> dot, & -> and, accents dropped). */
export function simpleIconSlug(name: string): string {
  const core = name
    .replace(/^the\s+/i, '')
    .replace(/[,.]?\s+(inc|incorporated|corp|corporation|co|company|plc|ltd|limited|holdings?|group|n\.?v|s\.?a|ag)\.?$/i, '')
    .replace(/[,.]?\s+(inc|corp|co|company|holdings?)\.?$/i, '')
    .replace(/\s*&\s*$/, '')
  return core
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\+/g, 'plus')
    .replace(/\./g, 'dot')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '')
}

export const simpleIconUrl = (slug: string) => `https://cdn.simpleicons.org/${encodeURIComponent(slug)}`

/** The site's icon through DuckDuckGo's icon service (the browser asks it, not the company, for the image). */
export const faviconUrl = (domain: string) => `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`

/** Badge colors: dark enough for white letters (≥ 4.5:1). */
const BADGE = ['#1d4ed8', '#047857', '#b45309', '#7c3aed', '#be123c', '#0e7490', '#4d7c0f', '#9d174d', '#334155', '#c2410c']

export function badgeColor(ticker: string): string {
  let h = 0
  for (const c of ticker) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return BADGE[h % BADGE.length]
}
