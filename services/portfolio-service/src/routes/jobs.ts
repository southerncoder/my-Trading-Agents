import { Router } from 'express'
import { z } from 'zod'
import { runNightly } from '../jobs/nightly.js'
import { dateSchema, type ServiceDeps } from './deps.js'
import { h, ok } from './http.js'

export function jobsRouter(deps: ServiceDeps): Router {
  const { pool } = deps
  const r = Router()

  /** Called by tools/nightly-run.ps1 after the analysis finishes. */
  r.post('/jobs/nightly', h(async (req, res) => {
    const { date } = z.object({ date: dateSchema }).parse(req.body)
    ok(res, await runNightly({ pool, market: deps.market, ledgerPath: deps.ledgerPath }, date))
  }))

  r.get('/runs', h(async (req, res) => {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 200)
    ok(res, (await pool.query(`SELECT * FROM runs ORDER BY started_at DESC, id DESC LIMIT $1`, [limit])).rows)
  }))

  return r
}
