import { describe, it, expect } from 'vitest'
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { validateRequest, readPending, appendRequest } from './watchlist-requests.js'

function ok(body: unknown) {
  const r = validateRequest(body)
  if (!r.ok) throw new Error(`expected ok, got ${r.status} ${r.error}`)
  return r.request
}
function bad(body: unknown) {
  const r = validateRequest(body)
  if (r.ok) throw new Error('expected rejection')
  return r
}

describe('validateRequest', () => {
  it('accepts an add and normalizes the ticker, list and schedule', () => {
    const r = ok({ action: 'add', ticker: ' ko ', list: 'brands', cadence: 'Weekly', lesson: 'Dividend name' })
    expect(r).toMatchObject({ action: 'add', ticker: 'KO', list: 'brands', cadence: 'weekly', lesson: 'Dividend name' })
    expect(typeof r.id).toBe('string')
    expect(r.id.length).toBeGreaterThan(8)
    expect(Number.isNaN(Date.parse(r.at))).toBe(false)
  })

  it('accepts set_cadence without a list', () => {
    const r = ok({ action: 'set_cadence', ticker: 'NVDA', cadence: 'paused' })
    expect(r).toMatchObject({ action: 'set_cadence', ticker: 'NVDA', cadence: 'paused' })
    expect(r.list).toBeUndefined()
  })

  it('rejects anything that is not a plain object', () => {
    for (const b of [null, undefined, 'x', 5, [], [{ action: 'add' }]]) expect(bad(b).status).toBe(400)
  })

  it('rejects hostile or path-like tickers', () => {
    for (const t of ['NVDA"}],"x":1', '../etc', 'A/B', 'A B', '', 'TOOLONGTICKER1', '1ABC', 'NV\nDA']) {
      expect(bad({ action: 'add', ticker: t, list: 'core', cadence: 'nightly' }).status).toBe(400)
    }
  })

  it('rejects a non-string ticker, list, or cadence', () => {
    expect(bad({ action: 'add', ticker: { a: 1 }, list: 'core', cadence: 'nightly' }).status).toBe(400)
    expect(bad({ action: 'add', ticker: 'KO', list: ['core'], cadence: 'nightly' }).status).toBe(400)
    expect(bad({ action: 'add', ticker: 'KO', list: 'core', cadence: 7 }).status).toBe(400)
  })

  it('rejects an unknown action, list, or schedule', () => {
    expect(bad({ action: 'remove', ticker: 'KO', cadence: 'nightly' }).status).toBe(400)
    expect(bad({ action: 'add', ticker: 'KO', list: 'other', cadence: 'nightly' }).status).toBe(400)
    expect(bad({ action: 'add', ticker: 'KO', list: 'core', cadence: 'hourly' }).status).toBe(400)
    expect(bad({ action: 'add', ticker: 'KO', cadence: 'nightly' }).status).toBe(400)
  })

  it('strips control characters from the note and caps it at 200 characters', () => {
    const r = ok({ action: 'add', ticker: 'KO', list: 'core', cadence: 'nightly', lesson: `a\u0000b\nc${'x'.repeat(300)}` })
    expect([...r.lesson!].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127)).toBe(false)
    expect(r.lesson!.length).toBeLessThanOrEqual(200)
  })

  it('drops an empty note and ignores unknown extra fields', () => {
    const r = ok({ action: 'add', ticker: 'KO', list: 'core', cadence: 'nightly', lesson: '   ', evil: 'x' })
    expect(r.lesson).toBeUndefined()
    expect(Object.keys(r)).not.toContain('evil')
  })
})

describe('queue file', () => {
  const file = () => join(mkdtempSync(join(tmpdir(), 'wlq-')), 'sub', 'watchlist.jsonl')

  it('returns nothing when the queue does not exist', async () => {
    expect(await readPending(file())).toEqual([])
  })

  it('appends one JSON line per request, creating the folder, and reads them back', async () => {
    const p = file()
    await appendRequest(p, ok({ action: 'add', ticker: 'KO', list: 'core', cadence: 'nightly' }))
    await appendRequest(p, ok({ action: 'set_cadence', ticker: 'NVDA', cadence: 'weekly' }))
    const lines = readFileSync(p, 'utf8').trim().split('\n')
    expect(lines).toHaveLength(2)
    const pending = await readPending(p)
    expect(pending.map((r) => r.ticker)).toEqual(['KO', 'NVDA'])
  })

  it('also counts requests left in a crashed .processing file and skips unreadable lines', async () => {
    const p = file()
    await appendRequest(p, ok({ action: 'add', ticker: 'KO', list: 'core', cadence: 'nightly' }))
    writeFileSync(`${p}.processing`, `${JSON.stringify(ok({ action: 'add', ticker: 'PEP', list: 'core', cadence: 'nightly' }))}\nnot json\n`)
    const pending = await readPending(p)
    expect(pending.map((r) => r.ticker).sort()).toEqual(['KO', 'PEP'])
    expect(existsSync(`${p}.processing`)).toBe(true)
  })
})
