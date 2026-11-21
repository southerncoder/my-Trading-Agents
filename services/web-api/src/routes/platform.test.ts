import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import type { AddressInfo } from 'net'
import type { Server } from 'http'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'
import { mkdtempSync, mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { nightlyRoutes } from './nightly.js'
import { watchlistRoutes } from './watchlist.js'

const here = dirname(fileURLToPath(import.meta.url))
const LEDGER = join(here, '__fixtures__', 'ledger.jsonl')
const LOGS = join(here, '__fixtures__', 'nightly-logs')

let server: Server
let base: string

beforeAll(async () => {
  const app = express()
  app.use('/api/nightly', nightlyRoutes)
  app.use('/api/watchlist', watchlistRoutes)
  await new Promise<void>((r) => {
    server = app.listen(0, '127.0.0.1', () => r())
  })
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`
})

afterAll(() => new Promise<void>((r) => server.close(() => r())))

function tmpFile(name: string, content: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'plat-'))
  const p = join(dir, name)
  writeFileSync(p, content)
  return p
}

async function get(path: string, env: Record<string, string>) {
  Object.assign(process.env, env)
  const res = await fetch(`${base}${path}`)
  return { status: res.status, body: await res.json() }
}

describe('GET /api/watchlist', () => {
  const wl = () =>
    tmpFile(
      'watchlist.json',
      JSON.stringify({
        stocks: [
          { ticker: 'AAA', list: 'core', cadence: 'nightly' },
          { ticker: 'NEWCO', list: 'brands', cadence: 'weekly' },
          { ticker: 'PAUSED', list: 'core', cadence: 'paused' },
          { ticker: 'bad ticker', list: 'core', cadence: 'nightly' },
        ],
      }),
    )

  it('joins each stock to its latest ledger call, null when it has no history', async () => {
    const { status, body } = await get('/watchlist', { WATCHLIST_PATH: wl(), NIGHTLY_LEDGER_PATH: LEDGER })
    expect(status).toBe(200)
    expect(body.data.available).toBe(true)
    expect(body.data.skipped).toBe(1)
    const byTicker = Object.fromEntries(body.data.stocks.map((s: { ticker: string }) => [s.ticker, s]))
    expect(byTicker.AAA.latest.date).toBe('2026-11-20')
    expect(typeof byTicker.AAA.latest.price).toBe('number')
    expect(byTicker.NEWCO.latest).toBeNull()
    expect(byTicker.PAUSED.latest).toBeNull()
  })

  it('counts stocks by cadence', async () => {
    const { body } = await get('/watchlist', { WATCHLIST_PATH: wl(), NIGHTLY_LEDGER_PATH: LEDGER })
    expect(body.data.counts).toEqual({ nightly: 1, weekly: 1, once: 0, paused: 1 })
  })

  it('missing watchlist -> 200 available:false, empty stocks', async () => {
    const { status, body } = await get('/watchlist', {
      WATCHLIST_PATH: join(tmpdir(), 'nope-wl', 'watchlist.json'),
      NIGHTLY_LEDGER_PATH: LEDGER,
    })
    expect(status).toBe(200)
    expect(body.data).toMatchObject({ available: false, stocks: [], skipped: 0 })
  })

  it('missing ledger still lists the watchlist with latest null', async () => {
    const { status, body } = await get('/watchlist', {
      WATCHLIST_PATH: wl(),
      NIGHTLY_LEDGER_PATH: join(tmpdir(), 'nope-ledger', 'decisions.jsonl'),
    })
    expect(status).toBe(200)
    expect(body.data.stocks.every((s: { latest: unknown }) => s.latest === null)).toBe(true)
  })
})

describe('GET /api/nightly/status', () => {
  it('returns the newest status lines and the latest night models', async () => {
    const root = mkdtempSync(join(tmpdir(), 'plat-logs-'))
    mkdirSync(join(root, '2026-11-20'))
    writeFileSync(join(root, '2026-11-20', 'status.txt'), 'Calls: 3\nTook 2 minutes\n')
    const ledger = tmpFile(
      'decisions.jsonl',
      [
        { date: '2026-11-20', ticker: 'AAA', profile: 'ollama-cloud', price: 1, fast_model: 'fast-x', decision_model: 'deep-y' },
        { date: '2026-11-20', ticker: 'BBB', profile: 'ollama-cloud', price: 2 },
      ]
        .map((r) => JSON.stringify(r))
        .join('\n'),
    )
    const { status, body } = await get('/nightly/status', { NIGHTLY_LOGS_PATH: root, NIGHTLY_LEDGER_PATH: ledger })
    expect(status).toBe(200)
    expect(body.data.status).toEqual({ date: '2026-11-20', lines: ['Calls: 3', 'Took 2 minutes'] })
    expect(body.data.models).toEqual({
      date: '2026-11-20',
      profile: 'ollama-cloud',
      fast_model: 'fast-x',
      decision_model: 'deep-y',
      rows: 2,
    })
  })

  it('no status.txt and no ledger -> 200 with both null', async () => {
    const { status, body } = await get('/nightly/status', {
      NIGHTLY_LOGS_PATH: mkdtempSync(join(tmpdir(), 'plat-empty-')),
      NIGHTLY_LEDGER_PATH: join(tmpdir(), 'nope-ledger', 'decisions.jsonl'),
    })
    expect(status).toBe(200)
    expect(body.data).toEqual({ status: null, models: null })
  })

  it('is not swallowed by the /:date route', async () => {
    const { status } = await get('/nightly/status', { NIGHTLY_LOGS_PATH: LOGS, NIGHTLY_LEDGER_PATH: LEDGER })
    expect(status).toBe(200)
  })
})
