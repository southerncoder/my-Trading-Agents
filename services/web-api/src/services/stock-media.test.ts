import { describe, expect, it } from 'vitest'
import { loadStockMedia, pickArticles, pickSocial, titleFromUrl } from './stock-media.js'

describe('titleFromUrl', () => {
  it('turns the slug into words', () => {
    expect(titleFromUrl('https://www.fool.com/investing/2026/11/23/as-tech-stocks-crash-is-berkshire-a-safe-haven/?x=1')).toBe(
      'As tech stocks crash is berkshire a safe haven',
    )
    expect(titleFromUrl('https://finance.yahoo.com/markets/stocks/articles/coca-cola-company-names-david-213000723.html')).toBe(
      'Coca cola company names david',
    )
  })
  it('falls back to the site name', () => {
    expect(titleFromUrl('https://example.com/a/1')).toBe('example.com')
  })
})

describe('pickArticles', () => {
  it('keeps real links, newest first, once each', () => {
    const body = {
      data: {
        articles: [
          { title: 'Old', url: 'https://a.com/1', source: { name: 'A' }, publishedAt: '2026-11-20T00:00:00Z' },
          { title: 'New', url: 'https://b.com/2', source: { name: 'B' }, publishedAt: '2026-11-23T00:00:00Z', urlToImage: 'javascript:x' },
          { title: 'Dup', url: 'https://a.com/1' },
          { title: 'Bad', url: 'ftp://x' },
        ],
      },
    }
    const out = pickArticles(body)
    expect(out.map((a) => a.title)).toEqual(['New', 'Old'])
    expect(out[0].image).toBeUndefined()
  })
})

describe('pickSocial', () => {
  it('reads the daily scores and documents', () => {
    const s = pickSocial({
      data: {
        score: { avg7d: 3.8, recent: [{ date: '2026-11-23', score: -24.6, bull: 30, bear: 46 }] },
        documents: [{ source: 'NEWS', url: 'https://www.fool.com/x/as-tech-stocks-crash-today/', averageSentiment: 0.28, tickerSentiment: 'POSITIVE' }],
      },
    })!
    expect(s.days[0]).toEqual({ date: '2026-11-23', score: -24.6, bull: 30, bear: 46 })
    expect(s.docs[0]).toMatchObject({ domain: 'fool.com', stance: 'POSITIVE', title: 'As tech stocks crash today' })
  })
  it('is null when empty', () => {
    expect(pickSocial({ data: {} })).toBeNull()
  })
})

describe('loadStockMedia', () => {
  it('caches a complete answer and retries a failed one', async () => {
    let calls = 0
    const deps = {
      newsUrl: 'http://n',
      socialUrl: 'http://s',
      fetchText: async (u: string) => {
        calls++
        if (u.includes('/api/sentisense/')) return JSON.stringify({ data: { score: { recent: [] }, documents: [] } })
        return JSON.stringify({ data: { articles: [{ title: 'T', url: 'https://x.com/a' }] } })
      },
    }
    const a = await loadStockMedia(deps, 'ZZZ', 1000)
    expect(a.articles).toHaveLength(1)
    await loadStockMedia(deps, 'ZZZ', 2000)
    expect(calls).toBe(2)

    const failing = { ...deps, fetchText: async () => Promise.reject(new Error('down')) }
    const b = await loadStockMedia(failing, 'YYY', 1000)
    expect(b.articlesError).toBeTruthy()
    await loadStockMedia(failing, 'YYY', 2000).catch(() => null)
  })
})
