/**
 * Company name and website domain per ticker (Yahoo Finance profile), so the page can show the company's own
 * site icon. Names and domains change rarely: kept for a week, failures retried after a day.
 */

export interface Brand {
  name?: string
  domain?: string
}

export interface BrandDeps {
  yahooUrl: string
  fetchText: (url: string) => Promise<string>
}

const OK_TTL = 7 * 24 * 3600 * 1000
const FAIL_TTL = 24 * 3600 * 1000
const cache = new Map<string, { at: number; ttl: number; data: Brand }>()

type Obj = Record<string, unknown>
const obj = (v: unknown): Obj => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Obj) : {})
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

/** "https://www.coca-colacompany.com/" -> "coca-colacompany.com". */
export function domainFromWebsite(site?: string): string | undefined {
  if (!site) return undefined
  try {
    const host = new URL(/^https?:\/\//i.test(site) ? site : `https://${site}`).hostname.toLowerCase().replace(/^www\./, '')
    return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(host) ? host : undefined
  } catch {
    return undefined
  }
}

export function pickBrand(body: unknown): Brand {
  const d = obj(obj(body).data)
  return {
    name: str(obj(d.price).longName) ?? str(obj(d.price).shortName),
    domain: domainFromWebsite(str(obj(d.assetProfile).website)),
  }
}

/** Brands for up to 60 tickers, four Yahoo requests at a time. */
export async function loadBrands(d: BrandDeps, tickers: string[], now = Date.now()): Promise<Record<string, Brand>> {
  const out: Record<string, Brand> = {}
  const todo: string[] = []
  for (const t of [...new Set(tickers)].slice(0, 60)) {
    const hit = cache.get(t)
    if (hit && now - hit.at < hit.ttl) out[t] = hit.data
    else todo.push(t)
  }
  for (let i = 0; i < todo.length; i += 4) {
    await Promise.all(
      todo.slice(i, i + 4).map(async (t) => {
        try {
          const brand = pickBrand(JSON.parse(await d.fetchText(`${d.yahooUrl}/api/quote-summary/${encodeURIComponent(t)}?modules=price,assetProfile`)))
          cache.set(t, { at: now, ttl: brand.name ? OK_TTL : FAIL_TTL, data: brand })
          out[t] = brand
        } catch {
          cache.set(t, { at: now, ttl: FAIL_TTL, data: {} })
          out[t] = {}
        }
      }),
    )
  }
  while (cache.size > 2000) cache.delete(cache.keys().next().value as string)
  return out
}
