import type { Router } from 'express'
import type pg from 'pg'

/** Every API router, mounted under /api/portfolio. */
export function buildRouters(pool: pg.Pool): Router[] {
  void pool
  return []
}
