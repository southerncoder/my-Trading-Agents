import { Router } from 'express'
import { z } from 'zod'
import { indexSeries, summarize } from '../domain/performance.js'
import { rulesSchema } from '../domain/risk.js'
import { addDays } from '../domain/calendar.js'
import { ackAlert, cancelOrder, createPortfolio, getPortfolio, placeTriggerOrder, recordBuy, recordSell, updateRules } from '../services/portfolio-ops.js'
import { portfolioSummary, portfolioSummaryById, positionsView, snapshots } from '../services/queries.js'
import type { Candidate } from '../store/candidates.js'
import { quotePrice, tickerSchema, today, type ServiceDeps } from './deps.js'
import { h, idParam, ok, UserError } from './http.js'

const money = z.number().positive().max(1e9)

export function portfoliosRouter(deps: ServiceDeps): Router {
  const { pool } = deps
  const r = Router()

  async function candidate(id: number | undefined, ticker: string): Promise<Candidate | undefined> {
    if (!id) return undefined
    const c = (await pool.query<Candidate>('SELECT * FROM candidates WHERE id = $1', [id])).rows[0]
    if (!c) throw new UserError('That pick was not found', 404)
    if (c.ticker !== ticker) throw new UserError(`That pick is for ${c.ticker}, not ${ticker}`)
    return c
  }

  async function spyClose(): Promise<number | null> {
    try {
      const d = today(deps)
      return (await deps.market.bars('SPY', addDays(d, -7), d)).at(-1)?.close ?? null
    } catch {
      return null
    }
  }

  r.get('/portfolios', h(async (req, res) => {
    const all = req.query.archived === '1'
    const { rows } = await pool.query<{ id: number }>(`SELECT id FROM portfolios ${all ? '' : 'WHERE NOT archived'} ORDER BY kind, id`)
    ok(res, await Promise.all(rows.map((x) => portfolioSummaryById(pool, x.id, today(deps)))))
  }))

  r.post('/portfolios', h(async (req, res) => {
    const body = z.object({ name: z.string().trim().min(1).max(80), startingCash: money, rules: rulesSchema.partial().optional() }).parse(req.body)
    const p = await createPortfolio(pool, { name: body.name, startingCash: body.startingCash, rules: body.rules, createdOn: today(deps), spyClose: await spyClose() })
    ok(res, p, 201)
  }))

  r.get('/portfolios/:id', h(async (req, res) => {
    ok(res, await portfolioSummaryById(pool, idParam(req.params.id), today(deps)))
  }))

  r.patch('/portfolios/:id', h(async (req, res) => {
    const id = idParam(req.params.id)
    const body = z.object({ name: z.string().trim().min(1).max(80).optional(), archived: z.boolean().optional() }).parse(req.body)
    const p = await getPortfolio(pool, id)
    await pool.query('UPDATE portfolios SET name = $2, archived = $3 WHERE id = $1', [id, body.name ?? p.name, body.archived ?? p.archived])
    ok(res, await portfolioSummary(pool, await getPortfolio(pool, id), today(deps)))
  }))

  /** The shadow portfolio runs by itself; only owner portfolios take trades, cancels and rule changes. */
  async function ownerOnly(id: number) {
    const p = await getPortfolio(pool, id)
    if (p.kind !== 'owner') throw new UserError(`The ${p.kind} portfolio runs by itself and cannot be changed by hand`)
    return p
  }

  r.patch('/portfolios/:id/rules', h(async (req, res) => {
    const id = idParam(req.params.id)
    await ownerOnly(id)
    ok(res, await updateRules(pool, id, rulesSchema.partial().parse(req.body)))
  }))

  r.get('/portfolios/:id/positions', h(async (req, res) => {
    const id = idParam(req.params.id)
    await getPortfolio(pool, id)
    const status = z.enum(['open', 'closed', 'all']).catch('open').parse(req.query.status)
    ok(res, await positionsView(pool, id, status, today(deps)))
  }))

  r.get('/portfolios/:id/orders', h(async (req, res) => {
    const id = idParam(req.params.id)
    await getPortfolio(pool, id)
    const pending = req.query.status === 'pending'
    const { rows } = await pool.query(`SELECT * FROM orders WHERE portfolio_id = $1 ${pending ? "AND status = 'pending'" : ''} ORDER BY id DESC LIMIT 200`, [id])
    ok(res, rows)
  }))

  r.get('/portfolios/:id/trades', h(async (req, res) => {
    const id = idParam(req.params.id)
    await getPortfolio(pool, id)
    ok(res, (await pool.query(`SELECT * FROM trades WHERE portfolio_id = $1 ORDER BY traded_on DESC, id DESC LIMIT 500`, [id])).rows)
  }))

  r.get('/portfolios/:id/alerts', h(async (req, res) => {
    const id = idParam(req.params.id)
    await getPortfolio(pool, id)
    const open = req.query.open === '1'
    const { rows } = await pool.query(
      `SELECT * FROM alerts WHERE portfolio_id = $1 ${open ? 'AND acknowledged_at IS NULL' : ''} ORDER BY run_date DESC, severity, id DESC LIMIT 300`,
      [id],
    )
    ok(res, rows)
  }))

  r.post('/portfolios/:id/alerts/:alertId/ack', h(async (req, res) => {
    ok(res, await ackAlert(pool, idParam(req.params.id), idParam(req.params.alertId)))
  }))

  r.get('/portfolios/:id/performance', h(async (req, res) => {
    const p = await getPortfolio(pool, idParam(req.params.id))
    const snaps = await snapshots(pool, p.id)
    ok(res, { series: indexSeries(snaps, p.starting_cash), summary: summarize(snaps, p.starting_cash), startingCash: p.starting_cash })
  }))

  const buySchema = z.object({
    ticker: tickerSchema,
    direction: z.enum(['long', 'short']).default('long'),
    amount: money.optional(),
    price: money.optional(),
    candidateId: z.number().int().positive().optional(),
    note: z.string().max(300).optional(),
  })

  r.post('/portfolios/:id/buy', h(async (req, res) => {
    const id = idParam(req.params.id)
    const body = buySchema.parse(req.body)
    const p = await getPortfolio(pool, id)
    if (p.kind !== 'owner') throw new UserError('Trades are recorded only in your own portfolios')
    const c = await candidate(body.candidateId, body.ticker)
    const price = body.price ?? (await quotePrice(deps, body.ticker))
    const sector = (await pool.query<{ sector: string | null }>('SELECT sector FROM tickers WHERE ticker = $1', [body.ticker])).rows[0]?.sector
      ?? (await deps.market.profile(body.ticker)).sector
    const out = await recordBuy(pool, {
      portfolioId: id, ticker: body.ticker, direction: body.direction, amount: body.amount ?? p.rules.position_size, price, date: today(deps),
      walkAway: c?.walk_away ?? null, candidateId: c?.id ?? null, source: c?.source ?? 'manual', sector, note: body.note ?? null,
    })
    ok(res, out, 201)
  }))

  r.post('/portfolios/:id/trigger-orders', h(async (req, res) => {
    const id = idParam(req.params.id)
    const body = buySchema.extend({ triggerPrice: money }).parse(req.body)
    const p = await getPortfolio(pool, id)
    if (p.kind !== 'owner') throw new UserError('Orders are placed only in your own portfolios')
    const c = await candidate(body.candidateId, body.ticker)
    const ref = body.price ?? c?.price ?? (await quotePrice(deps, body.ticker))
    const o = await placeTriggerOrder(pool, {
      portfolioId: id, ticker: body.ticker, direction: body.direction, triggerPrice: body.triggerPrice, refPrice: ref,
      amount: body.amount ?? p.rules.position_size, date: today(deps), candidateId: c?.id ?? null, source: c?.source ?? 'manual', note: body.note ?? null,
    })
    ok(res, o, 201)
  }))

  r.post('/portfolios/:id/positions/:positionId/sell', h(async (req, res) => {
    const id = idParam(req.params.id)
    const positionId = idParam(req.params.positionId)
    const body = z.object({ quantity: z.number().positive().optional(), price: money.optional(), note: z.string().max(300).optional() }).parse(req.body)
    await ownerOnly(id)
    // Shares are kept to 4 decimal places; anything smaller is not a sale.
    const quantity = body.quantity === undefined ? undefined : Math.round(body.quantity * 1e4) / 1e4
    if (quantity !== undefined && quantity <= 0) throw new UserError('Quantity is too small (shares are kept to 4 decimal places)')
    const pos = (await pool.query<{ ticker: string }>('SELECT ticker FROM positions WHERE id = $1 AND portfolio_id = $2', [positionId, id])).rows[0]
    if (!pos) throw new UserError('Position not found', 404)
    const price = body.price ?? (await quotePrice(deps, pos.ticker))
    ok(res, await recordSell(pool, { portfolioId: id, positionId, quantity, price, date: today(deps), note: body.note ?? null }))
  }))

  r.post('/portfolios/:id/orders/:orderId/cancel', h(async (req, res) => {
    const id = idParam(req.params.id)
    await ownerOnly(id)
    ok(res, await cancelOrder(pool, id, idParam(req.params.orderId)))
  }))

  return r
}
