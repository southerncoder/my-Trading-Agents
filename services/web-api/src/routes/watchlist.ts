import { Router } from 'express'
import { loadLedger } from '../services/ledger-reader.js'
import { loadWatchlist, type Cadence } from '../services/watchlist.js'

const router = Router()

const DEFAULT_WATCHLIST_PATH = '/app/tools/watchlist.json'
const DEFAULT_LEDGER_PATH = '/app/data/ledger/decisions.jsonl'

router.get('/', async (_req, res) => {
  try {
    const watch = await loadWatchlist(process.env.WATCHLIST_PATH || DEFAULT_WATCHLIST_PATH)
    const ledger = await loadLedger(process.env.NIGHTLY_LEDGER_PATH || DEFAULT_LEDGER_PATH)

    // Latest call per ticker: walk nights oldest to newest so the last write wins.
    const latestBy = new Map<string, { date: string; price: number; label: string; decision: string; confidence: number; trigger_price?: number }>()
    for (const date of [...ledger.byDate.keys()].sort()) {
      for (const r of ledger.byDate.get(date) ?? []) {
        latestBy.set(r.ticker, {
          date,
          price: r.price,
          label: r.label,
          decision: r.decision,
          confidence: r.confidence,
          ...(r.trigger_price !== undefined ? { trigger_price: r.trigger_price } : {}),
        })
      }
    }

    const counts: Record<Cadence, number> = { nightly: 0, weekly: 0, once: 0, paused: 0 }
    for (const s of watch.stocks) counts[s.cadence]++

    res.json({
      success: true,
      data: {
        available: watch.available,
        skipped: watch.skipped,
        counts,
        stocks: watch.stocks.map((s) => ({ ...s, latest: latestBy.get(s.ticker) ?? null })),
      },
    })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to read the watchlist' })
  }
})

export { router as watchlistRoutes }
