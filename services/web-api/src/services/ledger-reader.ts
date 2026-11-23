import { readFile, stat } from 'fs/promises'
import type { LedgerRow } from './nightly-derive.js'

export interface Ledger {
  byDate: Map<string, LedgerRow[]>
  skipped: number
}

const cache = new Map<string, { key: string; ledger: Ledger }>()

const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)
const optStr = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined)

/**
 * Ledger rows contain raw LLM output (pm), so nothing past date/ticker/price is trusted:
 * bad optional fields are dropped or defaulted instead of failing the whole night.
 */
function normalizeRow(raw: unknown): LedgerRow | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  const price = num(r.price)
  if (typeof r.date !== 'string' || typeof r.ticker !== 'string' || price === undefined) return null

  const pm = typeof r.pm === 'object' && r.pm !== null ? (r.pm as Record<string, unknown>) : {}
  const stance: Record<string, string> = {}
  if (typeof r.stance === 'object' && r.stance !== null) {
    for (const [k, v] of Object.entries(r.stance)) if (typeof v === 'string') stance[k] = v
  }

  return {
    date: r.date,
    ticker: r.ticker,
    group: str(r.group),
    profile: str(r.profile),
    label: str(r.label),
    action_now: str(r.action_now),
    decision: str(r.decision),
    confidence: num(r.confidence) ?? 0,
    price,
    trigger_price: num(r.trigger_price),
    trigger_type: optStr(r.trigger_type),
    trigger_reason: optStr(r.trigger_reason),
    walk_away: num(r.walk_away),
    atr: num(r.atr),
    ma50: num(r.ma50),
    ma200: num(r.ma200),
    educational_review: r.educational_review ?? undefined,
    fast_model: optStr(r.fast_model),
    decision_model: optStr(r.decision_model),
    stance,
    pm: {
      rationale: optStr(pm.rationale),
      key_risks: Array.isArray(pm.key_risks) ? pm.key_risks.filter((k): k is string => typeof k === 'string') : [],
      what_would_change_my_mind: optStr(pm.what_would_change_my_mind),
    },
  }
}

export async function loadLedger(path: string): Promise<Ledger> {
  let info
  try {
    info = await stat(path)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { byDate: new Map(), skipped: 0 }
    throw err
  }

  const key = `${info.mtimeMs}:${info.size}`
  const hit = cache.get(path)
  if (hit && hit.key === key) return hit.ledger

  // PowerShell 5.1 writes a BOM when it creates the file; JSON.parse rejects it.
  const text = (await readFile(path, 'utf8')).replace(/^\uFEFF/, '')
  const byDate = new Map<string, LedgerRow[]>()
  let skipped = 0
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    try {
      const row = normalizeRow(JSON.parse(line))
      if (!row) {
        skipped++
        continue
      }
      const list = byDate.get(row.date)
      if (list) list.push(row)
      else byDate.set(row.date, [row])
    } catch {
      skipped++
    }
  }

  // The ledger key is date+ticker+profile, so a night re-run with another model profile leaves
  // both sets behind. Serve only the profile written last for each date.
  for (const [date, rows] of byDate) {
    const profiles = rows.map((r) => r.profile).filter(Boolean)
    const last = profiles[profiles.length - 1]
    if (new Set(profiles).size > 1) byDate.set(date, rows.filter((r) => !r.profile || r.profile === last))
  }

  const ledger = { byDate, skipped }
  cache.set(path, { key, ledger })
  return ledger
}
