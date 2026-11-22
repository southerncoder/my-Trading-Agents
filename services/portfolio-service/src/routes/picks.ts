import { Router } from 'express'
import { pickIntent, type Candidate } from '../store/candidates.js'
import { dateSchema, type ServiceDeps } from './deps.js'
import { h, ok } from './http.js'

const PICK_SOURCES = ['watchlist', 'screen', 'news']

export function picksRouter(deps: ServiceDeps): Router {
  const { pool } = deps
  const r = Router()

  /** One night's calls from every source, with whether each can be traded and why screen/news picked it. */
  r.get('/picks', h(async (req, res) => {
    const { rows: dates } = await pool.query<{ d: string }>(
      `SELECT DISTINCT run_date::text d FROM candidates WHERE source = ANY($1) ORDER BY 1 DESC LIMIT 90`,
      [PICK_SOURCES],
    )
    const date = req.query.date ? dateSchema.parse(req.query.date) : dates[0]?.d ?? null
    if (!date) return ok(res, { date: null, dates: [], picks: [] })
    const { rows } = await pool.query<Candidate & { reasons: unknown; score: number | null; company: string | null; sector: string | null }>(
      `SELECT c.*, sp.reasons, sp.score, t.name AS company, t.sector
       FROM candidates c
       LEFT JOIN source_picks sp ON sp.run_date = c.run_date AND sp.ticker = c.ticker AND sp.source = c.source
       LEFT JOIN tickers t ON t.ticker = c.ticker
       WHERE c.run_date = $1 ORDER BY c.source, c.confidence DESC NULLS LAST, c.ticker`,
      [date],
    )
    ok(res, {
      date,
      dates: dates.map((d) => d.d),
      picks: rows.map((c) => {
        const intent = pickIntent(c.label)
        return { ...c, tradeable: intent !== null, direction: intent?.direction ?? null, kind: intent?.kind ?? null }
      }),
    })
  }))

  /** Every journal entry for one ticker, newest first (the decision history behind a position). */
  r.get('/picks/ticker/:ticker', h(async (req, res) => {
    const t = String(req.params.ticker).trim().toUpperCase()
    ok(res, (await pool.query(`SELECT * FROM candidates WHERE ticker = $1 ORDER BY run_date DESC, id DESC LIMIT 60`, [t])).rows)
  }))

  return r
}
