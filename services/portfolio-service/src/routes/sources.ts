import { Router } from 'express'
import { z } from 'zod'
import { weekEndingFor, weeklyReview } from '../jobs/weekly-review.js'
import { sourceResults } from '../services/results.js'
import { computeSources, readSources } from '../sources/tonight.js'
import { dateSchema, today, type ServiceDeps } from './deps.js'
import { h, ok, UserError } from './http.js'

export function sourcesRouter(deps: ServiceDeps): Router {
  const { pool } = deps
  const r = Router()

  /** Called by the nightly launcher before the analysis: returns tonight's screen and news tickers. */
  r.post('/sources/tonight', h(async (req, res) => {
    const { date } = z.object({ date: dateSchema.optional() }).parse(req.body)
    ok(res, await computeSources(deps, date ?? today(deps)))
  }))

  r.get('/sources', h(async (req, res) => {
    const date = req.query.date ? dateSchema.parse(req.query.date) : today(deps)
    ok(res, await readSources(pool, date))
  }))

  r.get('/sources/results', h(async (_req, res) => {
    ok(res, await sourceResults(pool, today(deps)))
  }))

  r.post('/jobs/weekly-review', h(async (req, res) => {
    const { weekEnding } = z.object({ weekEnding: dateSchema.optional() }).parse(req.body)
    const friday = weekEndingFor(weekEnding ?? today(deps))
    ok(res, await weeklyReview(deps, friday))
  }))

  r.get('/reviews', h(async (_req, res) => {
    ok(res, (await pool.query(`SELECT id, week_ending, model, created_at, left(body_md, 400) AS preview FROM reviews ORDER BY week_ending DESC LIMIT 104`)).rows)
  }))

  r.get('/reviews/:weekEnding', h(async (req, res) => {
    const d = dateSchema.parse(req.params.weekEnding)
    const row = (await pool.query(`SELECT * FROM reviews WHERE week_ending = $1`, [d])).rows[0]
    if (!row) throw new UserError('No review for that week', 404)
    ok(res, row)
  }))

  return r
}
