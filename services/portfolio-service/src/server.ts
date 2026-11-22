import { createApp } from './app.js'
import { reviewModelFrom, watchlistFrom } from './config.js'
import { createPool, dbConfig } from './db/pool.js'
import { migrate } from './db/migrate.js'
import { createYahoo } from './market/yahoo.js'
import { buildRouters } from './routes/index.js'

const port = Number(process.env.PORT ?? 3008)
const toolsDir = process.env.TOOLS_DIR ?? '/app/tools'

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
  const routers = buildRouters({
    pool,
    market: createYahoo(process.env.YAHOO_URL ?? 'http://yahoo-finance:3002'),
    ledgerPath: process.env.LEDGER_PATH ?? '/app/data/ledger/decisions.jsonl',
    newsUrl: process.env.NEWS_URL ?? 'http://news-aggregator:3004',
    ollamaUrl: process.env.OLLAMA_URL ?? 'http://host.docker.internal:11434',
    reviewModel: () => process.env.REVIEW_MODEL || reviewModelFrom(toolsDir),
    watchlist: () => watchlistFrom(toolsDir),
  })
  const app = createApp({ pool, routers })
  app.listen(port, () => console.log(`[portfolio-service] listening on ${port}`))
}

main().catch((e) => {
  console.error('[portfolio-service] failed to start:', e)
  process.exit(1)
})
