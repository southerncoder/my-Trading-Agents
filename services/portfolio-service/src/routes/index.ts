import type { Router } from 'express'
import { analysisRouter } from './analysis.js'
import type { ServiceDeps } from './deps.js'
import { jobsRouter } from './jobs.js'
import { picksRouter } from './picks.js'
import { portfoliosRouter } from './portfolios.js'

/** Every API router, mounted under /api/portfolio. */
export function buildRouters(deps: ServiceDeps): Router[] {
  return [portfoliosRouter(deps), picksRouter(deps), analysisRouter(deps), jobsRouter(deps)]
}
