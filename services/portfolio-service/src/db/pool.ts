import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

// numeric -> number, bigint (count) -> number, date -> 'YYYY-MM-DD' string (no time-zone shifts).
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)))
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v)))
pg.types.setTypeParser(1082, (v) => v)

/** Anything that can run a query: the pool or a client inside a transaction. */
export interface Db {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query<R extends pg.QueryResultRow = any>(text: string, values?: unknown[]): Promise<pg.QueryResult<R>>
}

function readSecret(dirs: string[], name: string): string | undefined {
  for (const d of dirs) {
    const p = `${d}/${name}`
    if (existsSync(p)) return readFileSync(p, 'utf8').trim()
  }
  return undefined
}

export interface DbConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
  schema: string
}

/**
 * Connection settings. In the container they come from Docker secrets; on the host (tests, tools) from
 * the repo's docker/secrets files, connecting to the published port. Values are never logged.
 */
export function dbConfig(env: NodeJS.ProcessEnv = process.env, secretDirs?: string[]): DbConfig {
  const dirs = secretDirs ?? ['/run/secrets', fileURLToPath(new URL('../../../../docker/secrets', import.meta.url))]
  const user = env.PGUSER ?? readSecret(dirs, 'postgres_user') ?? readSecret(dirs, 'postgres_user.txt')
  const password = env.PGPASSWORD ?? readSecret(dirs, 'postgres_password') ?? readSecret(dirs, 'postgres_password.txt')
  const database = env.PGDATABASE ?? readSecret(dirs, 'postgres_db') ?? readSecret(dirs, 'postgres_db.txt')
  if (!user || !password || !database) throw new Error('Postgres credentials not found (Docker secrets postgres_user, postgres_password, postgres_db)')
  return {
    host: env.PGHOST ?? (existsSync('/run/secrets/postgres_password') ? 'postgresql' : '127.0.0.1'),
    port: Number(env.PGPORT ?? (existsSync('/run/secrets/postgres_password') ? 5432 : 38420)),
    user,
    password,
    database,
    schema: env.PORTFOLIO_SCHEMA ?? 'portfolio',
  }
}

export function createPool(cfg: DbConfig = dbConfig(), max = 5): pg.Pool {
  if (!/^[a-z_][a-z0-9_]*$/.test(cfg.schema)) throw new Error('Invalid schema name')
  return new pg.Pool({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    max,
    options: `-c search_path=${cfg.schema}`,
  })
}

/** Runs fn in one transaction on one client; rolls back on any error. */
export async function tx<T>(pool: pg.Pool, fn: (db: Db) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const out = await fn(client)
    await client.query('COMMIT')
    return out
  } catch (e) {
    await client.query('ROLLBACK').catch(() => undefined)
    throw e
  } finally {
    client.release()
  }
}
