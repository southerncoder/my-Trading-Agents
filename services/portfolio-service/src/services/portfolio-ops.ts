import type pg from 'pg'
import { tx, type Db } from '../db/pool.js'
import { applyClose, applyOpen, cashDelta, valuation } from '../domain/accounting.js'
import { addTradingDays } from '../domain/calendar.js'
import { exitPlan } from '../domain/exits.js'
import { quantityFor, triggerWhen } from '../domain/fills.js'
import { parseRules, preTradeCheck, type Rules } from '../domain/risk.js'
import { round, type Direction } from '../domain/types.js'
import { UserError } from '../routes/http.js'

export interface PortfolioRow {
  id: number
  name: string
  kind: 'owner' | 'shadow'
  starting_cash: number
  cash: number
  rules: Rules
  created_on: string
  archived: boolean
}

export interface PositionRow {
  id: number
  portfolio_id: number
  ticker: string
  direction: Direction
  quantity: number
  avg_cost: number
  opened_on: string
  closed_on: string | null
  status: 'open' | 'closed'
  source: string | null
  candidate_id: number | null
  stop_price: number | null
  target_price: number | null
  hold_until: string | null
  realized_pnl: number
  sector: string | null
}

export async function getPortfolio(db: Db, id: number, forUpdate = false): Promise<PortfolioRow> {
  const { rows } = await db.query<PortfolioRow>(`SELECT * FROM portfolios WHERE id = $1${forUpdate ? ' FOR UPDATE' : ''}`, [id])
  if (!rows[0]) throw new UserError('Portfolio not found', 404)
  return { ...rows[0], rules: parseRules(rows[0].rules) }
}

export async function createPortfolio(
  pool: pg.Pool,
  a: { name: string; startingCash: number; createdOn: string; kind?: 'owner' | 'shadow'; rules?: Partial<Rules>; spyClose?: number | null },
): Promise<PortfolioRow> {
  const rules = parseRules(a.rules ?? {})
  return tx(pool, async (db) => {
    const { rows } = await db.query<PortfolioRow>(
      `INSERT INTO portfolios (name, kind, starting_cash, cash, rules, created_on) VALUES ($1,$2,$3,$3,$4,$5) RETURNING *`,
      [a.name, a.kind ?? 'owner', a.startingCash, JSON.stringify(rules), a.createdOn],
    )
    await db.query(
      `INSERT INTO snapshots (portfolio_id, date, cash, long_value, short_value, equity, spy_close) VALUES ($1,$2,$3,0,0,$3,$4)`,
      [rows[0].id, a.createdOn, a.startingCash, a.spyClose ?? null],
    )
    return { ...rows[0], rules }
  })
}

/**
 * What the portfolio can still put to work. Each open short holds back twice its entry value: the sale proceeds
 * (owed back) and equal collateral (a short must be fully covered by cash). So $10,000 can short at most $10,000.
 */
export function buyingPower(cash: number, open: { direction: string; quantity: number; avg_cost: number }[]): number {
  return round(cash - 2 * open.filter((x) => x.direction === 'short').reduce((s, x) => s + x.quantity * x.avg_cost, 0))
}

export interface OpenArgs {
  portfolioId: number
  ticker: string
  direction: Direction
  price: number
  date: string
  /** Dollars to put in; quantity is derived from it. */
  amount?: number
  quantity?: number
  walkAway?: number | null
  source?: string | null
  candidateId?: number | null
  /** An existing pending order being filled; when absent a filled market order is recorded. */
  orderId?: number | null
  sector?: string | null
  note?: string | null
}

/**
 * Opens or adds to a position inside a transaction: checks cash and the position cap, moves cash, records the
 * trade (and a filled market order when there was no pending one). The first fill sets the exit plan.
 */
