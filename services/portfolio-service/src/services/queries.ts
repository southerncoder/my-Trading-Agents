import type { Db } from '../db/pool.js'
import { valuation } from '../domain/accounting.js'
import { positionReturn, summarize, type SnapshotPoint } from '../domain/performance.js'
import { round } from '../domain/types.js'
import { getPortfolio, type PortfolioRow, type PositionRow } from './portfolio-ops.js'

/** Latest stored close per ticker on or before a date (from the nightly bars). */
export async function latestMarks(db: Db, tickers: string[], onOrBefore: string): Promise<Record<string, { close: number; date: string }>> {
  if (!tickers.length) return {}
  const { rows } = await db.query<{ ticker: string; close: number; date: string }>(
    `SELECT DISTINCT ON (ticker) ticker, close, date FROM bars WHERE ticker = ANY($1) AND date <= $2 ORDER BY ticker, date DESC`,
    [tickers, onOrBefore],
  )
  return Object.fromEntries(rows.map((r) => [r.ticker, { close: r.close, date: r.date }]))
}

export interface PositionView extends PositionRow {
  mark: number
  mark_date: string | null
  market_value: number
  unrealized: number
  returnPct: number
  educational_review: Record<string, string> | null
}

export async function positionsView(db: Db, portfolioId: number, status: 'open' | 'closed' | 'all', asOf: string): Promise<PositionView[]> {
  const where = status === 'all' ? '' : `AND p.status = '${status === 'open' ? 'open' : 'closed'}'`
  const { rows } = await db.query<PositionRow & { educational_review: Record<string, string> | null }>(
    `SELECT p.*, c.educational_review
     FROM positions p
     LEFT JOIN candidates c ON c.id = p.candidate_id
     WHERE p.portfolio_id = $1 ${where}
     ORDER BY p.status, p.opened_on DESC, p.id DESC`,
    [portfolioId],
  )
  const marks = await latestMarks(db, [...new Set(rows.map((r) => r.ticker))], asOf)
  const exits = new Map<number, number>()
  if (rows.some((r) => r.status === 'closed')) {
    const { rows: t } = await db.query<{ position_id: number; price: number }>(
      `SELECT DISTINCT ON (position_id) position_id, price FROM trades WHERE portfolio_id = $1 AND action = 'close' ORDER BY position_id, id DESC`,
      [portfolioId],
    )
    for (const x of t) exits.set(x.position_id, x.price)
  }
  return rows.map((p) => {
    const m = p.status === 'closed' ? exits.get(p.id) ?? p.avg_cost : marks[p.ticker]?.close ?? p.avg_cost
    const sign = p.direction === 'long' ? 1 : -1
    return {
      ...p,
      mark: m,
      mark_date: p.status === 'closed' ? p.closed_on : marks[p.ticker]?.date ?? null,
      market_value: round(p.quantity * m),
      unrealized: p.status === 'open' ? round(sign * (m - p.avg_cost) * p.quantity) : 0,
      returnPct: round(positionReturn(p.direction, p.avg_cost, m), 2),
      educational_review: p.educational_review,
    }
  })
}

export async function snapshots(db: Db, portfolioId: number): Promise<SnapshotPoint[]> {
  return (await db.query<SnapshotPoint>(`SELECT date, equity, spy_close FROM snapshots WHERE portfolio_id = $1 ORDER BY date`, [portfolioId])).rows
}

/** A portfolio with live numbers: equity at the latest stored closes, return, SPY over the same span, counts. */
export async function portfolioSummary(db: Db, p: PortfolioRow, asOf: string) {
  const open = await positionsView(db, p.id, 'open', asOf)
  const v = valuation(p.cash, open.map((x) => ({ ticker: x.ticker, direction: x.direction, quantity: x.quantity, avgCost: x.avg_cost })), Object.fromEntries(open.map((x) => [x.ticker, x.mark])))
  const s = summarize(await snapshots(db, p.id), p.starting_cash)
  const counts = (
    await db.query<{ alerts: number; orders: number }>(
      `SELECT (SELECT count(*) FROM alerts WHERE portfolio_id = $1 AND acknowledged_at IS NULL)::int AS alerts,
              (SELECT count(*) FROM orders WHERE portfolio_id = $1 AND status = 'pending')::int AS orders`,
      [p.id],
    )
  ).rows[0]
  return {
    ...p,
    equity: v.equity,
    longValue: v.longValue,
    shortValue: v.shortValue,
    returnPct: round((v.equity / p.starting_cash - 1) * 100, 2),
    spyReturnPct: s.spyReturnPct,
    maxDrawdownPct: s.maxDrawdownPct,
    openPositions: open.length,
    openAlerts: counts.alerts,
    pendingOrders: counts.orders,
  }
}

export async function portfolioSummaryById(db: Db, id: number, asOf: string) {
  return portfolioSummary(db, await getPortfolio(db, id), asOf)
}
