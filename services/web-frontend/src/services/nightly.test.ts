import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchLatestNight, fetchNightDates, fetchStock, fetchWatchlist, fetchRunStatus, fetchScorecard, nightlyDaySchema, postWatchlistRequest } from './nightly'

const row = {
  date: '2026-11-20',
  ticker: 'KO',
  group: 'core',
  profile: 'ollama-cloud',
  label: 'Buy now',
  action_now: 'buy_now',
  decision: 'BUY',
  confidence: 0.7,
  price: 60,
  stance: { market: 'now' },
  pm: {},
  change_pct: null,
  distance_to_trigger_pct: null,
  inside_half_day: false,
}

const day = {
  date: '2026-11-20',
  profile: 'ollama-cloud',
  stale: false,
  expected_date: '2026-11-20',
  skipped_lines: 0,
  rows: [row],
  summary: { by_label: { 'Buy now': 1 }, inside_half_day: 0, biggest_mover: null },
}

function stubFetch(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body }),
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('nightly client', () => {
  it('parses a latest response including a buy-now row', async () => {
    stubFetch(200, { success: true, data: day })
    const d = await fetchLatestNight()
    expect(d.rows[0].ticker).toBe('KO')
    expect(d.rows[0].trigger_price).toBeUndefined()
  })

  it('rejects a response missing rows', async () => {
    stubFetch(200, { success: true, data: { ...day, rows: undefined } })
    await expect(fetchLatestNight()).rejects.toThrow()
  })

  it('throws the server message on 404', async () => {
    stubFetch(404, { success: false, error: 'No nightly data found' })
    await expect(fetchLatestNight()).rejects.toThrow('No nightly data found')
  })

  it('returns the list of dates', async () => {
    stubFetch(200, { success: true, data: ['2026-11-20', '2026-11-19'] })
    expect(await fetchNightDates()).toEqual(['2026-11-20', '2026-11-19'])
  })

  it('schema accepts null summary mover and null trigger distances', () => {
    expect(nightlyDaySchema.safeParse(day).success).toBe(true)
  })
})