export async function openInTx(db: Db, a: OpenArgs) {
  const p = await getPortfolio(db, a.portfolioId, true)
  const quantity = a.quantity ?? quantityFor(a.amount ?? 0, a.price)
  const amount = round(quantity * a.price)
  const { rows: open } = await db.query<PositionRow>(`SELECT * FROM positions WHERE portfolio_id = $1 AND status = 'open' FOR UPDATE`, [p.id])
  const opposite = open.find((x) => x.ticker === a.ticker && x.direction !== a.direction)
  if (opposite) throw new UserError(`Close the ${opposite.direction} position in ${a.ticker} before opening a ${a.direction} one`)
  const marks = Object.fromEntries(open.map((x) => [x.ticker, x.avg_cost]))
  const { equity } = valuation(p.cash, open.map((x) => ({ ticker: x.ticker, direction: x.direction, quantity: x.quantity, avgCost: x.avg_cost })), marks)
  const sector = a.sector ?? null
  const check = preTradeCheck({
    // Short sale proceeds sit in cash but are owed back: they are not buying power.
    cash: buyingPower(p.cash, open), equity, amount: a.amount ?? amount, ticker: a.ticker, rules: p.rules,
    openTickers: [...new Set(open.map((x) => x.ticker))],
    tickerValue: open.filter((x) => x.ticker === a.ticker).reduce((s, x) => s + x.quantity * x.avg_cost, 0),
    sector,
    sectorValue: sector ? open.filter((x) => x.sector === sector).reduce((s, x) => s + x.quantity * x.avg_cost, 0) : 0,
  })
  if (!check.ok) throw new UserError(check.error ?? 'Order refused')

  const existing = open.find((x) => x.ticker === a.ticker && x.direction === a.direction) ?? null
  const next = applyOpen(existing ? { direction: existing.direction, quantity: existing.quantity, avgCost: existing.avg_cost } : null, { direction: a.direction, quantity, price: a.price })
  let position: PositionRow
  if (existing) {
    position = (await db.query<PositionRow>(`UPDATE positions SET quantity = $2, avg_cost = $3 WHERE id = $1 RETURNING *`, [existing.id, next.quantity, next.avgCost])).rows[0]
  } else {
    const plan = exitPlan({ direction: a.direction, entry: a.price, walkAway: a.walkAway ?? null, rules: p.rules, openedOn: a.date })
    position = (
      await db.query<PositionRow>(
        `INSERT INTO positions (portfolio_id, ticker, direction, quantity, avg_cost, opened_on, source, candidate_id, stop_price, target_price, hold_until, sector)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
        [p.id, a.ticker, a.direction, next.quantity, next.avgCost, a.date, a.source ?? null, a.candidateId ?? null, plan.stop, plan.target, plan.holdUntil, sector],
      )
    ).rows[0]
  }
  let orderId = a.orderId ?? null
  if (orderId) {
    await db.query(`UPDATE orders SET status = 'filled', filled_on = $2, fill_price = $3, position_id = $4 WHERE id = $1`, [orderId, a.date, a.price, position.id])
  } else {
    orderId = (
      await db.query<{ id: number }>(
        `INSERT INTO orders (portfolio_id, candidate_id, position_id, ticker, direction, intent, kind, amount, status, created_on, filled_on, fill_price, source, note)
         VALUES ($1,$2,$3,$4,$5,'open','market',$6,'filled',$7,$7,$8,$9,$10) RETURNING id`,
        [p.id, a.candidateId ?? null, position.id, a.ticker, a.direction, amount, a.date, a.price, a.source ?? null, a.note ?? null],
      )
    ).rows[0].id
  }
  const trade = (
    await db.query(
      `INSERT INTO trades (portfolio_id, position_id, order_id, ticker, direction, action, quantity, price, traded_on, source, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [p.id, position.id, orderId, a.ticker, a.direction, existing ? 'add' : 'open', quantity, a.price, a.date, a.source ?? position.source, a.note ?? null],
    )
  ).rows[0]
  await db.query(`UPDATE portfolios SET cash = cash + $2 WHERE id = $1`, [p.id, cashDelta(a.direction, 'open', quantity, a.price)])
  return { position, trade, warnings: check.warnings }
}

/** Closes all or part of a position inside a transaction and books the realized profit or loss. */
export async function closeInTx(db: Db, a: { portfolioId: number; positionId: number; price: number; date: string; quantity?: number; orderId?: number | null; note?: string | null }) {
  await getPortfolio(db, a.portfolioId, true)
  const { rows } = await db.query<PositionRow>(`SELECT * FROM positions WHERE id = $1 AND portfolio_id = $2 FOR UPDATE`, [a.positionId, a.portfolioId])
  const pos = rows[0]
  if (!pos) throw new UserError('Position not found', 404)
  if (pos.status !== 'open') throw new UserError('That position is already closed')
  const quantity = a.quantity ?? pos.quantity
  let result
  try {
    result = applyClose({ direction: pos.direction, quantity: pos.quantity, avgCost: pos.avg_cost }, quantity, a.price)
  } catch (e) {
    throw new UserError((e as Error).message)
  }
  const done = result.position.quantity <= 1e-9
  const position = (
    await db.query<PositionRow>(
      `UPDATE positions SET quantity = $2, realized_pnl = realized_pnl + $3, status = $4, closed_on = $5 WHERE id = $1 RETURNING *`,
      [pos.id, done ? 0 : result.position.quantity, result.realized, done ? 'closed' : 'open', done ? a.date : null],
    )
  ).rows[0]
  let orderId = a.orderId ?? null
  if (orderId) {
    await db.query(`UPDATE orders SET status = 'filled', filled_on = $2, fill_price = $3 WHERE id = $1`, [orderId, a.date, a.price])
  } else {
    orderId = (
      await db.query<{ id: number }>(
        `INSERT INTO orders (portfolio_id, position_id, ticker, direction, intent, kind, quantity, status, created_on, filled_on, fill_price, source, note)
         VALUES ($1,$2,$3,$4,'close','market',$5,'filled',$6,$6,$7,$8,$9) RETURNING id`,
        [a.portfolioId, pos.id, pos.ticker, pos.direction, quantity, a.date, a.price, pos.source, a.note ?? null],
      )
    ).rows[0].id
  }
  const trade = (
    await db.query(
      `INSERT INTO trades (portfolio_id, position_id, order_id, ticker, direction, action, quantity, price, traded_on, source, realized_pnl, note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [a.portfolioId, pos.id, orderId, pos.ticker, pos.direction, done ? 'close' : 'reduce', quantity, a.price, a.date, pos.source, result.realized, a.note ?? null],
    )
  ).rows[0]
  await db.query(`UPDATE portfolios SET cash = cash + $2 WHERE id = $1`, [a.portfolioId, cashDelta(pos.direction, 'close', quantity, a.price)])
  return { position, trade, realized: result.realized }
}

export const recordBuy = (pool: pg.Pool, a: OpenArgs) => tx(pool, (db) => openInTx(db, a))

export const recordSell = (pool: pg.Pool, a: Parameters<typeof closeInTx>[1]) => tx(pool, (db) => closeInTx(db, a))

/** A pending order that opens a position when the price reaches the trigger (checked each night on daily bars). */
export async function placeTriggerOrder(
  pool: pg.Pool,
  a: { portfolioId: number; ticker: string; direction: Direction; triggerPrice: number; refPrice: number; amount: number; date: string; candidateId?: number | null; source?: string | null; note?: string | null },
) {
  return tx(pool, async (db) => {
    const p = await getPortfolio(db, a.portfolioId, true)
    if (!(a.triggerPrice > 0) || !(a.refPrice > 0)) throw new UserError('Trigger and reference prices must be positive')
    const { rows: open } = await db.query<PositionRow>(`SELECT * FROM positions WHERE portfolio_id = $1 AND status = 'open'`, [p.id])
    const power = buyingPower(p.cash, open)
    if (a.amount > power + 1e-6) throw new UserError(`Not enough cash: this needs $${a.amount.toFixed(2)} and the portfolio has $${power.toFixed(2)} to spend`)
    const { rows } = await db.query(
      `INSERT INTO orders (portfolio_id, candidate_id, ticker, direction, intent, kind, trigger_price, trigger_when, amount, status, created_on, expires_on, source, note)
       VALUES ($1,$2,$3,$4,'open','trigger',$5,$6,$7,'pending',$8,$9,$10,$11) RETURNING *`,
      [p.id, a.candidateId ?? null, a.ticker, a.direction, a.triggerPrice, triggerWhen(a.triggerPrice, a.refPrice), a.amount, a.date,
        addTradingDays(a.date, p.rules.order_expiry_days), a.source ?? null, a.note ?? null],
    )
    return rows[0]
  })
}

export async function cancelOrder(pool: pg.Pool, portfolioId: number, orderId: number) {
  const { rows } = await pool.query(`UPDATE orders SET status = 'cancelled' WHERE id = $1 AND portfolio_id = $2 AND status = 'pending' RETURNING *`, [orderId, portfolioId])
  if (rows[0]) return rows[0]
  const exists = await pool.query('SELECT 1 FROM orders WHERE id = $1 AND portfolio_id = $2', [orderId, portfolioId])
  throw exists.rows[0] ? new UserError('That order is not pending') : new UserError('Order not found', 404)
}

export async function ackAlert(pool: pg.Pool, portfolioId: number, alertId: number) {
  const { rows } = await pool.query(
    `UPDATE alerts SET acknowledged_at = COALESCE(acknowledged_at, now()) WHERE id = $1 AND portfolio_id = $2 RETURNING *`,
    [alertId, portfolioId],
  )
  if (!rows[0]) throw new UserError('Alert not found', 404)
  return rows[0]
}

export async function updateRules(pool: pg.Pool, portfolioId: number, partial: Partial<Rules>) {
  return tx(pool, async (db) => {
    const p = await getPortfolio(db, portfolioId, true)
    const rules = parseRules({ ...p.rules, ...partial })
    await db.query('UPDATE portfolios SET rules = $2 WHERE id = $1', [p.id, JSON.stringify(rules)])
    return { ...p, rules }
  })
}
