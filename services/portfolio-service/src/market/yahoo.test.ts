import { describe, expect, it, vi } from 'vitest'
import { createYahoo, parseBarsCsv, parseRating } from './yahoo.js'

const csv = `# Stock data for KO from 2026-11-18 to 2026-11-21
# Data retrieved on: 2026-11-21 10:00:00

Date,Open,High,Low,Close,Adj Close,Volume
2026-11-18,95.1,96.2,94.8,96,96,100
2026-11-19,96,97,95.5,96.5,96.5,100
2026-11-20,null,null,null,null,null,0
`

const reply = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)), json: async () => body }) as Response

describe('yahoo client', () => {
  it('parses the CSV and drops rows without numbers', () => {
    expect(parseBarsCsv(csv)).toEqual([
      { date: '2026-11-18', open: 95.1, high: 96.2, low: 94.8, close: 96 },
      { date: '2026-11-19', open: 96, high: 97, low: 95.5, close: 96.5 },
    ])
  })

  it('asks for an end date one day past the last day wanted (the service end is exclusive)', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, csv))
    await createYahoo('http://y', f).bars('KO', '2026-11-18', '2026-11-19')
    expect(f.mock.calls[0][0]).toBe('http://y/api/historical/KO?startDate=2026-11-18&endDate=2026-11-20')
  })

  it('a 404 (no data) is an empty list, other failures throw', async () => {
    expect(await createYahoo('http://y', vi.fn().mockResolvedValue(reply(404, {}))).bars('X', '2026-01-01', '2026-01-02')).toEqual([])
    await expect(createYahoo('http://y', vi.fn().mockResolvedValue(reply(500, {}))).bars('X', '2026-01-01', '2026-01-02')).rejects.toThrow('500')
  })

  it('quotes go out in chunks of at most 100 symbols', async () => {
    const f = vi.fn().mockImplementation(async (_u: string, init: RequestInit) => {
      const { symbols } = JSON.parse(String(init.body)) as { symbols: string[] }
      return reply(200, { status: 'success', data: symbols.map((s) => ({ symbol: s, regularMarketPrice: 1 })) })
    })
    const q = await createYahoo('http://y', f).quotes(Array.from({ length: 150 }, (_, i) => `T${i}`))
    expect(f).toHaveBeenCalledTimes(2)
    expect(q).toHaveLength(150)
  })

  it('profile returns name and sector, or nulls when the service has none', async () => {
    const f = vi.fn().mockResolvedValue(reply(200, { status: 'success', data: { assetProfile: { sectorDisp: 'Consumer Defensive' }, price: { longName: 'Coca-Cola' } } }))
    expect(await createYahoo('http://y', f).profile('KO')).toEqual({ name: 'Coca-Cola', sector: 'Consumer Defensive' })
    expect(await createYahoo('http://y', vi.fn().mockResolvedValue(reply(500, {}))).profile('KO')).toEqual({ name: null, sector: null })
  })

  it('reads the analyst rating number from text like "2.1 - Buy"', () => {
    expect(parseRating('2.1 - Buy')).toBe(2.1)
    expect(parseRating(undefined)).toBeNull()
  })
})
