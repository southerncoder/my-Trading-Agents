import { describe, expect, it } from 'vitest'
import { loadUniverse, screen } from './screen.js'
import { articlesFrom, countMentions } from './news.js'

const q = (symbol: string, o: Record<string, unknown> = {}) => ({
  symbol, regularMarketPrice: 110, fiftyDayAverage: 105, twoHundredDayAverage: 95, fiftyTwoWeekHigh: 115, averageAnalystRating: '2.0 - Buy', forwardPE: 20, ...o,
})

describe('screen', () => {
  it('keeps uptrends that are not stretched, rated buy-ish and not absurdly priced; ranks and explains them', () => {
    const r = screen(
      [
        q('GOOD'),
        q('BEST', { averageAnalystRating: '1.5 - Strong Buy', fiftyTwoWeekHigh: 111 }),
        q('DOWN', { twoHundredDayAverage: 120 }),
        q('CROSS', { fiftyDayAverage: 90 }),
        q('STRETCH', { regularMarketPrice: 125 }),
        q('SELLRATED', { averageAnalystRating: '3.2 - Hold' }),
        q('PRICEY', { forwardPE: 80 }),
        q('LOSS', { forwardPE: -5 }),
        q('NODATA', { twoHundredDayAverage: undefined }),
        q('HELD'),
      ],
      { exclude: new Set(['HELD']), limit: 5 },
    )
    expect(r.map((x) => x.ticker)).toEqual(['BEST', 'GOOD'])
    expect(r[0].reasons).toMatchObject({ price: 110, ma50: 105, ma200: 95, rating: 1.5, forwardPE: 20, pctOf52wHigh: 99.1 })
    expect(r[0].reasons.checks).toContain('price above its 200-day average (uptrend)')
    expect(r[0].score).toBeGreaterThan(r[1].score)
  })

  it('respects the limit', () => {
    expect(screen([q('A'), q('B'), q('C')], { exclude: new Set(), limit: 2 })).toHaveLength(2)
  })

  it('the universe file loads, with unique tickers', () => {
    const u = loadUniverse()
    expect(u.length).toBeGreaterThan(80)
    expect(new Set(u.map((x) => x.ticker)).size).toBe(u.length)
  })
})

describe('news mentions', () => {
  const universe = [
    { ticker: 'NVDA', match: ['Nvidia'] },
    { ticker: 'AAPL', match: ['Apple'] },
    { ticker: 'IT', match: ['Gartner'] },
    { ticker: 'TGT', match: ['Target Corp'] },
  ]
  const articles = [
    { title: 'Nvidia shares jump after earnings', description: '', url: 'a' },
    { title: 'Chip stocks rally', description: 'Nvidia and peers climb; Apple flat', url: 'b' },
    { title: 'Why IT spending is slowing', description: 'Analysts hit their target', url: 'c' },
    { title: 'Big mover ($AAPL) today', description: '', url: 'd' },
    { title: 'Nvidia shares jump after earnings', description: 'duplicate story', url: 'a' },
  ]
  it('counts each article once per company, by name (case-sensitive whole word) or by $TICKER / (TICKER)', () => {
    const counts = countMentions(articles, universe)
    expect(counts.get('NVDA')).toMatchObject({ count: 2 })
    expect(counts.get('AAPL')).toMatchObject({ count: 2 })
    expect(counts.has('IT')).toBe(false)
    expect(counts.has('TGT')).toBe(false)
    expect(counts.get('NVDA')?.headlines[0]).toBe('Nvidia shares jump after earnings')
  })

  it('reads articles out of the aggregate reply (every provider, duplicates by url removed)', () => {
    const reply = { providers: { a: { data: { articles: [{ title: 'x', url: 'u1' }, { title: 'y', url: 'u2' }] } }, b: { data: { articles: [{ title: 'x', url: 'u1' }] } }, c: { data: null } } }
    expect(articlesFrom(reply).map((a) => a.url)).toEqual(['u1', 'u2'])
  })
})
