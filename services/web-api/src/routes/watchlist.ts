import { Router } from 'express'
import { loadLedger } from '../services/ledger-reader.js'
import { loadWatchlist, type Cadence } from '../services/watchlist.js'
import { appendRequest, readPending, validateRequest } from '../services/watchlist-requests.js'

const router = Router()

const DEFAULT_WATCHLIST_PATH = '/app/tools/watchlist.json'
const DEFAULT_REQUESTS_PATH = '/app/requests/watchlist.jsonl'
const MAX_PENDING = 25
const requestsPath = () => process.env.WATCHLIST_REQUESTS_PATH || DEFAULT_REQUESTS_PATH
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

    const pending = await readPending(requestsPath())

    res.json({
      success: true,
      data: {
        available: watch.available,
        skipped: watch.skipped,
        counts,
        pending: pending.map(({ id, at, action, ticker, list, cadence }) => ({ id, at, action, ticker, list, cadence })),
        stocks: watch.stocks.map((s) => ({ ...s, latest: latestBy.get(s.ticker) ?? null })),
      },
    })
  } catch {
    res.status(500).json({ success: false, error: 'Failed to read the watchlist' })
  }
})

// The page never edits watchlist.json. It queues a request; the nightly launcher applies it.
router.post('/requests', async (req, res) => {
  if (!req.is('application/json')) {
    res.status(415).json({ success: false, error: 'Send the request as JSON' })
    return
  }
  const checked = validateRequest(req.body)
  if (!checked.ok) {
    res.status(checked.status).json({ success: false, error: checked.error })
    return
  }
  const request = checked.request
  try {
    const watch = await loadWatchlist(process.env.WATCHLIST_PATH || DEFAULT_WATCHLIST_PATH)
    const pending = await readPending(requestsPath())
    if (pending.length >= MAX_PENDING) {
      res.status(429).json({ success: false, error: 'Too many changes are waiting for the next nightly run' })
      return
    }
    const listed = watch.stocks.some((s) => s.ticker === request.ticker)
    const pendingAdd = pending.some((p) => p.action === 'add' && p.ticker === request.ticker)
    if (request.action === 'add' && (listed || pendingAdd)) {
      res.status(409).json({ success: false, error: `${request.ticker} is already on the watchlist or waiting to be added` })
      return
    }
    if (request.action === 'set_cadence' && !listed && !pendingAdd) {
      res.status(404).json({ success: false, error: `${request.ticker} is not on the watchlist` })
      return
    }
    await appendRequest(requestsPath(), request)
    res.status(202).json({ success: true, data: { id: request.id } })
  } catch {
    res.status(500).json({ success: false, error: 'Could not save the request' })
  }
})

export { router as watchlistRoutes }
