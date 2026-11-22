import { existsSync, readFileSync } from 'node:fs'
import type pg from 'pg'
import { analysisSchema, sourceForGroup, upsertCandidate, type Analysis } from '../store/candidates.js'

/**
 * Copies one night's calls from the nightly decision ledger (data/ledger/decisions.jsonl) into the decision
 * journal. Unreadable lines are counted and skipped. When a ticker appears twice for the night (a re-run),
 * the later line wins, as it does in the ledger itself.
 */
export async function ingestLedger(pool: pg.Pool, path: string, date: string) {
  if (!existsSync(path)) return { stored: 0, skippedLines: 0, missing: true }
  const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '')
  const latest = new Map<string, Analysis>()
  let skippedLines = 0
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue
    let parsed: Analysis
    try {
      const r = analysisSchema.safeParse(JSON.parse(raw))
      if (!r.success) throw new Error('shape')
      parsed = r.data
    } catch {
      skippedLines++
      continue
    }
    if (parsed.date !== date) continue
    latest.set(`${parsed.ticker}|${sourceForGroup(parsed.group)}`, parsed)
  }
  let stored = 0
  for (const a of latest.values()) {
    if ((await upsertCandidate(pool, a, sourceForGroup(a.group))) !== null) stored++
  }
  return { stored, skippedLines, missing: false }
}
