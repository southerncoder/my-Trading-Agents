import type { Pick } from '../../services/portfolio'

// ---------- Weekly review Markdown (a small, safe subset: no HTML is ever injected) ----------

export type MdBlock =
  | { type: 'h'; level: number; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'table'; head: string[]; rows: string[][] }

const cells = (line: string) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())

/** Splits review Markdown into headings, paragraphs, bullet lists and tables. */
export function mdBlocks(md: string): MdBlock[] {
  const out: MdBlock[] = []
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  let para: string[] = []
  const flush = () => {
    if (para.length) out.push({ type: 'p', text: para.join(' ') })
    para = []
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const h = /^(#{1,4})\s+(.*)$/.exec(line)
    if (h) {
      flush()
      out.push({ type: 'h', level: h[1].length, text: h[2].trim() })
    } else if (/^\s*[-*]\s+/.test(line)) {
      flush()
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, '').trim())
      i--
      out.push({ type: 'ul', items })
    } else if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1])) {
      flush()
      const head = cells(line)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(cells(lines[i++]))
      i--
      out.push({ type: 'table', head, rows })
    } else if (!line.trim()) {
      flush()
    } else {
      para.push(line.trim())
    }
  }
  flush()
  return out
}

/** Splits text on **bold** markers: odd indexes are bold. */
export const boldParts = (text: string) => text.split(/\*\*(.+?)\*\*/g)

// ---------- Portfolio vs SPY chart ----------

export interface ChartPoint {
  x: number
  y: number
  date: string
  value: number
}

/** Pixel positions for both index lines (portfolio and SPY, 100 = start) in a w x h box with padding. */
export function chartGeometry(series: { date: string; portfolio: number; spy: number | null }[], w: number, h: number, pad: number) {
  const values = [100, ...series.map((s) => s.portfolio), ...series.flatMap((s) => (s.spy === null ? [] : [s.spy]))]
  let yMin = Math.min(...values)
  let yMax = Math.max(...values)
  const span = Math.max(yMax - yMin, 2)
  yMin -= span * 0.1
  yMax += span * 0.1
  const x = (i: number) => (series.length < 2 ? w / 2 : pad + (i * (w - 2 * pad)) / (series.length - 1))
  const y = (v: number) => pad + ((yMax - v) * (h - 2 * pad)) / (yMax - yMin)
  return {
    yMin,
    yMax,
    y,
    portfolio: series.map((s, i) => ({ x: x(i), y: y(s.portfolio), date: s.date, value: s.portfolio })),
    spy: series.flatMap((s, i) => (s.spy === null ? [] : [{ x: x(i), y: y(s.spy), date: s.date, value: s.spy }])),
  }
}

export const pathOf = (pts: ChartPoint[]) => pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

// ---------- Picks ----------

export const SOURCE_LABEL: Record<string, string> = {
  watchlist: 'Watchlist',
  screen: 'Screen',
  news: 'In the news',
  on_demand: 'You asked',
  reanalysis: 'Re-checked',
}
export const SOURCE_HELP: Record<string, string> = {
  watchlist: 'Stocks on your watchlist, analysed every night.',
  screen: 'Picked by a simple rule-based screen: uptrend, not stretched, analysts at Buy or better, reasonable P/E.',
  news: 'Large companies that showed up in several market headlines today.',
  on_demand: 'Analyses you asked for from this page.',
  reanalysis: 'Fresh looks at positions you hold, asked for by the exit and move rules.',
}
const ORDER = ['watchlist', 'screen', 'news', 'on_demand', 'reanalysis']

export function groupPicks<T extends Pick>(picks: T[]): { source: string; picks: T[] }[] {
  const sources = [...new Set(picks.map((p) => p.source))].sort((a, b) => (ORDER.indexOf(a) + 99) % 99 - (ORDER.indexOf(b) + 99) % 99)
  return sources.map((source) => ({ source, picks: picks.filter((p) => p.source === source) })).filter((g) => g.picks.length > 0)
}

/** What recording this pick would do, or null when it is not a trade (hold, wait, exit). */
export function pickAction(p: Pick): { kind: 'market' | 'trigger'; text: string } | null {
  if (!p.tradeable || !p.kind || !p.direction) return null
  const verb = p.direction === 'long' ? 'Buy' : 'Short'
  if (p.kind === 'market') return { kind: 'market', text: `${verb} now` }
  if (p.trigger_price === null) return null
  return { kind: 'trigger', text: `${verb} if it reaches $${p.trigger_price.toFixed(2)}` }
}

export const ALERT_LABEL: Record<string, string> = {
  stop_hit: 'Stop hit',
  target_hit: 'Target reached',
  max_hold: 'Held long enough',
  sell_call: 'Analysis says sell',
  big_move: 'Big move',
  reanalysis: 'Fresh analysis',
  order_filled: 'Order filled',
  order_expired: 'Order expired',
  order_failed: 'Order failed',
  risk_position: 'Position too big',
  risk_sector: 'Sector too heavy',
  risk_drawdown: 'Down from peak',
}
