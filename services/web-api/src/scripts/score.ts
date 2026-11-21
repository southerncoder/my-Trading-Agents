// Host-side entry: npm run score (from services/web-api). Called by tools/nightly-run.ps1 after the brief.
import { join, resolve } from 'path'
import { runScorecard } from '../scorecard/run.js'

const ledgerPath = resolve(process.env.NIGHTLY_LEDGER_PATH || '../../data/ledger/decisions.jsonl')
const logsDir = resolve(process.env.NIGHTLY_LOGS_PATH || '../../logs/nightly')
const yahooUrl = (process.env.YAHOO_URL || 'http://localhost:38402').replace(/\/$/, '')

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(40_000) })
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`)
  return res.text()
}

try {
  const sc = await runScorecard({ ledgerPath, outPath: join(logsDir, 'scorecard.json'), yahooUrl, fetchText, now: new Date() })
  console.log(
    `Scorecard written: ${sc.calls} calls, ${sc.unscored} unscored, matured 1d/3d/5d = ${sc.matured['1']}/${sc.matured['3']}/${sc.matured['5']}`,
  )
} catch (err) {
  console.error(`Scorecard not updated: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
}
