import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createApp } from '../app.js'
import type { Market } from '../market/yahoo.js'
import { testDb } from '../test/db.js'
import { serve } from '../test/http.js'
import { buildRouters } from './index.js'

const market: Market = {
  async bars(t, from, to) {
    const all = t === 'SPY'
      ? [{ date: '2026-11-20', open: 599, high: 601, low: 598, close: 600 }]
      : [{ date: '2026-11-20', open: 69, high: 71, low: 68, close: 70 }]
    return all.filter((b) => b.date >= from && b.date <= to)
  },
  async quotes(tickers) {
    return tickers.map((s) => ({ symbol: s, regularMarketPrice: s === 'KO' ? 70 : 100 }))
  },
  async profile() {
    return { name: null, sector: 'Consumer Defensive' }
  },
}

describe('API routes', () => {
  let db: Awaited<ReturnType<typeof testDb>>
  let api: Awaited<ReturnType<typeof serve>>
  let ledger: string
  let pid: number
  beforeAll(async () => {
    db = await testDb()
    ledger = join(mkdtempSync(join(tmpdir(), 'routes-')), 'decisions.jsonl')
    writeFileSync(ledger, JSON.stringify({ date: '2026-11-20', ticker: 'KO', group: 'core', decision: 'BUY', confidence: 0.6, action_now: 'enter_now', label: 'Buy now', price: 70, walk_away: 64, pm: { rationale: 'r', key_risks: ['k'] } }) + '\n')
    const deps = { pool: db.pool, market, ledgerPath: ledger, now: () => new Date('2026-11-21T15:00:00Z') }
    api = await serve(createApp({ pool: db.pool, routers: buildRouters(deps) }))
  })
  afterAll(async () => {
    await api.close()
    await db.drop()
  })

  it('creates a portfolio (validated) and lists it with its numbers', async () => {
    expect(await api.post('/portfolios', { name: '', startingCash: 100 })).toMatchObject({ status: 400, success: false })
    expect(await api.post('/portfolios', { name: 'x', startingCash: -5 })).toMatchObject({ status: 400 })
    const r = await api.post('/portfolios', { name: 'Mine', startingCash: 10000, rules: { position_size: 500 } })
    expect(r).toMatchObject({ status: 201, data: { name: 'Mine', cash: 10000, created_on: '2026-11-21', rules: { position_size: 500 } } })
    pid = (r.data as { id: number }).id
    const list = await api.get('/portfolios')
    expect(list.data).toEqual([expect.objectContaining({ id: pid, equity: 10000, returnPct: 0, openPositions: 0, openAlerts: 0, pendingOrders: 0 })])
    expect(await api.get('/portfolios/999')).toMatchObject({ status: 404, error: 'Portfolio not found' })
  })

  it('the nightly job endpoint runs a night and reports its summary', async () => {
    const r = await api.post('/jobs/nightly', { date: '2026-11-20' })
    expect(r).toMatchObject({ status: 200, data: { status: 'ok', summary: { candidates: 1 } } })
    expect(await api.post('/jobs/nightly', { date: 'yesterday' })).toMatchObject({ status: 400 })
  })

  it('picks for a night show each call, whether it can be traded, and the dates available', async () => {
    const r = await api.get('/picks?date=2026-11-20')
    expect(r.data).toMatchObject({ date: '2026-11-20', dates: ['2026-11-20'], picks: [expect.objectContaining({ ticker: 'KO', source: 'watchlist', tradeable: true, direction: 'long', kind: 'market' })] })
    expect((await api.get('/picks')).data).toMatchObject({ date: '2026-11-20' })
  })

  it('buys at the quoted price when none is given, using the pick for the walk-away stop', async () => {
    const cand = ((await api.get('/picks?date=2026-11-20')).data as { picks: { id: number }[] }).picks[0]
    const r = await api.post(`/portfolios/${pid}/buy`, { ticker: 'ko', candidateId: cand.id })
    expect(r).toMatchObject({ status: 201, data: { position: { ticker: 'KO', avg_cost: 70, stop_price: 64, quantity: 7.1429, source: 'watchlist' }, warnings: [] } })
    expect(await api.post(`/portfolios/${pid}/buy`, { ticker: 'KO', amount: 1e7 })).toMatchObject({ status: 400, error: expect.stringContaining('Not enough cash') })
    expect(await api.post(`/portfolios/${pid}/buy`, { ticker: 'K O!' })).toMatchObject({ status: 400 })
  })

  it('lists positions with the latest mark and profit, and sells part of one', async () => {
    const pos = (await api.get(`/portfolios/${pid}/positions`)).data as { id: number; mark: number; unrealized: number; returnPct: number }[]
    expect(pos[0]).toMatchObject({ ticker: 'KO', mark: 70, mark_date: '2026-11-20', unrealized: 0, returnPct: 0 })
    const s = await api.post(`/portfolios/${pid}/positions/${pos[0].id}/sell`, { quantity: 2, price: 75 })
    expect(s).toMatchObject({ status: 200, data: { position: { quantity: 5.1429 }, realized: 10 } })
    expect(((await api.get(`/portfolios/${pid}/trades`)).data as unknown[]).length).toBe(2)
  })

  it('places a trigger order from a reference price, lists it and cancels it', async () => {
    const o = await api.post(`/portfolios/${pid}/trigger-orders`, { ticker: 'MSFT', triggerPrice: 105 })
    expect(o).toMatchObject({ status: 201, data: { trigger_when: 'above', amount: 500, status: 'pending' } })
    const id = (o.data as { id: number }).id
    expect(((await api.get(`/portfolios/${pid}/orders?status=pending`)).data as unknown[]).length).toBe(1)
    expect(await api.post(`/portfolios/${pid}/orders/${id}/cancel`)).toMatchObject({ status: 200, data: { status: 'cancelled' } })
  })

  it('alerts can be listed and acknowledged; performance has an index series against SPY', async () => {
    const { rows: [a] } = await db.pool.query(`INSERT INTO alerts (portfolio_id, ticker, kind, severity, message, run_date) VALUES ($1,'KO','stop_hit','action','m','2026-11-20') RETURNING id`, [pid])
    expect(((await api.get(`/portfolios/${pid}/alerts?open=1`)).data as unknown[]).length).toBe(1)
    await api.post(`/portfolios/${pid}/alerts/${a.id}/ack`)
    expect(((await api.get(`/portfolios/${pid}/alerts?open=1`)).data as unknown[]).length).toBe(0)
    const perf = await api.get(`/portfolios/${pid}/performance`)
    expect(perf.data).toMatchObject({ series: expect.any(Array), summary: { returnPct: expect.any(Number) } })
  })

  it('updates rules within limits', async () => {
    expect(await api.patch(`/portfolios/${pid}/rules`, { stop_pct: 5 })).toMatchObject({ status: 200, data: { rules: { stop_pct: 5 } } })
    expect(await api.patch(`/portfolios/${pid}/rules`, { stop_pct: 500 })).toMatchObject({ status: 400 })
  })

  it('analysis requests: queue once per ticker, the worker claims, completes and the result lands in the journal', async () => {
    const a = await api.post('/analysis-requests', { ticker: 'nvda' })
    expect(a).toMatchObject({ status: 201, data: { ticker: 'NVDA', status: 'queued', reason: 'on_demand' } })
    expect(await api.post('/analysis-requests', { ticker: 'NVDA' })).toMatchObject({ status: 200, data: { ticker: 'NVDA', status: 'queued' } })
    const c = await api.post('/analysis-requests/claim')
    const id = (c.data as { id: number }).id
    expect(c.data).toMatchObject({ ticker: 'NVDA', status: 'running' })
    expect((await api.post('/analysis-requests/claim')).data).toBeNull()
    const done = await api.post(`/analysis-requests/${id}/complete`, {
      analysis: { date: '2026-11-21', ticker: 'NVDA', decision: 'HOLD', confidence: 0.5, action_now: 'wait_for_trigger', label: 'Buy if price reaches trigger', price: 125, trigger_price: 130, pm: { rationale: 'wait' }, seconds: 90 },
    })
    expect(done).toMatchObject({ status: 200, data: { request: { status: 'done' }, candidate: { ticker: 'NVDA', source: 'on_demand', llm_seconds: 90 } } })
    expect(await api.post(`/analysis-requests/${id}/complete`, { analysis: { date: '2026-11-21', ticker: 'NVDA', decision: 'HOLD', label: 'Wait' } })).toMatchObject({ status: 409 })
    expect((await api.get('/analysis-requests')).data).toEqual([expect.objectContaining({ ticker: 'NVDA', status: 'done' })])
  })

  it('a re-analysis that says SELL on a held position raises an action alert', async () => {
    const pos = ((await api.get(`/portfolios/${pid}/positions`)).data as { id: number }[])[0]
    const { rows: [r] } = await db.pool.query(`INSERT INTO analysis_requests (ticker, reason, portfolio_id, position_id, status) VALUES ('KO','stop_hit',$1,$2,'running') RETURNING id`, [pid, pos.id])
    await api.post(`/analysis-requests/${r.id}/complete`, { analysis: { date: '2026-11-21', ticker: 'KO', decision: 'SELL', confidence: 0.7, action_now: 'exit', label: 'Exit', price: 66, pm: { rationale: 'broken trend' } } })
    const alerts = (await api.get(`/portfolios/${pid}/alerts?open=1`)).data as { kind: string; severity: string; message: string }[]
    expect(alerts).toContainEqual(expect.objectContaining({ kind: 'reanalysis', severity: 'action', message: expect.stringContaining('broken trend') }))
  })

  it('a failed run is recorded with its error', async () => {
    await api.post('/analysis-requests', { ticker: 'AMD' })
    const c = await api.post('/analysis-requests/claim')
    const id = (c.data as { id: number }).id
    expect((await api.post(`/analysis-requests/${id}/fail`, { error: 'model timed out' })).data).toMatchObject({ status: 'failed', error: 'model timed out' })
  })
})
