import { round, type Bar, type Direction } from './types.js'

/**
 * Hindsight timing review of one position: was it bought and sold at good moments, judged only by prices that
 * are known now. Pure arithmetic on stored bars, trades and the nightly calls; no model is asked.
 */

export interface TimingTrade {
  action: string
  quantity: number
  price: number
  traded_on: string
}

export interface TimingCall {
  run_date: string
  label: string
  decision: string
  price: number | null
  trigger_price: number | null
}

export interface Point {
  date: string
  price: number
}

export interface TimingReview {
  status: 'open' | 'closed'
  direction: Direction
  firstBuyCall: (Point & { label: string }) | null
  sellCall: (Point & { label: string }) | null
  entry: { avgPrice: number; firstDate: string; shares: number }
  /** Lowest close (highest for a short) from the first buy call to the first buy: the best entry hindsight offers. */
  bestEntry: Point | null
  /** Best and worst closes while held (first buy to the last sale, or the latest close while open). */
  bestWhileHeld: Point | null
  worstWhileHeld: Point | null
  exit: { avgPrice: number; lastDate: string; shares: number } | null
  /** Closes some trading days after the last sale: did the price keep going? */
  after: (Point & { days: number; pctFromSale: number })[]
  latest: Point | null
  lines: { topic: 'entry' | 'exit' | 'after' | 'held'; tone: 'good' | 'bad' | 'neutral'; text: string }[]
}

const BUY_WORDS = /^(buy|add)/i
const SELL_DECISION = 'SELL'
const usd = (n: number) => `$${n.toFixed(2)}`
const pct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
const AFTER_DAYS = [5, 10, 20]

