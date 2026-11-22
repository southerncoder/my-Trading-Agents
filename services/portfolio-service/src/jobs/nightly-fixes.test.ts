import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Bar } from '../domain/types.js'
import type { Market } from '../market/yahoo.js'
import { createPortfolio, recordBuy } from '../services/portfolio-ops.js'
import { upsertCandidate } from '../store/candidates.js'
import { testDb } from '../test/db.js'
import { runNightly } from './nightly.js'

const b = (date: string, open: number, high: number, low: number, close: number): Bar => ({ date, open, high, low, close })
const BARS: Record<string, Bar[]> = {
  SPY: [b('2026-11-20', 600, 601, 599, 600), b('2026-11-23', 600, 602, 599, 601), b('2026-11-24', 601, 602, 600, 601)],
  AAPL: [b('2026-11-20', 99, 101, 98, 100), b('2026-11-23', 101, 103, 100, 102), b('2026-11-24', 97, 98, 96, 97)],
  MSFT: [b('2026-11-20', 199, 201, 198, 200), b('2026-11-23', 200, 202, 199, 201), b('2026-11-24', 201, 202, 200, 201)],
  NFLX: [b('2026-11-20', 49, 51, 48, 50), b('2026-11-23', 50, 51, 49, 50), b('2026-11-24', 50, 51, 49, 50)],
  XYZ: [b('2026-11-20', 100, 101, 99, 100), b('2026-11-23', 95, 96, 90, 91), b('2026-11-24', 91, 92, 89, 90)],
}
const market: Market = {
  async bars(t, from, to) {
    return (BARS[t] ?? []).filter((x) => x.date >= from && x.date <= to)
  },
  async quotes() {
    return []
  },
  async profile() {
    return { name: null, sector: null }
  },
}
const line = (o: Record<string, unknown>) =>
  JSON.stringify({ group: 'core', confidence: 0.6, walk_away: null, trigger_price: null, pm: { rationale: 'r' }, ...o })

describe('nightly job after review: point-in-time shadow, idempotent re-runs, alerts once', () => {
  let db: Awaited<ReturnType<typeof testDb>>
  let ledger: string
  let owner: number
  const run = (date: string) => runNightly({ pool: db.pool, market, ledgerPath: ledger }, date)
  const counts = async () =>
    Promise.all(['orders', 'trades', 'positions', 'alerts', 'analysis_requests'].map(async (t) => (await db.pool.query(`SELECT count(*)::int n FROM ${t}`)).rows[0].n as number))
  const shadowId = async () => (await db.pool.query(`SELECT id FROM portfolios WHERE kind = 'shadow'`)).rows[0].id as number

  beforeAll(async () => {
    db = await testDb()
    ledger = join(mkdtempSync(join(tmpdir(), 'fixes-')), 'decisions.jsonl')
    writeFileSync(
      ledger,
      [
        line({ date: '2026-11-20', ticker: 'AAPL', decision: 'BUY', action_now: 'enter_now', label: 'Buy now', price: 100 }),
        line({ date: '2026-11-20', ticker: 'MSFT', decision: 'BUY', action_now: 'enter_now', label: 'Buy now', price: 200 }),
        line({ date: '2026-11-20', ticker: 'NFLX', decision: 'HOLD', action_now: 'wait_for_trigger', label: 'Buy if price reaches trigger', price: 50, trigger_price: 55 }),
        line({ date: '2026-11-23', ticker: 'AAPL', decision: 'SELL', action_now: 'enter_now', label: 'Short (bet price falls)', price: 102 }),
      ].join('\n') + '\n',
    )
    owner = (await createPortfolio(db.pool, { name: 'Mine', startingCash: 10000, createdOn: '2026-11-20' })).id
    await recordBuy(db.pool, { portfolioId: owner, ticker: 'XYZ', direction: 'long', amount: 1000, price: 100, date: '2026-11-20' })
  })
  afterAll(async () => db.drop())

  it('night 1: the shadow does not trade at a price it could not get; its market picks wait for the next open', async () => {
    await run('2026-11-20')
    const sid = await shadowId()
    expect((await db.pool.query(`SELECT count(*)::int n FROM positions WHERE portfolio_id = $1`, [sid])).rows[0].n).toBe(0)
    const orders = (await db.pool.query(`SELECT ticker, kind, status FROM orders WHERE portfolio_id = $1 ORDER BY ticker`, [sid])).rows
    expect(orders).toEqual([
      { ticker: 'AAPL', kind: 'market', status: 'pending' },
      { ticker: 'MSFT', kind: 'market', status: 'pending' },
      { ticker: 'NFLX', kind: 'trigger', status: 'pending' },
    ])
  })

  it('re-running night 1 adds no orders (trigger picks included)', async () => {
    const before = await counts()
    await run('2026-11-20')
    expect(await counts()).toEqual(before)
  })

  it('night 2: market picks fill at the open; a SELL call queues a close for the next open instead of selling at tonight’s close; no flip into a short', async () => {
    await upsertCandidate(db.pool, { date: '2026-11-23', ticker: 'MSFT', decision: 'SELL', confidence: 0.7, action_now: 'exit', label: 'Exit', price: 201 }, 'on_demand')
    await run('2026-11-23')
    const sid = await shadowId()
    const pos = (await db.pool.query(`SELECT ticker, avg_cost, status, direction FROM positions WHERE portfolio_id = $1 ORDER BY ticker`, [sid])).rows
    expect(pos).toEqual([
      { ticker: 'AAPL', avg_cost: 101, status: 'open', direction: 'long' },
      { ticker: 'MSFT', avg_cost: 200, status: 'open', direction: 'long' },
    ])
    const closes = (await db.pool.query(`SELECT ticker FROM orders WHERE portfolio_id = $1 AND intent = 'close' AND status = 'pending'`, [sid])).rows
    // AAPL: the nightly call says SELL. MSFT: only the owner's on-demand analysis says SELL, which the shadow ignores.
    expect(closes).toEqual([{ ticker: 'AAPL' }])
  })

  it('re-running night 2 opens nothing new (no short after the exit) and queues nothing twice', async () => {
    const before = await counts()
    await run('2026-11-23')
    expect(await counts()).toEqual(before)
  })

  it('night 3: the close fills at the open; an owner stop that stays broken alerts and asks for re-analysis only once', async () => {
    await run('2026-11-24')
    const sid = await shadowId()
    expect((await db.pool.query(`SELECT status, realized_pnl FROM positions WHERE portfolio_id = $1 AND ticker = 'AAPL'`, [sid])).rows[0]).toMatchObject({ status: 'closed' })
    const t = (await db.pool.query(`SELECT price FROM trades WHERE portfolio_id = $1 AND ticker = 'AAPL' AND action = 'close'`, [sid])).rows
    expect(t).toEqual([{ price: 97 }])
    expect((await db.pool.query(`SELECT count(*)::int n FROM alerts WHERE portfolio_id = $1 AND kind = 'stop_hit'`, [owner])).rows[0].n).toBe(1)
    expect((await db.pool.query(`SELECT count(*)::int n FROM analysis_requests WHERE reason = 'stop_hit'`)).rows[0].n).toBe(1)
  })
})