describe('stock client', () => {
  const stock = {
    ticker: 'NVDA',
    date: '2026-11-20',
    history: [{ date: '2026-11-19', profile: 'p', price: 145.98, label: 'Wait', decision: 'HOLD', confidence: 0.5 }],
    stages: null,
  }

  it('parses a stock response with stages null', async () => {
    stubFetch(200, { success: true, data: stock })
    const s = await fetchStock('NVDA')
    expect(s.stages).toBeNull()
    expect(s.history[0].trigger_price).toBeUndefined()
  })

  it('parses stages and requests the date', async () => {
    stubFetch(200, { success: true, data: { ...stock, stages: { market: 'm' } } })
    const s = await fetchStock('NVDA', '2026-11-19')
    expect(s.stages?.market).toBe('m')
    expect(String((fetch as unknown as { mock: { calls: string[][] } }).mock.calls[0][0])).toContain('stock/NVDA?date=2026-11-19')
  })

  it('throws the server message on 404', async () => {
    stubFetch(404, { success: false, error: 'No history for ZZZ' })
    await expect(fetchStock('ZZZ')).rejects.toThrow('No history for ZZZ')
  })
})
describe('watchlist and status clients', () => {
  const wl = {
    available: true,
    skipped: 0,
    counts: { nightly: 1, weekly: 1, once: 0, paused: 0 },
    stocks: [
      { ticker: 'AAA', list: 'core', cadence: 'nightly', latest: { date: '2026-11-20', price: 10, label: 'Buy now', decision: 'BUY', confidence: 0.7 } },
      { ticker: 'NEW', list: 'brands', cadence: 'weekly', lesson: 'x', latest: null },
    ],
  }

  it('parses a watchlist with a null latest and an optional trigger', async () => {
    stubFetch(200, { success: true, data: wl })
    const w = await fetchWatchlist()
    expect(w.stocks[1].latest).toBeNull()
    expect(w.stocks[0].latest?.trigger_price).toBeUndefined()
    expect(String((fetch as unknown as { mock: { calls: string[][] } }).mock.calls[0][0])).toContain('/watchlist')
  })

  it('rejects a watchlist with an unknown cadence', async () => {
    stubFetch(200, { success: true, data: { ...wl, stocks: [{ ...wl.stocks[0], cadence: 'hourly' }] } })
    await expect(fetchWatchlist()).rejects.toThrow()
  })

  it('parses status null and models null', async () => {
    stubFetch(200, { success: true, data: { status: null, models: null } })
    expect(await fetchRunStatus()).toEqual({ status: null, models: null })
  })

  it('parses status lines and models with optional model names', async () => {
    stubFetch(200, {
      success: true,
      data: { status: { date: '2026-11-20', lines: ['a'] }, models: { date: '2026-11-20', profile: 'p', rows: 24 } },
    })
    const s = await fetchRunStatus()
    expect(s.status?.lines).toEqual(['a'])
    expect(s.models?.fast_model).toBeUndefined()
  })
})
describe('scorecard client', () => {
  const cell = { key: 'Buy now', horizon: 1, n: 20, avg_ret_pct: -2.1, avg_excess_pct: 0.2, up_share: 0.5, enough: true }
  const sc = {
    generated_at: '2026-11-21T05:00:00.000Z',
    benchmark: 'SPY',
    horizons: [1, 3, 5],
    calls: 120,
    unscored: 0,
    matured: { '1': 96, '3': 48, '5': 0 },
    groups: {
      label: [cell, { ...cell, key: 'Wait', trigger: { n: 4, fill_rate: 0.25, cancelled_rate: 0.5, wait_minus_now_pct: 1.7 } }],
      band: [],
      profile: [],
    },
  }

  it('parses a scorecard with and without trigger stats', async () => {
    stubFetch(200, { success: true, data: { scorecard: sc } })
    const s = await fetchScorecard()
    expect(s?.groups.label[0].trigger).toBeUndefined()
    expect(s?.groups.label[1].trigger?.fill_rate).toBe(0.25)
    expect(String((fetch as unknown as { mock: { calls: string[][] } }).mock.calls[0][0])).toContain('/nightly/scorecard')
  })

  it('returns null when there is no scorecard yet', async () => {
    stubFetch(200, { success: true, data: { scorecard: null } })
    expect(await fetchScorecard()).toBeNull()
  })

  it('rejects a scorecard missing groups', async () => {
    stubFetch(200, { success: true, data: { scorecard: { ...sc, groups: undefined } } })
    await expect(fetchScorecard()).rejects.toThrow()
  })
})
describe('watchlist requests', () => {
  const req = { action: 'add' as const, ticker: 'KO', list: 'core' as const, cadence: 'nightly' as const }

  it('posts JSON and returns the id', async () => {
    stubFetch(202, { success: true, data: { id: 'abc' } })
    expect(await postWatchlistRequest(req)).toEqual({ id: 'abc' })
    const [url, init] = (fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]
    expect(String(url)).toContain('/watchlist/requests')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body as string)).toEqual(req)
  })

  it('surfaces the API message on a refusal', async () => {
    stubFetch(409, { success: false, error: 'KO is already on the watchlist or waiting to be added' })
    await expect(postWatchlistRequest(req)).rejects.toThrow('already on the watchlist')
  })

  it('gives a plain message when the reply is not JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => { throw new Error('bad json') } }))
    await expect(postWatchlistRequest(req)).rejects.toThrow(/could not|failed/i)
  })

  it('a watchlist without pending parses with an empty list, and with entries keeps them', async () => {
    const base = { available: true, skipped: 0, counts: { nightly: 0, weekly: 0, once: 0, paused: 0 }, stocks: [] }
    stubFetch(200, { success: true, data: base })
    expect((await fetchWatchlist()).pending).toEqual([])
    stubFetch(200, { success: true, data: { ...base, pending: [{ id: '1', at: 'x', action: 'add', ticker: 'KO', list: 'core', cadence: 'weekly' }] } })
    expect((await fetchWatchlist()).pending).toHaveLength(1)
  })
})
