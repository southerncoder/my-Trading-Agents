import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { testDb } from '../test/db.js'
import { ingestLedger } from './ingest.js'

const line = (o: Record<string, unknown>) =>
  JSON.stringify({
    date: '2026-11-20', ticker: 'KO', group: 'core', profile: 'ollama-cloud', fast_model: 'f', decision_model: 'd',
    decision: 'BUY', confidence: 0.6, action_now: 'enter_now', label: 'Buy now', price: 70, ma50: 68, ma200: 65, target: 80,
    range_pos: 70, atr: 1.2, walk_away: 66, trigger_price: null, trigger_type: null, trigger_reason: '',
    pm: { rationale: 'Steady demand', key_risks: ['Sugar taxes'], what_would_change_my_mind: 'x' },
    stance: { market: 'now', rm: 'now', trader: 'now', pm: 'now' }, seconds: 81,
    ...o,
  })

describe('ingestLedger', () => {
  let db: Awaited<ReturnType<typeof testDb>>
  let path: string
  beforeAll(async () => {
    db = await testDb()
    path = join(mkdtempSync(join(tmpdir(), 'ledger-')), 'decisions.jsonl')
    writeFileSync(
      path,
      '\uFEFF' +
        [
          line({}),
          line({ ticker: 'AAPL', group: 'screen', decision: 'HOLD', action_now: 'wait_for_trigger', label: 'Buy if price reaches trigger', trigger_price: 250, trigger_type: 'breakout' }),
          line({ ticker: 'XYZ', group: 'news' }),
          line({ ticker: 'KO', date: '2026-11-19' }),
          '{not json',
          line({ ticker: 'KO', group: 'brands', profile: 'hybrid', confidence: 0.7 }),
        ].join('\n') + '\n',
    )
  })
  afterAll(async () => db.drop())

  it('stores each call for the date with its source, frozen inputs and reasoning', async () => {
    const r = await ingestLedger(db.pool, path, '2026-11-20')
    expect(r).toMatchObject({ stored: 3, skippedLines: 1 })
    const { rows } = await db.pool.query('SELECT * FROM candidates ORDER BY ticker')
    expect(rows.map((c) => [c.ticker, c.source])).toEqual([['AAPL', 'screen'], ['KO', 'watchlist'], ['XYZ', 'news']])
    const ko = rows.find((c) => c.ticker === 'KO')
    // The later KO line for the same night (a re-run with another profile) wins.
    expect(ko).toMatchObject({ run_date: '2026-11-20', confidence: 0.7, profile: 'hybrid', rationale: 'Steady demand', walk_away: 66, llm_seconds: 81 })
    expect(ko.key_risks).toEqual(['Sugar taxes'])
    expect(ko.inputs).toMatchObject({ price: 70, ma50: 68, ma200: 65, target: 80, atr: 1.2, stance: { pm: 'now' } })
    expect(rows.find((c) => c.ticker === 'AAPL')).toMatchObject({ trigger_price: 250, trigger_type: 'breakout', label: 'Buy if price reaches trigger' })
  })

  it('running again changes nothing and adds no rows', async () => {
    await ingestLedger(db.pool, path, '2026-11-20')
    expect((await db.pool.query('SELECT count(*)::int AS n FROM candidates')).rows[0].n).toBe(3)
  })

  it('never rewrites a call that an order or position already points at (the journal stays as it was)', async () => {
    const { rows: [p] } = await db.pool.query(`INSERT INTO portfolios (name, kind, starting_cash, cash, created_on) VALUES ('p','owner',1000,1000,'2026-11-20') RETURNING id`)
    const { rows: [c] } = await db.pool.query(`SELECT id FROM candidates WHERE ticker='KO'`)
    await db.pool.query(`INSERT INTO orders (portfolio_id, candidate_id, ticker, direction, intent, kind, amount, created_on) VALUES ($1,$2,'KO','long','open','market',100,'2026-11-20')`, [p.id, c.id])
    writeFileSync(path, line({ confidence: 0.2 }) + '\n')
    await ingestLedger(db.pool, path, '2026-11-20')
    expect((await db.pool.query(`SELECT confidence FROM candidates WHERE ticker='KO'`)).rows[0].confidence).toBe(0.7)
  })

  it('repairs text the Windows console garbled (code page 437) before storing it', async () => {
    writeFileSync(path, line({ date: '2026-11-21', ticker: 'GME', pm: { rationale: 'netΓÇæcash', key_risks: ['a ΓÇö b'] } }) + '\n')
    await ingestLedger(db.pool, path, '2026-11-21')
    const row = (await db.pool.query(`SELECT rationale, key_risks FROM candidates WHERE ticker='GME'`)).rows[0]
    expect(row).toEqual({ rationale: 'net‑cash', key_risks: ['a — b'] })
  })

  it('a missing ledger file is not an error', async () => {
    expect(await ingestLedger(db.pool, join(tmpdir(), 'nope', 'x.jsonl'), '2026-11-20')).toMatchObject({ stored: 0, missing: true })
  })
})
