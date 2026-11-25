import { describe, expect, it } from 'vitest'
import { keywords, matching, redditSearches, riskQuery, shortName } from './research'

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
    expect(riskQuery('Coca-Cola', 'European antitrust penalties')).toBe('"Coca-Cola" European antitrust penalties')
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
