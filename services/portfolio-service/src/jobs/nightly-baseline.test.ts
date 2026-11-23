import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Bar } from '../domain/types.js'
import type { Market } from '../market/yahoo.js'
import { createPortfolio, recordBuy } from '../services/portfolio-ops.js'
import { testDb } from '../test/db.js'
import { runNightly } from './nightly.js'

const b = (date: string, open: number, high: number, low: number, close: number): Bar => ({ date, open, high, low, close })
const BARS: Record<string, Bar[]> = {
  SPY: [b('2026-11-20', 599, 601, 598, 600), b('2026-11-23', 600, 607, 600, 606)],
  NVDA: [b('2026-11-20', 124, 126, 123, 125), b('2026-11-23', 126, 127, 124, 126)],
  AMD: [b('2026-11-20', 99, 101, 98, 100), b('2026-11-23', 104, 106, 103, 105.5)],
  XOM: [b('2026-11-20', 101, 102, 99, 100), b('2026-11-23', 100, 101, 99, 100)],
  KO: [b('2026-11-20', 69, 71, 68, 70), b('2026-11-23', 70, 71, 69, 70)],
  SNAP: [b('2026-11-20', 9, 10, 8, 9), b('2026-11-23', 9, 10, 8, 9)],
}
const market: Market = {
  async bars(t, from, to) {
    return (BARS[t] ?? []).filter((x) => x.date >= from && x.date <= to)
  },
  async quotes() {
    return []
  },
  async profile(t) {
    return { name: t, sector: 'Tech' }
  },
}

const line = (o: Record<string, unknown>) =>
  JSON.stringify({ date: '2026-11-20', group: 'core', decision: 'BUY', confidence: 0.6, action_now: 'enter_now', label: 'Buy now', walk_away: null, trigger_price: null, pm: { rationale: 'r', key_risks: [] }, ...o })

describe('nightly job: baseline portfolio follows every call with a fixed share count', () => {
  let db: Awaited<ReturnType<typeof testDb>>
  let ledger: string
  let pid: number
  const run = (date: string) => runNightly({ pool: db.pool, market, ledgerPath: ledger }, date)
  const orders = async () =>
    (await db.pool.query(`SELECT ticker, intent, kind, quantity, status, fill_price FROM orders WHERE portfolio_id = $1 AND created_on = '2026-11-20' ORDER BY ticker`, [pid])).rows

  beforeAll(async () => {
    db = await testDb()
    ledger = join(mkdtempSync(join(tmpdir(), 'baseline-')), 'decisions.jsonl')
    writeFileSync(
      ledger,
      [
        line({ ticker: 'NVDA', price: 125 }),
        line({ ticker: 'AMD', price: 100, decision: 'HOLD', action_now: 'wait_for_trigger', label: 'Buy if price reaches trigger', trigger_price: 105 }),
        line({ ticker: 'XOM', price: 100, decision: 'SELL', action_now: 'exit', label: 'Exit' }),
        line({ ticker: 'KO', price: 70, decision: 'HOLD', action_now: 'none', label: 'Wait' }),
        line({ ticker: 'SNAP', price: 9, decision: 'SELL', action_now: 'exit', label: 'Exit' }),
      ].join('\n') + '\n',
    )
    pid = (await createPortfolio(db.pool, { name: 'Baseline', kind: 'baseline', startingCash: 10000, createdOn: '2026-11-19', rules: { follow_shares: 1, max_position_pct: 100 } })).id
    await recordBuy(db.pool, { portfolioId: pid, ticker: 'XOM', direction: 'long', quantity: 3, price: 100, date: '2026-11-19' })
  })
  afterAll(async () => db.drop())

  it('night of the calls: buy 1 now, buy 1 at the trigger, sell 1 held; holds and sells of unheld stocks do nothing', async () => {
    expect((await run('2026-11-20')).status).toBe('ok')
    expect(await orders()).toEqual([
      { ticker: 'AMD', intent: 'open', kind: 'trigger', quantity: 1, status: 'pending', fill_price: null },
      { ticker: 'NVDA', intent: 'open', kind: 'market', quantity: 1, status: 'pending', fill_price: null },
      { ticker: 'XOM', intent: 'close', kind: 'market', quantity: 1, status: 'pending', fill_price: null },
    ])
  })

  it('re-running the same night places nothing new', async () => {
    await run('2026-11-20')
    expect(await orders()).toHaveLength(3)
  })

  it('next day: the orders fill one share each, and the position history shows the change', async () => {
    await run('2026-11-23')
    const filled = await orders()
    expect(filled.map((o) => [o.ticker, o.status, o.fill_price])).toEqual([['AMD', 'filled', 105], ['NVDA', 'filled', 126], ['XOM', 'filled', 100]])
    const pos = (await db.pool.query(`SELECT ticker, quantity FROM positions WHERE portfolio_id = $1 AND status = 'open' ORDER BY ticker`, [pid])).rows
    expect(pos).toEqual([{ ticker: 'AMD', quantity: 1 }, { ticker: 'NVDA', quantity: 1 }, { ticker: 'XOM', quantity: 2 }])
    const xomTrades = (await db.pool.query(`SELECT action, quantity FROM trades WHERE portfolio_id = $1 AND ticker = 'XOM' ORDER BY id`, [pid])).rows
    expect(xomTrades).toEqual([{ action: 'open', quantity: 3 }, { action: 'reduce', quantity: 1 }])
  })

  it('raises no alerts and requests no re-analysis', async () => {
    expect((await db.pool.query(`SELECT count(*)::int n FROM alerts WHERE portfolio_id = $1`, [pid])).rows[0].n).toBe(0)
    expect((await db.pool.query(`SELECT count(*)::int n FROM analysis_requests WHERE portfolio_id = $1`, [pid])).rows[0].n).toBe(0)
  })
})
