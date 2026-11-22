import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import type pg from 'pg'

const MIGRATIONS_DIR = fileURLToPath(new URL('./migrations/', import.meta.url))

/** Applies every migrations/*.sql file not yet recorded in <schema>.schema_migrations. Returns the names applied. */
export async function migrate(pool: pg.Pool, schema: string, dir = MIGRATIONS_DIR): Promise<string[]> {
  if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error('Invalid schema name')
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()
  const client = await pool.connect()
  const applied: string[] = []
  try {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`)
    await client.query(`SET search_path TO ${schema}`)
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())')
    // Serialize concurrent starts (two containers, or a test and the service).
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [`migrate:${schema}`])
    try {
      const done = new Set((await client.query<{ name: string }>('SELECT name FROM schema_migrations')).rows.map((r) => r.name))
      for (const f of files) {
        if (done.has(f)) continue
        await client.query('BEGIN')
        try {
          await client.query(readFileSync(`${dir}/${f}`, 'utf8'))
          await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [f])
          await client.query('COMMIT')
          applied.push(f)
        } catch (e) {
          await client.query('ROLLBACK')
          throw new Error(`Migration ${f} failed: ${(e as Error).message}`, { cause: e })
        }
      }
    } finally {
      await client.query('SELECT pg_advisory_unlock(hashtext($1))', [`migrate:${schema}`])
    }
  } finally {
    client.release()
  }
  return applied
}
