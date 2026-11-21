import { readFile, stat } from 'fs/promises'
import type { LedgerRow } from './nightly-derive.js'

export interface Ledger {
  byDate: Map<string, LedgerRow[]>
  skipped: number
}

const cache = new Map<string, { key: string; ledger: Ledger }>()

function isRow(v: unknown): v is LedgerRow {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return typeof r.date === 'string' && typeof r.ticker === 'string' && typeof r.price === 'number'
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

  const text = await readFile(path, 'utf8')
  const byDate = new Map<string, LedgerRow[]>()
  let skipped = 0
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    try {
      const parsed: unknown = JSON.parse(line)
      if (!isRow(parsed)) {
        skipped++
        continue
      }
      const row: LedgerRow = { ...parsed, stance: parsed.stance ?? {}, pm: parsed.pm ?? {} }
      const list = byDate.get(row.date)
      if (list) list.push(row)
      else byDate.set(row.date, [row])
    } catch {
      skipped++
    }
  }

  const ledger = { byDate, skipped }
  cache.set(path, { key, ledger })
  return ledger
}
