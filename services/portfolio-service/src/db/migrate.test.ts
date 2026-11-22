import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type pg from 'pg'
import { migrate } from './migrate.js'
import { testDb } from '../test/db.js'

describe('migrate', () => {
  let db: { pool: pg.Pool; schema: string; drop: () => Promise<void> }
  beforeAll(async () => {
    db = await testDb()
  })
  afterAll(async () => db.drop())

  it('creates every table in the target schema', async () => {
    const { rows } = await db.pool.query<{ table_name: string }>(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = $1 ORDER BY 1',
      [db.schema],
    )
    expect(rows.map((r) => r.table_name)).toEqual([
      'alerts', 'analysis_requests', 'bars', 'candidates', 'orders', 'portfolios', 'positions',
      'reviews', 'runs', 'schema_migrations', 'snapshots', 'source_picks', 'tickers', 'trades',
    ])
  })

  it('is idempotent: a second run applies nothing', async () => {
    expect(await migrate(db.pool, db.schema)).toEqual([])
  })

  it('rejects an unsafe schema name', async () => {
    await expect(migrate(db.pool, 'x; drop table y')).rejects.toThrow('Invalid schema name')
  })
})
