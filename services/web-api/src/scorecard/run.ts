import { rename, writeFile, unlink } from 'fs/promises'
import { loadLedger } from '../services/ledger-reader.js'
import { buildScorecard, parseBars, type Bar, type Scorecard, type ScoreInput } from './score.js'

export interface RunDeps {
  ledgerPath: string
  outPath: string
  yahooUrl: string
  fetchText: (url: string) => Promise<string>
  now: Date
  /** Called with a message when some ticker histories could not be fetched. */
  warn?: (message: string) => void
}

const BATCH = 6

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Scores every ledger call and writes scorecard.json (temp file, then rename). Throws without touching an
 * existing scorecard when the ledger is empty, SPY history fails, or no ticker history could be fetched.
 * A single failed ticker is counted as unscored so a delisted symbol cannot block the scorecard forever.
 */
export async function runScorecard(d: RunDeps): Promise<Scorecard> {
  const ledger = await loadLedger(d.ledgerPath)
  const calls: ScoreInput[] = []
  for (const rows of ledger.byDate.values()) {
    for (const r of rows) {
      calls.push({
        date: r.date,
        ticker: r.ticker,
        profile: r.profile,
        label: r.label,
        action_now: r.action_now,
        confidence: r.confidence,
        price: r.price,
        trigger_price: r.trigger_price,
        walk_away: r.walk_away,
      })
    }
  }
  if (calls.length === 0) throw new Error('The ledger has no calls to score')

  const start = calls.reduce((min, c) => (c.date < min ? c.date : min), calls[0].date)
  const end = isoDate(new Date(d.now.getTime() + 24 * 3600 * 1000))
  const history = async (ticker: string): Promise<Bar[]> =>
    parseBars(
      await d.fetchText(`${d.yahooUrl}/api/historical/${encodeURIComponent(ticker)}?startDate=${start}&endDate=${end}`),
    )

  const spy = await history('SPY')
  if (spy.length === 0) throw new Error('SPY history came back empty')

  const tickers = [...new Set(calls.map((c) => c.ticker))]
  const barsByTicker = new Map<string, Bar[]>()
  const failed: string[] = []
  for (let i = 0; i < tickers.length; i += BATCH) {
    const batch = tickers.slice(i, i + BATCH)
    const settled = await Promise.allSettled(batch.map(history))
    settled.forEach((s, j) => {
      if (s.status === 'fulfilled' && s.value.length > 0) barsByTicker.set(batch[j], s.value)
      else failed.push(batch[j])
    })
  }
  if (barsByTicker.size === 0) throw new Error('No ticker history could be fetched')
  if (failed.length > 0) d.warn?.(`History could not be fetched for ${failed.length} ticker(s): ${failed.join(', ')}`)

  const scorecard = buildScorecard(calls, barsByTicker, spy, d.now)
  const tmp = `${d.outPath}.tmp`
  try {
    await writeFile(tmp, JSON.stringify(scorecard, null, 2) + '\n', 'utf8')
    await rename(tmp, d.outPath)
  } catch (err) {
    await unlink(tmp).catch(() => undefined)
    throw err
  }
  return scorecard
}
