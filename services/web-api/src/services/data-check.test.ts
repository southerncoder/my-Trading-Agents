import { describe, expect, it } from 'vitest'
import { compareCloses, nasdaqCloses, providerStatus, vendorItems } from './data-check.js'

describe('nasdaqCloses', () => {
  it('reads US dates and dollar strings', () => {
    const m = nasdaqCloses({ data: { tradesTable: { rows: [{ date: '11/24/2026', close: '$155.38' }, { date: '11/23/2026', close: '1,165.05' }, { date: 'bad', close: '1' }] } } })
    expect([...m]).toEqual([['2026-11-24', 155.38], ['2026-11-23', 1165.05]])
    expect(nasdaqCloses(null).size).toBe(0)
  })
})

describe('compareCloses', () => {
  const y = new Map([['2026-11-20', 125.53], ['2026-11-23', 165.05], ['2026-11-24', 155.38]])
  it('matches when every shared day agrees within half a percent', () => {
    const r = compareCloses('NVDA', y, new Map([['2026-11-20', 125.53], ['2026-11-23', 165.05], ['2026-11-24', 155.4]]))
    expect(r).toMatchObject({ status: 'match', compared: 3 })
    expect(r.maxDiffPct).toBeLessThan(0.05)
  })
  it('flags a day that disagrees, and says which', () => {
    const r = compareCloses('NVDA', y, new Map([['2026-11-20', 125.53], ['2026-11-23', 150], ['2026-11-24', 155.38]]))
    expect(r.status).toBe('mismatch')
    expect(r.worst).toEqual({ date: '2026-11-23', yahoo: 165.05, nasdaq: 150 })
  })
  it('says so when either side has nothing', () => {
    expect(compareCloses('X', new Map(), y).status).toBe('no_prices')
    expect(compareCloses('X', y, new Map()).status).toBe('no_second_source')
  })
})

describe('providerStatus', () => {
  it('reports every provider from real answers, with switched-off ones marked', async () => {
    const answers: Record<string, unknown> = {
      'n/api/financial-news/KO?lookBackDays=3&pageSize=5': { providers: { used: [{ name: 'brave-news', articles: 5 }], empty: ['newsapi'], failed: [{ name: 'tavily', error: 'quota' }], skipped: [] } },
      'g/api/macro': { sources: { bls: true, fred: false }, notes: ['FRED series unavailable: DGS10.'] },
      'g/api/company/KO/fundamentals': { name: 'COCA COLA CO', recentFilings: [1, 2] },
      's/api/sentisense/SPY': { data: { score: { recent: [] }, documents: [1] } },
      'y/api/quote/SPY': { data: { regularMarketPrice: 718.78 } },
    }
    const items = await providerStatus({
      newsUrl: 'n', governmentDataUrl: 'g', socialUrl: 's', yahooUrl: 'y',
      getJson: async (u) => (u === 'g/api/census/states/2022' ? { status: 503, body: {} } : { status: answers[u] ? 200 : 500, body: answers[u] ?? {} }),
    })
    const by = Object.fromEntries(items.map((i) => [i.name, i]))
    expect(by['brave-news']).toMatchObject({ ok: true })
    expect(by.newsapi.ok).toBe(false)
    expect(by.tavily.detail).toBe('quota')
    expect(by['serp-api'].off).toBe(true)
    expect(by['FRED (rates, yields, volatility)']).toMatchObject({ ok: false, detail: 'FRED series unavailable: DGS10.' })
    expect(by['SEC (filings, fundamentals)'].detail).toBe('COCA COLA CO: 2 recent filings')
    expect(by.Census.off).toBe(true)
    expect(by.Reddit).toBeUndefined()
    expect(by['Yahoo Finance']).toMatchObject({ ok: true, detail: 'SPY 718.78' })
  })
})

describe('vendorItems', () => {
  it('reports each metered vendor from the runs status file, never by calling it', () => {
    const items = vendorItems({
      finnhub: { ok: false, detail: 'key rejected (401)', at: '2026-11-25T22:00:00.000Z', usedToday: 1, usedThisMonth: 1, limits: { perDay: 1500 } },
      marketstack: { ok: true, detail: 'closes for 30 of 30 symbols in one request', at: '2026-11-25T22:01:00.000Z', usedToday: 1, usedThisMonth: 4, limits: { perDay: 6, perMonth: 90 } },
    })
    expect(items.map((i) => i.name)).toEqual(['Finnhub', 'Alpha Vantage', 'Tiingo', 'Marketstack'])
    expect(items[0]).toMatchObject({ group: 'Fundamentals', ok: false, detail: 'key rejected (401) (1/1500 today; 2026-11-25 22:00 UTC)' })
    expect(items[1]).toMatchObject({ ok: false, off: true })
    expect(items[2]).toMatchObject({ group: 'Prices', ok: false, off: true })
    expect(items[3]).toMatchObject({ group: 'Prices', ok: true, detail: 'closes for 30 of 30 symbols in one request (4/90 this month; 2026-11-25 22:01 UTC)' })
    expect(vendorItems(null).every((i) => i.off)).toBe(true)
  })
})
