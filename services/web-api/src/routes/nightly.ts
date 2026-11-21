import { Router, type Response } from 'express'
import { loadLedger } from '../services/ledger-reader.js'
import { deriveRows, summarize, expectedNightDate } from '../services/nightly-derive.js'
import { stockHistory, loadStages } from '../services/stock-detail.js'
import { loadRunStatus } from '../services/run-status.js'

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
    return res.json({ success: true, data: { ticker, date, history, stages } })
  } catch {
    return fail(res, 500, 'Failed to read nightly data')
  }
})

router.get('/:date', (req, res) => {
  const { date } = req.params
  if (!isRealDate(date)) return fail(res, 400, 'Date must be YYYY-MM-DD')
  return night(res, date)
})

export { router as nightlyRoutes }