export function timingReview(a: { direction: Direction; status: 'open' | 'closed'; trades: TimingTrade[]; calls: TimingCall[]; bars: Bar[] }): TimingReview | null {
  const trades = [...a.trades].sort((x, y) => x.traded_on.localeCompare(y.traded_on))
  const buys = trades.filter((t) => t.action === 'open' || t.action === 'add')
  const sells = trades.filter((t) => t.action === 'close' || t.action === 'reduce')
  if (!buys.length) return null
  const s = a.direction === 'short' ? -1 : 1
  const bars = [...a.bars].sort((x, y) => x.date.localeCompare(y.date))
  const weighted = (ts: TimingTrade[]) => {
    const q = ts.reduce((n, t) => n + t.quantity, 0)
    return { q, avg: q > 0 ? ts.reduce((n, t) => n + t.quantity * t.price, 0) / q : 0 }
  }
  const b = weighted(buys)
  const firstBuy = buys[0].traded_on
  const lastSale = a.status === 'closed' && sells.length ? sells[sells.length - 1].traded_on : null

  // The run of buy-type calls that led to the first buy: the earliest one with no sell call between it and the buy.
  const isBuyCall = (c: TimingCall) => (s === 1 ? BUY_WORDS.test(c.label) || c.decision === 'BUY' : c.decision === SELL_DECISION)
  const isSellCall = (c: TimingCall) => (s === 1 ? c.decision === SELL_DECISION : c.decision === 'BUY')
  let firstBuyCall: TimingReview['firstBuyCall'] = null
  for (const c of a.calls.filter((c) => c.run_date < firstBuy).sort((x, y) => y.run_date.localeCompare(x.run_date))) {
    if (isSellCall(c)) break
    if (isBuyCall(c) && c.price) firstBuyCall = { date: c.run_date, price: c.price, label: c.label }
  }
  const sellCalls = lastSale ? a.calls.filter((c) => isSellCall(c) && c.run_date >= firstBuy && c.run_date <= lastSale) : []
  const sc = sellCalls[0]
  const sellCall = sc && sc.price ? { date: sc.run_date, price: sc.price, label: sc.label } : null

  const better = (p: number, q: number) => s * (p - q) > 0 // q is a better entry than p for this direction (lower for longs)
  const pick = (from: string, to: string, best: boolean) => {
    let out: Point | null = null
    for (const x of bars) {
      if (x.date < from || x.date > to) continue
      if (!out) out = { date: x.date, price: x.close }
      else if (best ? s * (x.close - out.price) > 0 : s * (x.close - out.price) < 0) out = { date: x.date, price: x.close }
    }
    return out
  }
  const lowest = (from: string, to: string) => {
    let out: Point | null = null
    for (const x of bars) if (x.date >= from && x.date <= to && (!out || better(out.price, x.close))) out = { date: x.date, price: x.close }
    return out
  }
  const bestEntry = firstBuyCall ? lowest(firstBuyCall.date, firstBuy) : null
  const end = lastSale ?? bars[bars.length - 1]?.date ?? firstBuy
  const bestWhileHeld = pick(firstBuy, end, true)
  const worstWhileHeld = pick(firstBuy, end, false)
  const latestBar = bars[bars.length - 1]
  const latest = latestBar ? { date: latestBar.date, price: latestBar.close } : null

  const sold = lastSale ? weighted(sells) : null
  const exit = sold && lastSale ? { avgPrice: round(sold.avg, 4), lastDate: lastSale, shares: sold.q } : null
  const after: TimingReview['after'] = []
  if (exit && lastSale) {
    const later = bars.filter((x) => x.date > lastSale)
    for (const d of AFTER_DAYS) {
      const x = later[d - 1]
      if (x) after.push({ days: d, date: x.date, price: x.close, pctFromSale: round(((x.close - exit.avgPrice) / exit.avgPrice) * 100, 2) })
    }
  }

  const lines: TimingReview['lines'] = []
  const gainWord = s === 1 ? 'cheaper' : 'higher'
  if (firstBuyCall && firstBuyCall.date < firstBuy) {
    const diff = ((b.avg - firstBuyCall.price) / firstBuyCall.price) * 100
    const good = s * diff <= 0
    lines.push({
      topic: 'entry',
      tone: Math.abs(diff) < 0.5 ? 'neutral' : good ? 'good' : 'bad',
      text: `The first ${firstBuyCall.label.toLowerCase()} call came on ${firstBuyCall.date} at ${usd(firstBuyCall.price)}; waiting until ${firstBuy} paid ${usd(b.avg)}, ${pct(diff)} ${good ? '(waiting helped)' : '(buying at the first call would have been better)'}.`,
    })
  }
  if (bestEntry && better(b.avg, bestEntry.price) && Math.abs(bestEntry.price - b.avg) / b.avg > 0.002) {
    const gap = ((b.avg - bestEntry.price) / bestEntry.price) * 100 * s
    lines.push({
      topic: 'entry',
      tone: gap < 1.5 ? 'neutral' : 'bad',
      text: `Best entry in hindsight: ${usd(bestEntry.price)} close on ${bestEntry.date}, ${Math.abs(gap).toFixed(1)}% ${gainWord} than the price paid.`,
    })
  } else if (firstBuyCall) {
    lines.push({ topic: 'entry', tone: 'good', text: `No close between the first buy call and the purchase was ${gainWord} than the price paid: the entry was as good as hindsight allows.` })
  }

  if (exit && bestWhileHeld) {
    const missed = ((bestWhileHeld.price - exit.avgPrice) / exit.avgPrice) * 100 * s
    const missedUsd = (bestWhileHeld.price - exit.avgPrice) * exit.shares * s
    const pnl = (exit.avgPrice - b.avg) * exit.shares * s
    lines.push({
      topic: 'exit',
      tone: pnl >= 0 ? 'good' : 'bad',
      text: `Sold ${exit.shares} share${exit.shares === 1 ? '' : 's'} at ${usd(exit.avgPrice)} on ${exit.lastDate}${sellCall ? `, after the ${sellCall.label} call of ${sellCall.date}` : ''}: ${pnl >= 0 ? 'a gain' : 'a loss'} of ${usd(Math.abs(pnl))} (${pct(((exit.avgPrice - b.avg) / b.avg) * 100 * s)}).`,
    })
    if (missed > 0.5) {
      lines.push({
        topic: 'exit',
        tone: missed < 2 ? 'neutral' : 'bad',
        text: `The best close while held was ${usd(bestWhileHeld.price)} on ${bestWhileHeld.date}: selling then would have made ${usd(missedUsd)} more (${missed.toFixed(1)}%). Selling ${bestWhileHeld.date < exit.lastDate ? 'earlier' : 'later'} would have been better.`,
      })
    } else {
      lines.push({ topic: 'exit', tone: 'good', text: 'It was sold within half a percent of the best close while it was held.' })
    }
  }
  if (exit) {
    if (!after.length) lines.push({ topic: 'after', tone: 'neutral', text: 'Too few trading days since the sale to say whether it was early or late.' })
    for (const x of after) {
      const kept = x.pctFromSale * s
      lines.push({
        topic: 'after',
        tone: Math.abs(kept) < 1 ? 'neutral' : kept > 0 ? 'bad' : 'good',
        text: `${x.days} trading days after the sale (${x.date}) it closed at ${usd(x.price)}, ${pct(x.pctFromSale)}: ${Math.abs(kept) < 1 ? 'about where it was sold' : kept > 0 ? 'the sale was early; holding longer would have paid' : 'the sale avoided that fall'}.`,
      })
    }
  } else if (latest && bestWhileHeld && worstWhileHeld) {
    const now = ((latest.price - b.avg) / b.avg) * 100 * s
    lines.push({
      topic: 'held',
      tone: now >= 0 ? 'good' : 'bad',
      text: `Still held: ${pct(now)} since bought at ${usd(b.avg)}. Best close so far ${usd(bestWhileHeld.price)} (${bestWhileHeld.date}), worst ${usd(worstWhileHeld.price)} (${worstWhileHeld.date}).`,
    })
  }

  return {
    status: a.status,
    direction: a.direction,
    firstBuyCall,
    sellCall,
    entry: { avgPrice: round(b.avg, 4), firstDate: firstBuy, shares: b.q },
    bestEntry,
    bestWhileHeld,
    worstWhileHeld,
    exit,
    after,
    latest,
    lines,
  }
}
