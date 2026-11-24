/** Reading figures and citations out of the analysts' write-ups, only where the text states them plainly. */

export const SOURCES = ['market', 'fundamentals', 'news', 'social'] as const
export type Source = (typeof SOURCES)[number]

/** Tags the debate and risk stages use to cite a report, e.g. "91.81 [market]". */
export const CITE = /\[(market|fundamentals|news|social|research|bull|bear)\]/gi

/** How many times a write-up cites each analyst report. */
export function citations(text: string): Record<Source, number> {
  const out: Record<Source, number> = { market: 0, fundamentals: 0, news: 0, social: 0 }
  for (const m of text.matchAll(CITE)) {
    const k = m[1].toLowerCase() as Source
    if (k in out) out[k]++
  }
  return out
}

const num = (s: string) => {
  const m = s.replace(/,/g, '').trim().match(/^(-?[\d.]+)\s*([KMB])?$/i)
  if (!m) return NaN
  const mult = { K: 1e3, M: 1e6, B: 1e9 }[(m[2] ?? '').toUpperCase() as 'K' | 'M' | 'B'] ?? 1
  return Number(m[1]) * mult
}

export interface MarketFigures {
  rsi?: number
  atr?: number
  atrPct?: number
  volume?: number
  avgVolume?: number
}

/** RSI(14), ATR(14) and today's volume against its 3-month average, when the market report states them. */
export function marketFigures(text: string): MarketFigures {
  const out: MarketFigures = {}
  const rsi = text.match(/RSI\s*\(?14\)?[^0-9\n-]{0,15}(\d{1,3}(?:\.\d+)?)/i)
  if (rsi && Number(rsi[1]) <= 100) out.rsi = Number(rsi[1])
  const atr = text.match(/ATR\s*\(?14\)?\s*([\d.]+)\s*\(([\d.]+)%\s*of price\)/i)
  if (atr) {
    out.atr = Number(atr[1])
    out.atrPct = Number(atr[2])
  }
  // "volume ... 29,988,173 ... 3-month average of 16,997,837" or "volume (8.71M) ... average (7.25M)".
  const N = String.raw`(\d[\d,]*(?:\.\d+)?\s*[KMB]?)(?!\d|[.,\-/]\d)`
  const vol = text.match(new RegExp(String.raw`volume[^\n]{0,80}?(?:was|of|at|\()\s*\**${N}[^\n]{0,80}?(?:3-month|three-month|average)[^\n\d]{0,30}${N}`, 'i'))
  if (vol) {
    const v = num(vol[1])
    const a = num(vol[2])
    // A ratio outside 1:20 means the wording was misread, so nothing is shown.
    if (v > 0 && a > 0 && v / a < 20 && v / a > 0.05) {
      out.volume = v
      out.avgVolume = a
    }
  }
  return out
}

/** The SentiSense-style sentiment score (−100 to +100) the social report states. */
export function sentimentScore(text: string): number | undefined {
  const m = text.match(/Sentiment Score[^\d\n−-]{0,12}([−-]?\d{1,3}(?:\.\d+)?)/i)
  if (!m) return undefined
  const v = Number(m[1].replace('−', '-'))
  return Math.abs(v) <= 100 ? v : undefined
}

export type Token = { kind: 'text' | 'money' | 'pct' | 'cite'; text: string; source?: string }

const TOKEN = /(\[(?:market|fundamentals|news|social|research|bull|bear)\])|([−+-]?\$\d[\d,]*(?:\.\d+)?\s?(?:billion|million|[BMK])?\b)|([−+-]?\d+(?:\.\d+)?%)/gi

/** Splits text into plain runs, money, percentages and citation tags. */
export function tokenize(text: string): Token[] {
  const out: Token[] = []
  let last = 0
  for (const m of text.matchAll(TOKEN)) {
    const i = m.index ?? 0
    if (i > last) out.push({ kind: 'text', text: text.slice(last, i) })
    if (m[1]) out.push({ kind: 'cite', text: m[1], source: m[1].slice(1, -1).toLowerCase() })
    else if (m[2]) out.push({ kind: 'money', text: m[2] })
    else out.push({ kind: 'pct', text: m[3] })
    last = i + m[0].length
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) })
  return out
}
