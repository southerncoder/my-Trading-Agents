import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import type { AddressInfo } from 'net'
import type { Server } from 'http'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import { writeFileSync, mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { nightlyRoutes } from './nightly.js'

const here = dirname(fileURLToPath(import.meta.url))
const FIXTURE = join(here, '__fixtures__', 'ledger.jsonl')

let server: Server
let base: string

beforeAll(async () => {
  const app = express()
  app.use('/api/nightly', nightlyRoutes)
  await new Promise<void>((r) => {
    server = app.listen(0, '127.0.0.1', () => r())
  })
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/nightly`
})

afterAll(() => new Promise<void>((r) => server.close(() => r())))

async function get(path: string, ledger: string | undefined = FIXTURE) {
  if (ledger === undefined) delete process.env.NIGHTLY_LEDGER_PATH
  else process.env.NIGHTLY_LEDGER_PATH = ledger
  const res = await fetch(`${base}${path}`)
  return { status: res.status, body: await res.json() }
}

describe('nightly routes', () => {
  it('GET /dates returns newest first', async () => {
    const { status, body } = await get('/dates')
    expect(status).toBe(200)
    expect(body.data).toEqual(['2026-11-20', '2026-11-19', '2026-11-18'])
  })

  it('GET /latest returns derived rows and summary', async () => {
    const { status, body } = await get('/latest')
    expect(status).toBe(200)
    expect(body.data.date).toBe('2026-11-20')
    expect(body.data.rows).toHaveLength(2)
    const aaa = body.data.rows.find((r: { ticker: string }) => r.ticker === 'AAA')
    expect(aaa.change_pct).toBeCloseTo((99 / 102 - 1) * 100, 6)
    expect(aaa.inside_half_day).toBe(true)
    const bbb = body.data.rows.find((r: { ticker: string }) => r.ticker === 'BBB')
    expect(bbb.distance_to_trigger_pct).toBeNull()
    expect(body.data.summary.by_label['Buy now']).toBe(1)
    expect(typeof body.data.stale).toBe('boolean')
    expect(body.data.expected_date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('GET /2026-11-19 returns that night', async () => {
    const { status, body } = await get('/2026-11-19')
    expect(status).toBe(200)
    expect(body.data.date).toBe('2026-11-19')
    expect(body.data.rows[0].price).toBe(102)
  })

  it('first night in the ledger has null change_pct', async () => {
    const { body } = await get('/2026-11-18')
    expect(body.data.rows.every((r: { change_pct: number | null }) => r.change_pct === null)).toBe(true)
  })

  it('skipped_lines counts the malformed line', async () => {
    const { body } = await get('/latest')
    expect(body.data.skipped_lines).toBe(1)
  })

  it('GET /2026-13-45 is 400', async () => {
    expect((await get('/2026-13-45')).status).toBe(400)
  })

  it('path-like date is 400', async () => {
    expect((await get('/..%2f..%2fetc')).status).toBe(400)
  })

  it('unknown valid date is 404', async () => {
    expect((await get('/2025-01-02')).status).toBe(404)
  })

  it('missing ledger file: dates [] and latest 404', async () => {
    const missing = join(here, '__fixtures__', 'does-not-exist.jsonl')
    expect((await get('/dates', missing)).body.data).toEqual([])
    expect((await get('/latest', missing)).status).toBe(404)
  })

  it('a ledger file that starts with a UTF-8 BOM still loads its first row', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ledger-'))
    const file = join(dir, 'decisions.jsonl')
    const line = '{"date":"2026-11-16","ticker":"NVDA","group":"core","profile":"hybrid","label":"x","action_now":"a","decision":"HOLD","confidence":0.5,"price":156.14,"stance":{},"pm":{}}'
    writeFileSync(file, '\uFEFF' + line + '\n', 'utf8')
    const { body } = await get('/latest', file)
    expect(body.data.rows).toHaveLength(1)
    expect(body.data.skipped_lines).toBe(0)
  })

  const base = { date: '2026-11-20', ticker: 'AAA', group: 'core', profile: 'ollama-cloud', label: 'Buy now', action_now: 'buy_now', decision: 'BUY', confidence: 0.7, price: 10, stance: {}, pm: {} }
  const tmp = (rows: unknown[]) => {
    const file = join(mkdtempSync(join(tmpdir(), 'ledger-')), 'decisions.jsonl')
    writeFileSync(file, rows.map((r) => JSON.stringify(r)).join('\n') + '\n', 'utf8')
    return file
  }

  it('a row with malformed optional fields is normalised, not served broken', async () => {
    const file = tmp([
      { ...base, ticker: 'BAD', confidence: null, profile: undefined, group: undefined, pm: { key_risks: 'rising rates', rationale: 5 } },
      { ...base, ticker: 'OK' },
    ])
    const { body } = await get('/latest', file)
    const bad = body.data.rows.find((r: { ticker: string }) => r.ticker === 'BAD')
    expect(typeof bad.confidence).toBe('number')
    expect(typeof bad.profile).toBe('string')
    expect(typeof bad.group).toBe('string')
    expect(Array.isArray(bad.pm.key_risks)).toBe(true)
    expect(bad.pm.rationale).toBeUndefined()
    expect(body.data.rows).toHaveLength(2)
  })

  it('two profiles on one night: only the last written profile is served', async () => {
    const file = tmp([
      { ...base, ticker: 'AAA', profile: 'ollama-cloud' },
      { ...base, ticker: 'BBB', profile: 'ollama-cloud' },
      { ...base, ticker: 'AAA', profile: 'hybrid' },
    ])
    const { body } = await get('/latest', file)
    expect(body.data.profile).toBe('hybrid')
    expect(body.data.rows.map((r: { ticker: string }) => r.ticker)).toEqual(['AAA'])
  })
})

describe('stock detail route', () => {
  const LOGS = join(here, '__fixtures__', 'logs')
  const stock = async (path: string) => {
    process.env.NIGHTLY_LOGS_PATH = LOGS
    return get(`/stock${path}`)
  }

  it('200 with history and stages', async () => {
    const { status, body } = await stock('/AAA')
    expect(status).toBe(200)
    expect(body.data.ticker).toBe('AAA')
    expect(body.data.date).toBe('2026-11-20')
    expect(body.data.history.map((h: { date: string }) => h.date)).toEqual(['2026-11-18', '2026-11-19', '2026-11-20'])
    expect(body.data.stages.market).toContain('strong')
    expect('bull' in body.data.stages).toBe(false)
  })

  it('date without pipeline -> stages null', async () => {
    const { status, body } = await stock('/AAA?date=2026-11-19')
    expect(status).toBe(200)
    expect(body.data.date).toBe('2026-11-19')
    expect(body.data.stages).toBeNull()
  })

  it('lowercase, too long or path-like ticker -> 400', async () => {
    expect((await stock('/aaa')).status).toBe(400)
    expect((await stock('/ABCDEFGHIJK')).status).toBe(400)
    expect((await stock('/..%2f..%2fetc')).status).toBe(400)
  })

  it('unknown ticker -> 404, bad date -> 400, date not in ledger -> 404', async () => {
    expect((await stock('/ZZZ')).status).toBe(404)
    expect((await stock('/AAA?date=2026-13-45')).status).toBe(400)
    expect((await stock('/AAA?date=2025-01-02')).status).toBe(404)
  })

  it('ticker on only some nights lists only those nights', async () => {
    const { body } = await stock('/BBB')
    expect(body.data.history.length).toBeGreaterThan(0)
  })
})