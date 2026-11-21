import { describe, it, expect } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { stockHistory, loadStages, STAGE_KEYS } from './stock-detail.js'
import type { LedgerRow } from './nightly-derive.js'

const mk = (date: string, ticker: string, price: number): LedgerRow => ({
  date, ticker, group: 'core', profile: 'p', label: 'Buy now', action_now: 'a', decision: 'BUY',
  confidence: 0.5, price, stance: {}, pm: {},
})

function logs(date: string, body: string | Buffer) {
  const dir = mkdtempSync(join(tmpdir(), 'logs-'))
  mkdirSync(join(dir, date))
  writeFileSync(join(dir, date, 'pipeline.json'), body)
  return dir
}

describe('stockHistory', () => {
  it('lists only nights containing the ticker, oldest first', () => {
    const byDate = new Map([
      ['2026-11-20', [mk('2026-11-20', 'AAA', 3), mk('2026-11-20', 'BBB', 9)]],
      ['2026-11-18', [mk('2026-11-18', 'AAA', 1)]],
      ['2026-11-19', [mk('2026-11-19', 'BBB', 8)]],
    ])
    expect(stockHistory(byDate, 'AAA').map((h) => [h.date, h.price])).toEqual([['2026-11-18', 1], ['2026-11-20', 3]])
    expect(stockHistory(byDate, 'ZZZ')).toEqual([])
  })
})

describe('loadStages', () => {
  const full = Object.fromEntries(STAGE_KEYS.map((k) => [k, `text ${k}`]))

  it('returns only string stages', async () => {
    const dir = logs('2026-11-20', JSON.stringify({ AAA: { ...full, bull: 5, pm_json: {} } }))
    const s = await loadStages(dir, '2026-11-20', 'AAA')
    expect(s?.market).toBe('text market')
    expect(s && 'bull' in s).toBe(false)
    expect(s && 'pm_json' in s).toBe(false)
  })

  it('strips a BOM', async () => {
    const dir = logs('2026-11-20', '\uFEFF' + JSON.stringify({ AAA: full }))
    expect((await loadStages(dir, '2026-11-20', 'AAA'))?.pm).toBe('text pm')
  })

  it('null for missing file, unparsable file, or missing ticker', async () => {
    expect(await loadStages(join(tmpdir(), 'no-such-dir-xyz'), '2026-11-20', 'AAA')).toBeNull()
    expect(await loadStages(logs('2026-11-20', '{not json'), '2026-11-20', 'AAA')).toBeNull()
    expect(await loadStages(logs('2026-11-20', JSON.stringify({ BBB: full })), '2026-11-20', 'AAA')).toBeNull()
  })
})