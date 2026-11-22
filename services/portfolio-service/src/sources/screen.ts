import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { round } from '../domain/types.js'
import { parseRating, type Quote } from '../market/yahoo.js'

export interface UniverseStock {
  ticker: string
  match: string[]
}

/** The fixed list of large, liquid companies the screen and the news source choose from. */
export function loadUniverse(): UniverseStock[] {
  const raw = JSON.parse(readFileSync(fileURLToPath(new URL('./universe.json', import.meta.url)), 'utf8').replace(/^\uFEFF/, '')) as { stocks: UniverseStock[] }
  return raw.stocks
}

export interface ScreenPick {
  ticker: string
  score: number
  reasons: {
    price: number
    ma50: number
    ma200: number
    rating: number
    forwardPE: number | null
    pctOf52wHigh: number | null
    checks: string[]
  }
}

/**
 * A plain, explainable rule-based screen (not advice): an uptrend (price above the 200-day average and the 50-day
 * above the 200-day), not stretched (within 15% of the 50-day), analysts at Buy or better (2.5 or lower on Yahoo's
 * 1-5 scale), and a positive forward P/E of 40 or less. Survivors rank by analyst rating, then by closeness to the
 * 52-week high (momentum).
 */
export function screen(quotes: Quote[], opts: { exclude: Set<string>; limit: number }): ScreenPick[] {
  const out: ScreenPick[] = []
  for (const q of quotes) {
    const t = q.symbol
    const price = q.regularMarketPrice
    const ma50 = q.fiftyDayAverage
    const ma200 = q.twoHundredDayAverage
    const rating = parseRating(q.averageAnalystRating)
    if (!t || opts.exclude.has(t) || !price || !ma50 || !ma200 || rating === null) continue
    if (!(price > ma200 && ma50 > ma200)) continue
    if (price > ma50 * 1.15) continue
    if (rating > 2.5) continue
    const fpe = typeof q.forwardPE === 'number' ? q.forwardPE : null
    if (fpe !== null && !(fpe > 0 && fpe <= 40)) continue
    const pctHigh = q.fiftyTwoWeekHigh ? round((price / q.fiftyTwoWeekHigh) * 100, 1) : null
    out.push({
      ticker: t,
      score: round((2.5 - rating) * 10 + (pctHigh ?? 80) / 10, 2),
      reasons: {
        price, ma50, ma200, rating, forwardPE: fpe, pctOf52wHigh: pctHigh,
        checks: [
          'price above its 200-day average (uptrend)',
          '50-day average above the 200-day',
          'within 15% of its 50-day average (not stretched)',
          `analysts rate it ${rating <= 1.5 ? 'Strong Buy' : 'Buy'} (${rating.toFixed(1)} on a 1-5 scale)`,
          fpe === null ? 'no forward P/E available' : `forward P/E ${fpe.toFixed(1)}`,
          pctHigh === null ? '' : `${pctHigh}% of its 52-week high`,
        ].filter(Boolean),
      },
    })
  }
  return out.sort((a, b) => b.score - a.score || a.ticker.localeCompare(b.ticker)).slice(0, opts.limit)
}
