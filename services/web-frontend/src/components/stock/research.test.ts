import { describe, expect, it } from 'vitest'
import { isTechnicalRisk, keywords, matching, newsSearches, redditSearches, riskQuery, shortName } from './research'

describe('shortName', () => {
  it('drops legal suffixes and fixes SEC upper case', () => {
    expect(shortName('The Coca-Cola Company', 'KO')).toBe('Coca-Cola')
    expect(shortName('Microsoft Corporation', 'MSFT')).toBe('Microsoft')
    expect(shortName('COCA COLA CO', 'KO')).toBe('Coca Cola')
    expect(shortName(undefined, 'KO')).toBe('KO')
    expect(shortName('JPMorgan Chase & Co.', 'JPM')).toBe('JPMorgan Chase')
    expect(shortName('AT&T INC', 'T')).toBe('AT&T')
    expect(shortName('Anthropic, PBC', 'ANT')).toBe('Anthropic')
  })
})

describe('keywords and riskQuery', () => {
  it('keeps the meaningful words', () => {
    expect(keywords('Potential formal charges from the EU antitrust probe could hit margins')).toEqual(['formal', 'charges', 'EU', 'antitrust', 'probe', 'hit'])
    expect(riskQuery('Coca-Cola', 'European antitrust penalties')).toBe('"Coca-Cola" (European OR antitrust OR penalties)')
  })
})

describe('matching', () => {
  const items = [
    { title: 'European Commission Probes Coca-Cola Over Distribution Practices' },
    { title: 'Coca-Cola names new CFO' },
    { title: 'Antitrust probe widens in Europe', description: 'The commission said...' },
  ]
  it('finds articles sharing the risk words', () => {
    expect(matching('EU antitrust probe into distribution', items).map((i) => i.title)).toEqual([
      'European Commission Probes Coca-Cola Over Distribution Practices',
      'Antitrust probe widens in Europe',
    ])
    expect(matching('Valuation stretched', items)).toEqual([])
  })
})

describe('redditSearches', () => {
  it('searches finance subreddits, by name only for one-letter tickers', () => {
    const [all, ...rest] = redditSearches('KO', 'Coca-Cola')
    expect(all.url).toContain('/r/stocks+investing+wallstreetbets')
    expect(decodeURIComponent(all.url)).toContain('q="Coca-Cola"')
    expect(decodeURIComponent(redditSearches('NVDA', 'Nvidia')[0].url)).toContain('q=NVDA OR "Nvidia"')
    expect(rest.some((l) => l.label === 'r/wallstreetbets')).toBe(true)
  })
})

describe('riskQuery for real risks', () => {
  it('requires the company and lets any of the most specific words match', () => {
    expect(riskQuery('AT&T', 'FCC rules on retiring copper landlines could raise costs')).toBe('"AT&T" (FCC OR retiring OR landlines)')
    expect(riskQuery('Nvidia', 'broader AI sector slowdown')).toBe('"Nvidia" (AI OR sector OR slowdown)')
    expect(riskQuery('Pfizer', 'Patent expiry')).toBe('"Pfizer" (Patent OR expiry)')
  })
  it('turns chart-pattern risks into a search for the company\'s stock news', () => {
    expect(isTechnicalRisk('continued bearish MACD')).toBe(true)
    expect(riskQuery('Amazon.com', 'continued bearish MACD')).toBe('"Amazon.com" stock')
    expect(riskQuery('Palantir', 'Breakdown below 142.28')).toBe('"Palantir" stock')
    expect(isTechnicalRisk('Bearish sentiment after the antitrust ruling')).toBe(false)
  })
  it('limits Google News to the last month and gives Reuters a query without OR', () => {
    const [g, , r] = newsSearches('"AT&T" (FCC OR copper)')
    expect(decodeURIComponent(g.url)).toContain('"AT&T" (FCC OR copper) when:30d')
    expect(decodeURIComponent(r.url)).toContain('query="AT&T" FCC')
  })
})
