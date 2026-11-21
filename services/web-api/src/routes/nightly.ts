import { Router, type Response } from 'express'
import { loadLedger } from '../services/ledger-reader.js'
import { deriveRows, summarize, expectedNightDate } from '../services/nightly-derive.js'

const router = Router()

const DEFAULT_LEDGER_PATH = '/app/data/ledger/decisions.jsonl'
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

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

router.get('/:date', (req, res) => {
  const { date } = req.params
  if (!isRealDate(date)) return fail(res, 400, 'Date must be YYYY-MM-DD')
  return night(res, date)
})

export { router as nightlyRoutes }
