import { Router } from 'express'
import { z } from 'zod'
import { tx } from '../db/pool.js'
import { callSaysExit } from '../domain/exits.js'
import { analysisSchema, upsertCandidate, type Candidate } from '../store/candidates.js'
import { insertAlert, requestAnalysis } from '../store/events.js'
import { tickerSchema, type ServiceDeps } from './deps.js'
import { h, idParam, ok, UserError } from './http.js'

/** A running request older than this is treated as lost (the worker crashed or the machine slept). */
const STALE_RUNNING_MINUTES = 45

export function analysisRouter(deps: ServiceDeps): Router {
  const { pool } = deps
  const r = Router()

  r.get('/analysis-requests', h(async (_req, res) => {
    const { rows } = await pool.query(
      `SELECT r.*, c.label, c.decision, c.confidence, c.run_date FROM analysis_requests r LEFT JOIN candidates c ON c.id = r.candidate_id
       ORDER BY r.requested_at DESC, r.id DESC LIMIT 50`,
    )
    ok(res, rows)
  }))

  /** Ask for a fresh analysis of one ticker. Asking again while one is queued or running returns that one. */
  r.post('/analysis-requests', h(async (req, res) => {
    const { ticker } = z.object({ ticker: tickerSchema }).parse(req.body)
    const id = await requestAnalysis(pool, { ticker, reason: 'on_demand' })
    if (id) return ok(res, (await pool.query('SELECT * FROM analysis_requests WHERE id = $1', [id])).rows[0], 201)
    ok(res, (await pool.query(`SELECT * FROM analysis_requests WHERE ticker = $1 AND status IN ('queued','running')`, [ticker])).rows[0])
  }))

  /** The host worker takes the oldest queued request. Lost runs are failed first so they do not block a ticker. */
  r.post('/analysis-requests/claim', h(async (_req, res) => {
    await pool.query(
      `UPDATE analysis_requests SET status = 'failed', finished_at = now(), error = 'no result within ${STALE_RUNNING_MINUTES} minutes'
       WHERE status = 'running' AND started_at < now() - interval '${STALE_RUNNING_MINUTES} minutes'`,
    )
    const { rows } = await pool.query(
      `UPDATE analysis_requests SET status = 'running', started_at = now()
       WHERE id = (SELECT id FROM analysis_requests WHERE status = 'queued' ORDER BY requested_at, id LIMIT 1 FOR UPDATE SKIP LOCKED)
       RETURNING *`,
    )
    ok(res, rows[0] ?? null)
  }))

  /**
   * The worker hands back the analysis. It goes into the decision journal (on_demand, or reanalysis when a rule
   * asked for it). For a re-analysis of a held position the owner gets an alert with the new call.
   */
  r.post('/analysis-requests/:id/complete', h(async (req, res) => {
    const id = idParam(req.params.id)
    const { analysis } = z.object({ analysis: analysisSchema }).parse(req.body)
    const out = await tx(pool, async (db) => {
      const reqRow = (await db.query('SELECT * FROM analysis_requests WHERE id = $1 FOR UPDATE', [id])).rows[0]
      if (!reqRow) throw new UserError('Request not found', 404)
      if (reqRow.status !== 'running') throw new UserError(`That request is ${reqRow.status}, not running`, 409)
      if (analysis.ticker !== reqRow.ticker) throw new UserError(`The analysis is for ${analysis.ticker}, the request for ${reqRow.ticker}`)
      const source = reqRow.reason === 'on_demand' ? 'on_demand' : 'reanalysis'
      const cid = await upsertCandidate(db, analysis, source)
      const candidate = (
        await db.query<Candidate>('SELECT * FROM candidates WHERE id = COALESCE($1, (SELECT id FROM candidates WHERE run_date = $2 AND ticker = $3 AND source = $4))', [cid, analysis.date, analysis.ticker, source])
      ).rows[0]
      const request = (await db.query(`UPDATE analysis_requests SET status = 'done', finished_at = now(), candidate_id = $2 WHERE id = $1 RETURNING *`, [id, candidate.id])).rows[0]
      if (reqRow.position_id) {
        const pos = (await db.query(`SELECT * FROM positions WHERE id = $1 AND status = 'open'`, [reqRow.position_id])).rows[0]
        if (pos) {
          const exit = callSaysExit(pos.direction, candidate.decision)
          await insertAlert(db, {
            portfolioId: pos.portfolio_id, positionId: pos.id, ticker: pos.ticker, kind: 'reanalysis', severity: exit ? 'action' : 'info', runDate: analysis.date,
            data: { candidateId: candidate.id, reason: reqRow.reason },
            message: `Fresh analysis of ${pos.ticker} (asked because of ${reqRow.reason.replace('_', ' ')}): ${candidate.label}, ${candidate.decision} at confidence ${candidate.confidence ?? '?'}. ${exit ? 'It now says to get out. ' : ''}${candidate.rationale ?? ''}`.trim(),
          })
        }
      }
      return { request, candidate }
    })
    ok(res, out)
  }))

  r.post('/analysis-requests/:id/fail', h(async (req, res) => {
    const id = idParam(req.params.id)
    const { error } = z.object({ error: z.string().max(2000).default('failed') }).parse(req.body)
    const { rows } = await pool.query(
      `UPDATE analysis_requests SET status = 'failed', finished_at = now(), error = $2 WHERE id = $1 AND status IN ('queued','running') RETURNING *`,
      [id, error],
    )
    if (!rows[0]) throw new UserError('No queued or running request with that id', 404)
    ok(res, rows[0])
  }))

  return r
}
