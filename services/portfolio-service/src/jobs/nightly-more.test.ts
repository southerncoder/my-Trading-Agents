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
const BARS: Record<string, Bar[]> = {
  SPY: [b('2026-11-19', 600, 601, 599, 600), b('2026-11-20', 600, 601, 599, 600)],
  // Both triggers (102 and 104) are reached on 11-19, before the first nightly run ever happens.
  KO: [b('2026-11-19', 100, 105, 99, 104), b('2026-11-20', 104, 105, 103, 104)],
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

describe('nightly job: first run, several fills a day, long halts', () => {
  let db: Awaited<ReturnType<typeof testDb>>
  let pid: number
  beforeAll(async () => {
    db = await testDb()
    const ledger = join(mkdtempSync(join(tmpdir(), 'more-')), 'decisions.jsonl')
    writeFileSync(ledger, '')
    pid = (await createPortfolio(db.pool, { name: 'Mine', startingCash: 10000, createdOn: '2026-11-18', rules: { max_position_pct: 100 } })).id
    await placeTriggerOrder(db.pool, { portfolioId: pid, ticker: 'KO', direction: 'long', triggerPrice: 102, refPrice: 100, amount: 1000, date: '2026-11-18' })
    await placeTriggerOrder(db.pool, { portfolioId: pid, ticker: 'KO', direction: 'long', triggerPrice: 104, refPrice: 100, amount: 1000, date: '2026-11-18' })
    // A halted stock: its only price is two months old, older than the history the nightly run loads.
    await recordBuy(db.pool, { portfolioId: pid, ticker: 'OLD', direction: 'long', amount: 1000, price: 10, date: '2026-09-01' })
    await db.pool.query(`INSERT INTO bars VALUES ('OLD','2026-09-01',5,5,5,5)`)
    await runNightly({ pool: db.pool, market, ledgerPath: ledger }, '2026-11-20')
  })
  afterAll(async () => db.drop())

  it('the very first run still checks the days since the orders were placed', async () => {
    const fills = (await db.pool.query(`SELECT filled_on, fill_price FROM orders WHERE ticker = 'KO' ORDER BY trigger_price`)).rows
    expect(fills).toEqual([{ filled_on: '2026-11-19', fill_price: 102 }, { filled_on: '2026-11-19', fill_price: 104 }])
  })

  it('each filled order gets its own alert, even two in one ticker on one day', async () => {
    expect((await db.pool.query(`SELECT count(*)::int n FROM alerts WHERE kind = 'order_filled'`)).rows[0].n).toBe(2)
  })

  it('a long-halted stock is valued at its last stored close, not at cost', async () => {
    const s = (await db.pool.query(`SELECT long_value FROM snapshots WHERE portfolio_id = $1 AND date = '2026-11-20'`, [pid])).rows[0]
    // 100 shares of OLD at its last close of 5 (not 10), plus the two KO fills marked at 104.
    expect(s.long_value).toBeCloseTo(500 + (1000 / 102 + 1000 / 104) * 104, 0)
  })
})
