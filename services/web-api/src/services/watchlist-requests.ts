import { randomUUID } from 'crypto'
import { appendFile, mkdir, readFile, readdir } from 'fs/promises'
import { basename, dirname, join } from 'path'

export type RequestCadence = 'nightly' | 'weekly' | 'once' | 'paused'

export interface WatchlistRequest {
  id: string
  at: string
  action: 'add' | 'set_cadence'
  ticker: string
  list?: 'core' | 'brands'
  cadence: RequestCadence
  lesson?: string
}

export type Validation =
  | { ok: true; request: WatchlistRequest }
  | { ok: false; status: number; error: string }

const TICKER = /^[A-Z][A-Z0-9.\-]{0,9}$/
const CADENCES: RequestCadence[] = ['nightly', 'weekly', 'once', 'paused']
const MAX_LESSON = 200

const fail = (error: string): Validation => ({ ok: false, status: 400, error })

/** Checks a posted body against the same rules tools/watchlist.ps1 applies, and builds the queue line. */
export function validateRequest(body: unknown): Validation {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return fail('Send one request as a JSON object')
  const b = body as Record<string, unknown>

  if (b.action !== 'add' && b.action !== 'set_cadence') return fail('Action must be add or set_cadence')
  if (typeof b.ticker !== 'string') return fail('Ticker must be text')
  const ticker = b.ticker.trim().toUpperCase()
  if (!TICKER.test(ticker)) return fail('That does not look like a ticker symbol')

  if (typeof b.cadence !== 'string') return fail('Pick a schedule')
  const cadence = b.cadence.trim().toLowerCase() as RequestCadence
  if (!CADENCES.includes(cadence)) return fail('Schedule must be nightly, weekly, once or paused')

  const request: WatchlistRequest = { id: randomUUID(), at: new Date().toISOString(), action: b.action, ticker, cadence }

  if (b.action === 'add') {
    if (b.list !== 'core' && b.list !== 'brands') return fail('List must be core or brands')
    request.list = b.list
    if (typeof b.lesson === 'string') {
      // eslint-disable-next-line no-control-regex
      let lesson = b.lesson.replace(/[\u0000-\u001f\u007f]/g, ' ').trim()
      if (lesson.length > MAX_LESSON) lesson = lesson.slice(0, MAX_LESSON).trim()
      if (lesson) request.lesson = lesson
    }
  }
  return { ok: true, request }
}

async function readLines(path: string): Promise<WatchlistRequest[]> {
  let text: string
  try {
    text = await readFile(path, 'utf8')
  } catch {
    return []
  }
  const out: WatchlistRequest[] = []
  for (const line of text.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    if (!line.trim()) continue
    try {
      const r = JSON.parse(line) as WatchlistRequest
      if (r && typeof r.ticker === 'string' && (r.action === 'add' || r.action === 'set_cadence') && CADENCES.includes(r.cadence)) out.push(r)
    } catch {
      // skip an unreadable line; the nightly apply step reports it
    }
  }
  return out
}

/** Requests waiting for the next nightly run: leftover batch files (.processing, .moving.*) first, then the queue. */
export async function readPending(path: string): Promise<WatchlistRequest[]> {
  let batches: string[] = []
  try {
    const leaf = basename(path)
    batches = (await readdir(dirname(path)))
      .filter((n) => n.startsWith(leaf + '.') && /\.(processing|moving\.[^.]+\.[^.]+)$/.test(n))
      .sort((a, b) => Number(!a.endsWith('.processing')) - Number(!b.endsWith('.processing')) || a.localeCompare(b))
      .map((n) => join(dirname(path), n))
  } catch {
    // folder missing: nothing waiting
  }
  const out: WatchlistRequest[] = []
  for (const b of [...batches, path]) out.push(...(await readLines(b)))
  return out
}

/** Adds one JSON line. O_APPEND writes of a short line are atomic, so concurrent posts do not interleave. */
export async function appendRequest(path: string, request: WatchlistRequest): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await appendFile(path, `${JSON.stringify(request)}\n`, 'utf8')
}
