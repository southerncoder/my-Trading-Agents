import { describe, expect, it } from 'vitest'
import { citations, marketFigures, sentimentScore, tokenize } from './trail'

describe('citations', () => {
  it('counts each report tag', () => {
    expect(citations('91.81 [market] and 40% ROE [fundamentals], probe [news] [Market]')).toEqual({ market: 2, fundamentals: 1, news: 1, social: 0 })
  })
})

describe('marketFigures', () => {
  it('reads RSI, ATR and volume against the average', () => {
    const ko =
      'last close 95.88; ATR(14) 1.83 (1.9% of price) = one day.\n- **RSI(14):** 52.5 (Neutral)\n- **Volume and Momentum:** Trading volume on 2026-11-23 was **29,988,173**, significantly higher than the 3-month average of 16,997,837.'
    expect(marketFigures(ko)).toEqual({ rsi: 52.5, atr: 1.83, atrPct: 1.9, volume: 29988173, avgVolume: 16997837 })
    expect(marketFigures('Current volume (8.71M) is above the 3-month average (7.25M)')).toMatchObject({ volume: 8.71e6, avgVolume: 7.25e6 })
    expect(marketFigures('nothing here')).toEqual({})
  })
})

describe('sentimentScore', () => {
  it('reads the stated score', () => {
    expect(sentimentScore('Overall Sentiment Score: -24.17 (Bearish)')).toBe(-24.17)
    expect(sentimentScore('no score')).toBeUndefined()
  })
})

describe('tokenize', () => {
  it('marks money, percentages and citations', () => {
    expect(tokenize('Cash $16.6B [fundamentals] covers a 10% fine').map((t) => t.kind)).toEqual(['text', 'money', 'text', 'cite', 'text', 'pct', 'text'])
  })
})
