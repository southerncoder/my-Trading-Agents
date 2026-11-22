import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Bar } from '../domain/types.js'
import type { Market } from '../market/yahoo.js'
import { createPortfolio, placeTriggerOrder, recordBuy } from '../services/portfolio-ops.js'
import { testDb } from '../test/db.js'
import { runNightly } from './nightly.js'

const b = (date: string, open: number, high: number, low: number, close: number): Bar => ({ date, open, high, low, close })

// Fri 11-20, Mon 11-23, Tue 11-24, then Wed 11-25 .. 12-08 for the expiry test.
const BARS: Record<string, Bar[]> = {
  SPY: [b('2026-11-19', 598, 601, 597, 599), b('2026-11-20', 599, 601, 598, 600), b('2026-11-23', 600, 607, 600, 606), b('2026-11-24', 606, 607, 602, 603)],
  KO: [b('2026-11-20', 69, 71.5, 68, 70), b('2026-11-23', 71, 73, 70.5, 72.5), b('2026-11-24', 70, 70.5, 66, 66.5)],
  NVDA: [b('2026-11-20', 124, 126, 123, 125), b('2026-11-23', 126, 127, 124, 126), b('2026-11-24', 120, 121, 112, 113)],
  AMD: [b('2026-11-20', 99, 101, 98, 100), b('2026-11-23', 104, 106, 103, 105.5), b('2026-11-24', 105, 106, 104, 105)],
  XOM: [b('2026-11-20', 101, 102, 99, 100), b('2026-11-23', 100, 101, 99, 100), b('2026-11-24', 100, 101, 99, 100)],
  BIG: [b('2026-11-20', 100, 101, 99, 100), b('2026-11-23', 100, 101, 99, 100), b('2026-11-24', 100, 101, 99, 100)],
  PEP: [b('2026-11-20', 50, 51, 49, 50), b('2026-12-08', 50, 51, 49, 50)],
}

function stubMarket(): Market & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    async bars(t, from, to) {
      calls.push(t)
      return (BARS[t] ?? []).filter((x) => x.date >= from && x.date <= to)
    },
    async quotes() {
      return []
    },
    async profile(t) {
      return { name: t, sector: t === 'BIG' ? 'Industrials' : 'Tech' }
    },
  }
}

const line = (o: Record<string, unknown>) =>
  JSON.stringify({ date: '2026-11-20', group: 'core', decision: 'BUY', confidence: 0.6, action_now: 'enter_now', label: 'Buy now', walk_away: null, trigger_price: null, pm: { rationale: 'r', key_risks: [] }, ...o })

