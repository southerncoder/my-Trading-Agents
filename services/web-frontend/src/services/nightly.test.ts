import { describe, it, expect, vi, afterEach } from 'vitest'
import { fetchLatestNight, fetchNightDates, nightlyDaySchema } from './nightly'

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
