import express, { Router } from 'express'
import type pg from 'pg'
import { errorHandler, ok } from './routes/http.js'

export interface AppDeps {
  pool: pg.Pool
  /** Extra routers mounted under /api/portfolio (added by later modules). */
  routers?: Router[]
}

export function createApp(deps: AppDeps): express.Express {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '256kb' }))
  const api = Router()
  api.get('/health', async (_req, res) => {
    await deps.pool.query('SELECT 1')
    ok(res, { status: 'ok' })
  })
  for (const r of deps.routers ?? []) api.use(r)
  app.use('/api/portfolio', api)
  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Not found' })
  })
  app.use(errorHandler)
  return app
}