describe('nightly job', () => {
  let db: Awaited<ReturnType<typeof testDb>>
  let ledger: string
  const market = stubMarket()
  const run = (date: string) => runNightly({ pool: db.pool, market, ledgerPath: ledger }, date)
  const count = async (table: string, where = 'true') => (await db.pool.query(`SELECT count(*)::int n FROM ${table} WHERE ${where}`)).rows[0].n as number
  let owner: number
  let other: number
  let xomPos: number

  beforeAll(async () => {
    db = await testDb()
    ledger = join(mkdtempSync(join(tmpdir(), 'nightly-')), 'decisions.jsonl')
    writeFileSync(
      ledger,
      [
        line({ ticker: 'NVDA', price: 125, walk_away: 115 }),
        line({ ticker: 'AMD', price: 100, decision: 'HOLD', action_now: 'wait_for_trigger', label: 'Buy if price reaches trigger', trigger_price: 105 }),
        line({ ticker: 'XOM', price: 100, decision: 'SELL', action_now: 'exit', label: 'Exit' }),
      ].join('\n') + '\n',
    )
    owner = (await createPortfolio(db.pool, { name: 'Mine', startingCash: 10000, createdOn: '2026-11-20', spyClose: 600 })).id
    await placeTriggerOrder(db.pool, { portfolioId: owner, ticker: 'KO', direction: 'long', triggerPrice: 72, refPrice: 70, amount: 1000, date: '2026-11-20' })
    other = (await createPortfolio(db.pool, { name: 'Other', startingCash: 10000, createdOn: '2026-11-20' })).id
    xomPos = (await recordBuy(db.pool, { portfolioId: other, ticker: 'XOM', direction: 'long', amount: 1000, price: 100, date: '2026-11-20' })).position.id
    await recordBuy(db.pool, { portfolioId: other, ticker: 'BIG', direction: 'long', amount: 2000, price: 100, date: '2026-11-20' })
    await recordBuy(db.pool, { portfolioId: other, ticker: 'ZZZZ', direction: 'long', amount: 500, price: 10, date: '2026-11-20' })
    await placeTriggerOrder(db.pool, { portfolioId: other, ticker: 'PEP', direction: 'long', triggerPrice: 60, refPrice: 50, amount: 500, date: '2026-11-20' })
  })
  afterAll(async () => db.drop())

  it('night 1: ingests the calls, does not fill an order placed tonight, and the shadow portfolio takes the picks', async () => {
    const r = await run('2026-11-20')
    expect(r.status).toBe('ok')
    expect(await count('candidates')).toBe(3)
    expect(await count('orders', `ticker='KO' AND status='pending'`)).toBe(1)
    const shadow = (await db.pool.query(`SELECT * FROM portfolios WHERE kind='shadow'`)).rows
    expect(shadow).toHaveLength(1)
    expect(shadow[0]).toMatchObject({ starting_cash: 100000 })
    const sid = shadow[0].id
    expect((await db.pool.query(`SELECT ticker, quantity, avg_cost, stop_price, source FROM positions WHERE portfolio_id=$1`, [sid])).rows).toEqual([
      { ticker: 'NVDA', quantity: 16, avg_cost: 125, stop_price: 115, source: 'watchlist' },
    ])
    expect((await db.pool.query(`SELECT ticker, trigger_price, trigger_when, status FROM orders WHERE portfolio_id=$1 AND kind='trigger'`, [sid])).rows).toEqual([
      { ticker: 'AMD', trigger_price: 105, trigger_when: 'above', status: 'pending' },
    ])
  })

  it('night 1: a SELL call on a held stock raises a sell alert; oversize positions raise a risk alert', async () => {
    const kinds = (await db.pool.query(`SELECT kind, ticker, position_id FROM alerts WHERE portfolio_id=$1 ORDER BY kind`, [other])).rows
    expect(kinds).toContainEqual({ kind: 'sell_call', ticker: 'XOM', position_id: xomPos })
    expect(kinds).toContainEqual(expect.objectContaining({ kind: 'risk_position', ticker: 'BIG' }))
  })

  it('night 1: snapshots every portfolio with the SPY close; a ticker with no prices is valued at cost', async () => {
    const s = (await db.pool.query(`SELECT * FROM snapshots WHERE portfolio_id=$1 AND date='2026-11-20'`, [other])).rows[0]
    expect(s).toMatchObject({ spy_close: 600, long_value: 3500, equity: 10000 })
  })

  it('night 2: the owner trigger fills at the trigger; the shadow trigger fills; an alert tells the owner', async () => {
    expect((await run('2026-11-23')).status).toBe('ok')
    const ko = (await db.pool.query(`SELECT * FROM positions WHERE portfolio_id=$1 AND ticker='KO'`, [owner])).rows[0]
    expect(ko).toMatchObject({ avg_cost: 72, quantity: 13.8889, opened_on: '2026-11-23', stop_price: 66.24 })
    expect(await count('alerts', `portfolio_id=${owner} AND kind='order_filled'`)).toBe(1)
    expect(await count('positions', `ticker='AMD' AND avg_cost=105`)).toBe(1)
  })

  it('re-running a night changes nothing', async () => {
    const before = await Promise.all(['trades', 'alerts', 'snapshots', 'orders', 'positions', 'analysis_requests'].map((t) => count(t)))
    const cashBefore = (await db.pool.query('SELECT sum(cash) s FROM portfolios')).rows[0].s
    await run('2026-11-23')
    expect(await Promise.all(['trades', 'alerts', 'snapshots', 'orders', 'positions', 'analysis_requests'].map((t) => count(t)))).toEqual(before)
    expect((await db.pool.query('SELECT sum(cash) s FROM portfolios')).rows[0].s).toBe(cashBefore)
  })

  it('night 3: an owner stop hit is an alert plus a re-analysis request, not a sale; the shadow sells at the stop', async () => {
    await run('2026-11-24')
    const alert = (await db.pool.query(`SELECT * FROM alerts WHERE portfolio_id=$1 AND kind='stop_hit'`, [owner])).rows[0]
    expect(alert).toMatchObject({ ticker: 'KO', severity: 'action', run_date: '2026-11-24' })
    expect(alert.data).toMatchObject({ price: 66.24 })
    expect(await count('positions', `portfolio_id=${owner} AND ticker='KO' AND status='open'`)).toBe(1)
    expect((await db.pool.query(`SELECT ticker, reason, status FROM analysis_requests`)).rows).toContainEqual({ ticker: 'KO', reason: 'stop_hit', status: 'queued' })
    const nvda = (await db.pool.query(`SELECT * FROM positions WHERE ticker='NVDA'`)).rows[0]
    expect(nvda).toMatchObject({ status: 'closed', closed_on: '2026-11-24', realized_pnl: -160 })
  })

  it('a pending order past its expiry is expired with a note to the owner', async () => {
    await run('2026-12-08')
    expect((await db.pool.query(`SELECT status FROM orders WHERE ticker='PEP'`)).rows[0].status).toBe('expired')
    expect(await count('alerts', `kind='order_expired' AND ticker='PEP'`)).toBe(1)
  })

  it('records each run with a summary', async () => {
    const runs = (await db.pool.query(`SELECT run_date, status, summary FROM runs WHERE kind='nightly' ORDER BY id`)).rows
    expect(runs.map((r) => r.run_date)).toEqual(['2026-11-20', '2026-11-23', '2026-11-23', '2026-11-24', '2026-12-08'])
    expect(runs.every((r) => r.status === 'ok')).toBe(true)
    expect(runs[0].summary).toMatchObject({ candidates: 3 })
  })
})
