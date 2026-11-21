import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import express from 'express'
import type { AddressInfo } from 'net'
import type { Server } from 'http'
import { join } from 'path'
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import { watchlistRoutes } from './watchlist.js'

let server: Server
let base: string

beforeAll(async () => {
  const app = express()
  app.use(express.json({ limit: '10mb' }))
  app.use('/api/watchlist', watchlistRoutes)
  await new Promise<void>((r) => {
    server = app.listen(0, '127.0.0.1', () => r())
  })
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/watchlist`
})
afterAll(() => new Promise<void>((r) => server.close(() => r())))

function setup(stocks: unknown[] = [{ ticker: 'NVDA', list: 'core', cadence: 'nightly' }]) {
  const dir = mkdtempSync(join(tmpdir(), 'wlr-'))
  const wl = join(dir, 'watchlist.json')
  writeFileSync(wl, JSON.stringify({ stocks }))
  const queue = join(dir, 'requests', 'watchlist.jsonl')
  process.env.WATCHLIST_PATH = wl
  process.env.WATCHLIST_REQUESTS_PATH = queue
  process.env.NIGHTLY_LEDGER_PATH = join(dir, 'none.jsonl')
  return { queue }
}

const post = (body: unknown, headers: Record<string, string> = { 'content-type': 'application/json' }) =>
  fetch(`${base}/requests`, { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) })

const add = (ticker: string) => ({ action: 'add', ticker, list: 'core', cadence: 'nightly' })

describe('POST /api/watchlist/requests', () => {
  it('queues a valid add: 202 with an id, one line in the queue file', async () => {
    const { queue } = setup()
    const res = await post(add('ko'))
    expect(res.status).toBe(202)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(typeof body.data.id).toBe('string')
    const lines = readFileSync(queue, 'utf8').trim().split('\n')
    expect(lines).toHaveLength(1)
    expect(JSON.parse(lines[0])).toMatchObject({ action: 'add', ticker: 'KO', id: body.data.id })
  })

  it('rejects a non-JSON content type with 415 and queues nothing', async () => {
    const { queue } = setup()
    const res = await post(JSON.stringify(add('KO')), { 'content-type': 'text/plain' })
    expect(res.status).toBe(415)
    expect(existsSync(queue)).toBe(false)
  })

  it('rejects invalid input with 400 and queues nothing', async () => {
    const { queue } = setup()
    for (const b of [add('NVDA"}],"x":1'), { action: 'add', ticker: 'KO', list: 'x', cadence: 'nightly' }, [add('KO')], 'null']) {
      const res = await post(b)
      expect(res.status).toBe(400)
    }
    expect(existsSync(queue)).toBe(false)
  })

  it('refuses to add a ticker already on the watchlist (409), case-insensitively', async () => {
    setup()
    expect((await post(add('nvda'))).status).toBe(409)
  })

  it('refuses a second add of the same ticker while the first is pending (409)', async () => {
    setup()
    expect((await post(add('KO'))).status).toBe(202)
    expect((await post(add('ko'))).status).toBe(409)
  })

  it('refuses to reschedule a ticker that is neither listed nor pending (404)', async () => {
    setup()
    const res = await post({ action: 'set_cadence', ticker: 'ZZZ', cadence: 'weekly' })
    expect(res.status).toBe(404)
  })

  it('allows a schedule change for a listed stock and for one that is pending', async () => {
    setup()
    expect((await post({ action: 'set_cadence', ticker: 'NVDA', cadence: 'weekly' })).status).toBe(202)
    expect((await post(add('KO'))).status).toBe(202)
    expect((await post({ action: 'set_cadence', ticker: 'KO', cadence: 'paused' })).status).toBe(202)
  })

  it('stops at 25 pending requests with 429', async () => {
    const { queue } = setup()
    const line = (n: number) => JSON.stringify({ id: `x${n}`, action: 'add', ticker: `T${n}`, list: 'core', cadence: 'nightly' })
    mkdtempSync(join(tmpdir(), 'unused-'))
    const lines = Array.from({ length: 25 }, (_, i) => line(i)).join('\n') + '\n'
    const { mkdirSync } = await import('fs')
    mkdirSync(join(queue, '..'), { recursive: true })
    writeFileSync(queue, lines)
    expect((await post(add('KO'))).status).toBe(429)
  })
})

describe('GET /api/watchlist pending', () => {
  it('lists what is waiting for the next nightly run', async () => {
    setup()
    await post(add('KO'))
    await post({ action: 'set_cadence', ticker: 'NVDA', cadence: 'weekly' })
    const body = await (await fetch(`${base}/`)).json()
    expect(body.data.pending.map((p: { ticker: string; action: string }) => `${p.action}:${p.ticker}`)).toEqual([
      'add:KO',
      'set_cadence:NVDA',
    ])
  })

  it('is an empty list when nothing is queued', async () => {
    setup()
    const body = await (await fetch(`${base}/`)).json()
    expect(body.data.pending).toEqual([])
  })
})
