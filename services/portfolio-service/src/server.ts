import { createApp } from './app.js'
import { createPool, dbConfig } from './db/pool.js'
import { migrate } from './db/migrate.js'
import { buildRouters } from './routes/index.js'

const port = Number(process.env.PORT ?? 3008)

async function main() {
  const cfg = dbConfig()
  const pool = createPool(cfg, 8)
  // Postgres may still be starting when the container comes up.
  for (let attempt = 1; ; attempt++) {
    try {
      const applied = await migrate(pool, cfg.schema)
      if (applied.length) console.log(`[portfolio-service] applied migrations: ${applied.join(', ')}`)
      break
    } catch (e) {
      if (attempt >= 20) throw e
      console.warn(`[portfolio-service] database not ready (${(e as Error).message}); retrying`)
      await new Promise((r) => setTimeout(r, 3000))
    }
  }
  const app = createApp({ pool, routers: buildRouters(pool) })
  app.listen(port, () => console.log(`[portfolio-service] listening on ${port}`))
}

main().catch((e) => {
  console.error('[portfolio-service] failed to start:', e)
  process.exit(1)
})
