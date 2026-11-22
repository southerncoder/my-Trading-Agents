import { randomBytes } from 'node:crypto'
import type pg from 'pg'
import { createPool, dbConfig } from '../db/pool.js'
import { migrate } from '../db/migrate.js'

/**
 * Creates a throwaway schema in the local Postgres (published on 127.0.0.1:38420), migrates it, and returns a
 * pool whose search_path points at it. Call drop() in afterAll. Credentials come from docker/secrets.
 */
export async function testDb(): Promise<{ pool: pg.Pool; schema: string; drop: () => Promise<void> }> {
  const schema = `t_${randomBytes(6).toString('hex')}`
  const cfg = { ...dbConfig(), schema }
  const pool = createPool(cfg, 4)
  await migrate(pool, schema)
  return {
    pool,
    schema,
    drop: async () => {
      await pool.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`)
      await pool.end()
    },
  }
}
