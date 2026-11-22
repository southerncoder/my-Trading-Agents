import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { testDb } from '../test/db.js'
import { DEFAULT_RULES } from '../domain/risk.js'
import { UserError } from '../routes/http.js'
import { ackAlert, cancelOrder, createPortfolio, placeTriggerOrder, recordBuy, recordSell, updateRules } from './portfolio-ops.js'

describe('portfolio operations', () => {
  let db: Awaited<ReturnType<typeof testDb>>
  beforeAll(async () => {
    db = await testDb()
  })
  afterAll(async () => db.drop())
  const cash = async (id: number) => (await db.pool.query('SELECT cash FROM portfolios WHERE id=$1', [id])).rows[0].cash as number
  const date = '2026-11-20'

  it('creates a portfolio with the default rules and a first snapshot', async () => {
    const p = await createPortfolio(db.pool, { name: 'Mine', startingCash: 10000, createdOn: date, spyClose: 600 })
    expect(p).toMatchObject({ name: 'Mine', kind: 'owner', cash: 10000, starting_cash: 10000, rules: DEFAULT_RULES })
    expect((await db.pool.query('SELECT equity, spy_close FROM snapshots WHERE portfolio_id=$1', [p.id])).rows).toEqual([{ equity: 10000, spy_close: 600 }])
  })

  it('a buy spends cash, opens a position with an exit plan, and records a filled order and a trade', async () => {
    const p = await createPortfolio(db.pool, { name: 'B', startingCash: 10000, createdOn: date })
    const r = await recordBuy(db.pool, { portfolioId: p.id, ticker: 'KO', direction: 'long', amount: 1000, price: 100, date, walkAway: 95, source: 'watchlist' })
    expect(await cash(p.id)).toBe(9000)
    expect(r.position).toMatchObject({ ticker: 'KO', direction: 'long', quantity: 10, avg_cost: 100, stop_price: 95, target_price: 115, status: 'open', source: 'watchlist' })
    const { rows: orders } = await db.pool.query('SELECT kind, status, fill_price FROM orders WHERE portfolio_id=$1', [p.id])
    expect(orders).toEqual([{ kind: 'market', status: 'filled', fill_price: 100 }])
    const { rows: trades } = await db.pool.query('SELECT action, quantity, price FROM trades WHERE portfolio_id=$1', [p.id])
    expect(trades).toEqual([{ action: 'open', quantity: 10, price: 100 }])

    const again = await recordBuy(db.pool, { portfolioId: p.id, ticker: 'KO', direction: 'long', amount: 1100, price: 110, date })
    expect(again.position).toMatchObject({ quantity: 20, avg_cost: 105, stop_price: 95 })
  })

  it('refuses a buy larger than cash and writes nothing', async () => {
    const p = await createPortfolio(db.pool, { name: 'C', startingCash: 500, createdOn: date })
    await expect(recordBuy(db.pool, { portfolioId: p.id, ticker: 'KO', direction: 'long', amount: 600, price: 100, date })).rejects.toThrow(/Not enough cash/)
    expect(await cash(p.id)).toBe(500)
    expect((await db.pool.query('SELECT count(*)::int n FROM orders WHERE portfolio_id=$1', [p.id])).rows[0].n).toBe(0)
  })

  it('shorting credits cash; covering below the entry realizes a gain', async () => {
    const p = await createPortfolio(db.pool, { name: 'S', startingCash: 5000, createdOn: date })
    const { position } = await recordBuy(db.pool, { portfolioId: p.id, ticker: 'GME', direction: 'short', amount: 1000, price: 20, date })
    expect(position).toMatchObject({ direction: 'short', quantity: 50, stop_price: 21.6, target_price: 17 })
    expect(await cash(p.id)).toBe(6000)
    const closed = await recordSell(db.pool, { portfolioId: p.id, positionId: position.id, price: 18, date: '2026-11-23' })
    expect(closed.position).toMatchObject({ status: 'closed', quantity: 0, realized_pnl: 100, closed_on: '2026-11-23' })
    expect(await cash(p.id)).toBe(5100)
  })

  it('short sale proceeds are not buying power: exposure cannot grow past the money put in', async () => {
    const p = await createPortfolio(db.pool, { name: 'BP', startingCash: 10000, createdOn: date, rules: { max_position_pct: 100, max_sector_pct: 100 } })
    await recordBuy(db.pool, { portfolioId: p.id, ticker: 'AAA', direction: 'short', amount: 10000, price: 50, date })
    expect(await cash(p.id)).toBe(20000)
    await expect(recordBuy(db.pool, { portfolioId: p.id, ticker: 'BBB', direction: 'short', amount: 5000, price: 50, date })).rejects.toThrow(/Not enough cash/)
    await expect(recordBuy(db.pool, { portfolioId: p.id, ticker: 'CCC', direction: 'long', amount: 5000, price: 50, date })).rejects.toThrow(/Not enough cash/)
  })

  it('selling part keeps the rest open; selling more than held is refused', async () => {
    const p = await createPortfolio(db.pool, { name: 'P', startingCash: 5000, createdOn: date })
    const { position } = await recordBuy(db.pool, { portfolioId: p.id, ticker: 'T', direction: 'long', amount: 1000, price: 25, date })
    const part = await recordSell(db.pool, { portfolioId: p.id, positionId: position.id, quantity: 10, price: 30, date })
    expect(part.position).toMatchObject({ status: 'open', quantity: 30, realized_pnl: 50 })
    expect(part.trade).toMatchObject({ action: 'reduce', realized_pnl: 50 })
    await expect(recordSell(db.pool, { portfolioId: p.id, positionId: position.id, quantity: 31, price: 30, date })).rejects.toThrow(/more than/)
  })

  it('refuses to open the opposite direction while a position is open', async () => {
    const p = await createPortfolio(db.pool, { name: 'O', startingCash: 5000, createdOn: date })
    await recordBuy(db.pool, { portfolioId: p.id, ticker: 'F', direction: 'long', amount: 500, price: 10, date })
    await expect(recordBuy(db.pool, { portfolioId: p.id, ticker: 'F', direction: 'short', amount: 500, price: 10, date })).rejects.toThrow(/Close the long/)
  })

  it('a trigger order waits with a direction and an expiry; it can be cancelled once', async () => {
    const p = await createPortfolio(db.pool, { name: 'T', startingCash: 5000, createdOn: date })
    const o = await placeTriggerOrder(db.pool, { portfolioId: p.id, ticker: 'NVDA', direction: 'long', triggerPrice: 130, refPrice: 125, amount: 1000, date })
    expect(o).toMatchObject({ status: 'pending', kind: 'trigger', trigger_when: 'above', expires_on: '2026-12-07', amount: 1000 })
    expect(await cash(p.id)).toBe(5000)
    expect(await cancelOrder(db.pool, p.id, o.id)).toMatchObject({ status: 'cancelled' })
    await expect(cancelOrder(db.pool, p.id, o.id)).rejects.toThrow(/not pending/)
  })

  it('operations on another portfolio’s records are refused as not found', async () => {
    const a = await createPortfolio(db.pool, { name: 'A', startingCash: 5000, createdOn: date })
    const b = await createPortfolio(db.pool, { name: 'B2', startingCash: 5000, createdOn: date })
    const { position } = await recordBuy(db.pool, { portfolioId: a.id, ticker: 'KO', direction: 'long', amount: 100, price: 10, date })
    const err = await recordSell(db.pool, { portfolioId: b.id, positionId: position.id, price: 11, date }).catch((e) => e)
    expect(err).toBeInstanceOf(UserError)
    expect(err.status).toBe(404)
  })

  it('acknowledges an alert and updates rules within limits', async () => {
    const p = await createPortfolio(db.pool, { name: 'R', startingCash: 5000, createdOn: date })
    const { rows: [a] } = await db.pool.query(`INSERT INTO alerts (portfolio_id, ticker, kind, severity, message, run_date) VALUES ($1,'KO','stop_hit','action','m',$2) RETURNING id`, [p.id, date])
    expect((await ackAlert(db.pool, p.id, a.id)).acknowledged_at).toBeTruthy()
    expect((await updateRules(db.pool, p.id, { position_size: 250 })).rules.position_size).toBe(250)
    await expect(updateRules(db.pool, p.id, { max_position_pct: 500 })).rejects.toThrow()
  })
})
