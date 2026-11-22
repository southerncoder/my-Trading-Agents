import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createApp } from '../app.js'
import type { Market } from '../market/yahoo.js'
import { createPortfolio, recordBuy, recordSell } from '../services/portfolio-ops.js'
import { testDb } from '../test/db.js'
import { serve } from '../test/http.js'
import { buildRouters } from './index.js'
import type { ServiceDeps } from './deps.js'

const passing = (symbol: string, rating = '2.0 - Buy') => ({
  symbol, regularMarketPrice: 110, fiftyDayAverage: 105, twoHundredDayAverage: 95, fiftyTwoWeekHigh: 115, averageAnalystRating: rating, forwardPE: 20,
})

const market: Market = {
  async bars() {
    return []
  },
  async quotes(tickers) {
    return tickers.filter((t) => ['AAPL', 'MSFT', 'KO', 'ORCL'].includes(t)).map((t) => passing(t, t === 'ORCL' ? '1.4 - Strong Buy' : '2.0 - Buy'))
  },
  async profile() {
    return { name: null, sector: null }
  },
}

const newsReply = {
  providers: {
    a: { data: { articles: [
      { title: 'Nvidia jumps on AI demand', url: '1' },
      { title: 'Chipmakers rally as Nvidia leads', url: '2' },
      { title: 'Oracle soars after cloud deal', url: '3' },
      { title: 'Boeing falls on delivery delays', url: '4' },
      { title: 'Boeing cuts outlook again', url: '5' },
      { title: 'Oracle and Nvidia team up', url: '6' },
    ] } },
  },
}

describe('sources, results and weekly review', () => {
  let db: Awaited<ReturnType<typeof testDb>>
  let api: Awaited<ReturnType<typeof serve>>
  const llm = vi.fn(async () => '## The week\nA calm week.')
  const fetchStub = vi.fn(async () => ({ ok: true, status: 200, json: async () => newsReply }) as Response)
  beforeAll(async () => {
    db = await testDb()
    const deps: ServiceDeps = {
      pool: db.pool, market, ledgerPath: 'none', now: () => new Date('2026-11-27T23:00:00Z'), newsUrl: 'http://news',
      watchlist: () => ['KO'], reviewModel: () => 'big-model:cloud', llm, fetch: fetchStub as unknown as typeof fetch,
    }
    api = await serve(createApp({ pool: db.pool, routers: buildRouters(deps) }))
  })
  afterAll(async () => {
    await api.close()
    await db.drop()
  })

  it('tonight: screens the universe (watchlist excluded), finds news-driven names, stores both with reasons', async () => {
    const r = await api.post('/sources/tonight', { date: '2026-11-27' })
    expect(r.status).toBe(200)
    const d = r.data as { screen: { ticker: string }[]; news: { ticker: string; reasons: { mentions: number } }[] }
    expect(d.screen.map((x) => x.ticker)).toEqual(['ORCL', 'AAPL', 'MSFT'])
    // ORCL was screened tonight, so the news source skips it; Nvidia (3 stories) and Boeing (2) remain.
    expect(d.news.map((x) => [x.ticker, x.reasons.mentions])).toEqual([['NVDA', 3], ['BA', 2]])
    expect((await api.get('/sources?date=2026-11-27')).data).toMatchObject({ screen: [{ ticker: 'ORCL' }, {}, {}], news: [{ ticker: 'NVDA' }, { ticker: 'BA' }] })
  })

  it('tonight again: returns what was stored without spending news or quote calls', async () => {
    fetchStub.mockClear()
    await api.post('/sources/tonight', { date: '2026-11-27' })
    expect(fetchStub).not.toHaveBeenCalled()
  })

  it('does not pick a name the same source picked in the last five days', async () => {
    const d = (await api.post('/sources/tonight', { date: '2026-11-30' })).data as { screen: { ticker: string }[] }
    expect(d.screen).toEqual([])
  })

  it('results by source come from the shadow portfolio, with the forward test status', async () => {
    const shadow = await createPortfolio(db.pool, { name: 'System picks (shadow)', kind: 'shadow', startingCash: 100000, createdOn: '2026-11-20', rules: { max_position_pct: 100, max_sector_pct: 100 } })
    const a = await recordBuy(db.pool, { portfolioId: shadow.id, ticker: 'ORCL', direction: 'long', amount: 2000, price: 100, date: '2026-11-20', source: 'screen' })
    await recordSell(db.pool, { portfolioId: shadow.id, positionId: a.position.id, price: 110, date: '2026-11-25' })
    await recordBuy(db.pool, { portfolioId: shadow.id, ticker: 'KO', direction: 'long', amount: 2000, price: 50, date: '2026-11-20', source: 'watchlist' })
    await db.pool.query(`INSERT INTO bars VALUES ('KO','2026-11-25',49,49,47,48),('SPY','2026-11-20',600,600,600,600),('SPY','2026-11-25',606,606,606,606)`)
    const r = await api.get('/sources/results')
    const d = r.data as { bySource: { source: string; avgReturnPct: number; avgExcessPct: number }[]; forwardTest: { status: string } }
    expect(d.bySource).toEqual([
      expect.objectContaining({ source: 'screen', positions: 1, closed: 1, winRatePct: 100, avgReturnPct: 10, avgExcessPct: 9 }),
      expect.objectContaining({ source: 'watchlist', positions: 1, closed: 0, avgReturnPct: -4, avgExcessPct: -5 }),
    ])
    expect(d.forwardTest).toMatchObject({ status: 'in progress', tradingDays: 40 })
  })

  it('weekly review: the model writes it from the week’s numbers and it is stored', async () => {
    const r = await api.post('/jobs/weekly-review', {})
    expect(r).toMatchObject({ status: 200, data: { week_ending: '2026-11-27', model: 'big-model:cloud', body_md: '## The week\nA calm week.' } })
    const [model, system, user] = llm.mock.calls[0] as unknown as [string, string, string]
    expect(model).toBe('big-model:cloud')
    expect(system).toMatch(/paper/i)
    expect(system).toMatch(/null.*not known/i)
    expect(user).toContain('SPY')
    // Counts are handed over precomputed so the model does not have to count (it miscounted in the first real run).
    expect(user).toMatch(/"facts": \{[^}]*"openPositions"/)
    expect((await api.get('/reviews')).data).toEqual([expect.objectContaining({ week_ending: '2026-11-27' })])
    expect((await api.get('/reviews/2026-11-27')).data).toMatchObject({ body_md: expect.stringContaining('calm') })
  })

  it('weekly review: when the model fails, a numbers-only review is stored instead', async () => {
    llm.mockRejectedValueOnce(new Error('timeout'))
    const r = await api.post('/jobs/weekly-review', { weekEnding: '2026-11-20' })
    expect(r.data).toMatchObject({ week_ending: '2026-11-20', model: null, body_md: expect.stringContaining('could not be reached') })
  })
})
