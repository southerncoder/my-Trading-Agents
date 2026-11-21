import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { runScorecard } from './run.js'

const csv = (rows: string[]) => `# Stock data\n\nDate,Open,High,Low,Close,Adj Close,Volume\n${rows.join('\n')}\n`
const SPY = csv(['2026-11-20,500,500,500,500,500,1', '2026-11-23,500,505,499,505,505,1'])
const AAA = csv(['2026-11-23,100,104,99,103,103,1'])

function setup(extra: object[] = []) {
  const dir = mkdtempSync(join(tmpdir(), 'score-'))
  const ledger = join(dir, 'decisions.jsonl')
  const rows = [
    { date: '2026-11-20', ticker: 'AAA', profile: 'ollama-cloud', label: 'Buy now', action_now: 'buy_now', confidence: 0.65, price: 100 },
    { date: '2026-11-20', ticker: 'BBB', profile: 'ollama-cloud', label: 'Buy now', action_now: 'buy_now', confidence: 0.65, price: 50 },
    ...extra,
  ]
  writeFileSync(ledger, '﻿' + rows.map((r) => JSON.stringify(r)).join('\n'))
  return { dir, ledger, out: join(dir, 'scorecard.json') }
}

const deps = (p: ReturnType<typeof setup>, fetchText: (u: string) => Promise<string>) => ({
  ledgerPath: p.ledger,
  outPath: p.out,
  yahooUrl: 'http://yahoo.test',
  fetchText,
  now: new Date('2026-11-23T23:00:00Z'),
})

const ok = async (url: string) => {
  if (url.includes('/historical/SPY')) return SPY
  if (url.includes('/historical/AAA')) return AAA
  throw new Error('no data')
}

describe('runScorecard', () => {
  it('writes scorecard.json; a ticker whose history fails is counted unscored', async () => {
    const p = setup()
    const sc = await runScorecard(deps(p, ok))
    expect(sc.calls).toBe(2)
    expect(sc.unscored).toBe(1)
    expect(sc.matured['1']).toBe(1)
    expect(JSON.parse(readFileSync(p.out, 'utf8')).benchmark).toBe('SPY')
  })

  it('requests history from the earliest call date through tomorrow', async () => {
    const p = setup()
    const urls: string[] = []
    await runScorecard(deps(p, async (u) => (urls.push(u), ok(u))))
    const spyUrl = urls.find((u) => u.includes('/historical/SPY')) ?? ''
    expect(spyUrl).toContain('http://yahoo.test/api/historical/SPY?startDate=2026-11-20&endDate=2026-11-24')
  })

  it('SPY failure throws and keeps the previous scorecard.json', async () => {
    const p = setup()
    writeFileSync(p.out, '{"previous":true}')
    await expect(runScorecard(deps(p, async (u) => (u.includes('/SPY') ? Promise.reject(new Error('down')) : AAA)))).rejects.toThrow()
    expect(readFileSync(p.out, 'utf8')).toBe('{"previous":true}')
  })

  it('every ticker failing throws and writes nothing', async () => {
    const p = setup()
    await expect(runScorecard(deps(p, async (u) => (u.includes('/SPY') ? SPY : Promise.reject(new Error('down')))))).rejects.toThrow()
    expect(existsSync(p.out)).toBe(false)
  })

  it('empty ledger throws instead of writing an empty scorecard', async () => {
    const p = setup()
    writeFileSync(p.ledger, '')
    await expect(runScorecard(deps(p, ok))).rejects.toThrow(/ledger/i)
  })

  it('leaves no temp file behind', async () => {
    const p = setup()
    await runScorecard(deps(p, ok))
    expect(existsSync(p.out + '.tmp')).toBe(false)
  })
})

describe('runScorecard partial failures', () => {
  it('still writes, but reports every ticker whose history failed through warn', async () => {
    const p = setup()
    const warnings: string[] = []
    await runScorecard({ ...deps(p, ok), warn: (m: string) => warnings.push(m) })
    expect(existsSync(p.out)).toBe(true)
    expect(warnings.join(' ')).toContain('BBB')
    expect(warnings.join(' ')).not.toContain('AAA')
  })

  it('removes the temp file when the rename fails', async () => {
    const p = setup()
    mkdirSync(p.out) // outPath is a directory, so rename onto it fails
    await expect(runScorecard(deps(p, ok))).rejects.toThrow()
    expect(existsSync(p.out + '.tmp')).toBe(false)
  })
})