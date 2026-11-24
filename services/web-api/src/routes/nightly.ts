import { Router, type Response } from 'express'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { loadLedger } from '../services/ledger-reader.js'
import { deriveRows, summarize, expectedNightDate } from '../services/nightly-derive.js'
import { stockHistory, loadStages, pickReview, stockRow } from '../services/stock-detail.js'
import { loadRunStatus } from '../services/run-status.js'
import { loadStockExtras } from '../services/stock-extras.js'
import { loadStockMedia } from '../services/stock-media.js'
import { loadBrands } from '../services/brands.js'

const router = Router()

const DEFAULT_LEDGER_PATH = '/app/data/ledger/decisions.jsonl'
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TICKER_RE = /^[A-Z][A-Z0-9.\-]{0,9}$/
const DEFAULT_LOGS_PATH = '/app/logs/nightly'
const logsPath = () => process.env.NIGHTLY_LOGS_PATH || DEFAULT_LOGS_PATH

const ledgerPath = () => process.env.NIGHTLY_LEDGER_PATH || DEFAULT_LEDGER_PATH

function isRealDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false
  const d = new Date(`${s}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s
}

function fail(res: Response, status: number, error: string) {
  return res.status(status).json({ success: false, error })
}

async function night(res: Response, wanted: string | 'latest') {
  try {
    const ledger = await loadLedger(ledgerPath())
    const dates = [...ledger.byDate.keys()].sort().reverse()
    if (dates.length === 0) return fail(res, 404, 'No nightly data found')

    const date = wanted === 'latest' ? dates[0] : wanted
    const rows = ledger.byDate.get(date)
    if (!rows) return fail(res, 404, `No nightly data for ${date}`)

    const prevDate = dates[dates.indexOf(date) + 1]
    const derived = deriveRows(rows, prevDate ? ledger.byDate.get(prevDate) : undefined)
    const expected = expectedNightDate(new Date())

    return res.json({
      success: true,
      data: {
        date,
        profile: rows[0].profile,
        stale: date < expected,
        expected_date: expected,
        skipped_lines: ledger.skipped,
        rows: derived,
        summary: summarize(derived),
      },
    })
  } catch {
    return fail(res, 500, 'Failed to read nightly data')
  }
}

router.get('/dates', async (_req, res) => {
  try {
    const ledger = await loadLedger(ledgerPath())
    res.json({ success: true, data: [...ledger.byDate.keys()].sort().reverse() })
  } catch {
    fail(res, 500, 'Failed to read nightly data')
  }
})

router.get('/latest', (_req, res) => night(res, 'latest'))

router.get('/status', async (_req, res) => {
  try {
    const status = await loadRunStatus(logsPath())
    const ledger = await loadLedger(ledgerPath())
    const date = [...ledger.byDate.keys()].sort().reverse()[0]
    const rows = date ? (ledger.byDate.get(date) ?? []) : []
    const models = date
      ? {
          date,
          profile: rows[0]?.profile ?? '',
          fast_model: rows.find((r) => r.fast_model)?.fast_model,
          decision_model: rows.find((r) => r.decision_model)?.decision_model,
          rows: rows.length,
        }
      : null
    return res.json({ success: true, data: { status, models } })
  } catch {
    return fail(res, 500, 'Failed to read run status')
  }
})

router.get('/scorecard', async (_req, res) => {
  try {
    const text = await readFile(join(logsPath(), 'scorecard.json'), 'utf8')
    const parsed: unknown = JSON.parse(text.replace(/^\uFEFF/, ''))
    const ok = typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
    return res.json({ success: true, data: { scorecard: ok ? parsed : null } })
  } catch {
    // missing or unreadable file means "no scorecard yet", not a server error
    return res.json({ success: true, data: { scorecard: null } })
  }
})

const governmentDataUrl = () => process.env.GOVERNMENT_DATA_URL || 'http://government-data:3005'

/** Macro backdrop (BLS jobs and inflation, FRED rates and markets) as known on a night, for the Today page. */
router.get('/macro', async (req, res) => {
  const date = typeof req.query.date === 'string' ? req.query.date : undefined
  if (date !== undefined && !isRealDate(date)) return fail(res, 400, 'Date must be YYYY-MM-DD')
  const asOf = date ?? new Date().toISOString().slice(0, 10)
  try {
    // The first request of a date builds the summary from BLS and FRED (a few seconds); later ones are cached.
    const r = await fetch(`${governmentDataUrl()}/api/macro?asOf=${asOf}`, { signal: AbortSignal.timeout(60_000) })
    if (!r.ok) return fail(res, 502, `Macro data unavailable (government-data answered ${r.status})`)
    return res.json({ success: true, data: await r.json() })
  } catch {
    return fail(res, 502, 'Macro data unavailable (government-data could not be reached)')
  }
})

router.get('/stock/:ticker', async (req, res) => {
  const { ticker } = req.params
  if (!TICKER_RE.test(ticker)) return fail(res, 400, 'Invalid ticker')
  const wanted = typeof req.query.date === 'string' ? req.query.date : undefined
  if (wanted !== undefined && !isRealDate(wanted)) return fail(res, 400, 'Date must be YYYY-MM-DD')

  try {
    const ledger = await loadLedger(ledgerPath())
    const history = stockHistory(ledger.byDate, ticker)
    if (history.length === 0) return fail(res, 404, `No history for ${ticker}`)

    const date = wanted ?? history[history.length - 1].date
    if (!history.some((h) => h.date === date)) return fail(res, 404, `No data for ${ticker} on ${date}`)

    const stages = await loadStages(logsPath(), date, ticker)
    const row = stockRow(ledger.byDate, ticker, date)
    const review = pickReview(row?.educational_review)
    // Per-stage timing lean the nightly script recorded (market, rm, trader, pm: "now" or "wait").
    const rawStance = (row as { stance?: unknown } | undefined)?.stance
    const stance: Record<string, string> = {}
    if (rawStance && typeof rawStance === 'object') {
      for (const [k, v] of Object.entries(rawStance)) if (typeof v === 'string' && /^[a-z_]{1,20}$/.test(k)) stance[k] = v
    }
    return res.json({ success: true, data: { ticker, date, history, stages, review, stance } })
  } catch {
    return fail(res, 500, 'Failed to read nightly data')
  }
})

const yahooUrl = () => (process.env.YAHOO_URL || 'http://yahoo-finance:3002').replace(/\/$/, '')

async function fetchText(url: string): Promise<string> {
  const r = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!r.ok) throw new Error(`${url} answered ${r.status}`)
  return r.text()
}

/** Charts and regulatory watch for the stock page: daily prices, SEC quarters, regulatory matters. */
router.get('/stock/:ticker/extras', async (req, res) => {
  const { ticker } = req.params
  if (!TICKER_RE.test(ticker)) return fail(res, 400, 'Invalid ticker')
  const wanted = typeof req.query.date === 'string' ? req.query.date : undefined
  if (wanted !== undefined && !isRealDate(wanted)) return fail(res, 400, 'Date must be YYYY-MM-DD')
  try {
    const ledger = await loadLedger(ledgerPath())
    const history = stockHistory(ledger.byDate, ticker)
    if (history.length === 0) return fail(res, 404, `No history for ${ticker}`)
    const date = wanted ?? history[history.length - 1].date
    const data = await loadStockExtras(
      { yahooUrl: yahooUrl(), governmentDataUrl: governmentDataUrl(), fetchText, stagesFor: (d) => loadStages(logsPath(), d, ticker) },
      ticker,
      date,
      history,
    )
    return res.json({ success: true, data })
  } catch {
    return fail(res, 500, 'Failed to build the stock extras')
  }
})

/** News articles and social sentiment with links, for reading about a stock. */
router.get('/stock/:ticker/media', async (req, res) => {
  const { ticker } = req.params
  if (!TICKER_RE.test(ticker)) return fail(res, 400, 'Invalid ticker')
  try {
    const data = await loadStockMedia(
      {
        newsUrl: (process.env.NEWS_URL || 'http://news-aggregator:3004').replace(/\/$/, ''),
        socialUrl: (process.env.SOCIAL_URL || 'http://social-sentiment:3007').replace(/\/$/, ''),
        // News providers are queried in parallel and can take a while on a cold cache.
        fetchText: async (url) => {
          const r = await fetch(url, { signal: AbortSignal.timeout(60_000) })
          if (!r.ok) throw new Error(`${url} answered ${r.status}`)
          return r.text()
        },
      },
      ticker,
    )
    return res.json({ success: true, data })
  } catch {
    return fail(res, 500, 'Failed to load news and social data')
  }
})

/** Company name and website domain per ticker, for brand icons. ?tickers=KO,NVDA (at most 60). */
router.get('/brands', async (req, res) => {
  const raw = typeof req.query.tickers === 'string' ? req.query.tickers : ''
  const tickers = raw.split(',').map((t) => t.trim().toUpperCase()).filter((t) => TICKER_RE.test(t))
  if (!tickers.length) return fail(res, 400, 'Give tickers=A,B,C')
  try {
    return res.json({ success: true, data: await loadBrands({ yahooUrl: yahooUrl(), fetchText }, tickers) })
  } catch {
    return fail(res, 500, 'Failed to load brands')
  }
})

router.get('/:date', (req, res) => {
  const { date } = req.params
  if (!isRealDate(date)) return fail(res, 400, 'Date must be YYYY-MM-DD')
  return night(res, date)
})

export { router as nightlyRoutes }
