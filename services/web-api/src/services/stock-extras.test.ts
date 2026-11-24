import { describe, expect, it } from 'vitest'
import { loadStockExtras, type ExtrasDeps } from './stock-extras.js'
import type { HistoryPoint } from './stock-detail.js'

const csv = (rows: Array<[string, number]>) => `# comment\nDate,Open,High,Low,Close,Adj Close,Volume\n${rows.map(([d, c]) => `${d},${c},${c},${c},${c},${c},100`).join('\n')}`

const point = (date: string, price: number): HistoryPoint => ({ date, profile: 'hybrid', price, label: 'HOLD', decision: 'hold', confidence: 0.6 })

describe('loadStockExtras', () => {
  const nights: Record<string, Record<string, string>> = {
    '2026-11-19': { news: 'Quiet night with no regulatory news at all.' },
    '2026-11-20': { news: 'The European Commission opened an antitrust probe into Coca-Cola bottlers.' },
    '2026-11-23': { news: 'The European Commission antitrust probe into Coca-Cola continues.' },
  }
  const deps: ExtrasDeps = {
    yahooUrl: 'http://y',
    governmentDataUrl: 'http://g',
    fetchText: async (url) => {
      if (url.includes('/api/historical/SPY')) return csv([['2026-11-20', 500], ['2026-11-23', 510]])
      if (url.includes('/api/historical/')) return csv([['2026-11-20', 80], ['2026-11-23', 76]])
      if (url.includes('/quote-summary/')) return JSON.stringify({ data: { price: { longName: 'The Coca-Cola Company' } } })
      if (url.includes('/properties')) return JSON.stringify({ form: '10-K', filed: '2026-02-20', url: 'u', text: 'HQ in Atlanta', truncated: false })
      if (url.includes('/fundamentals')) return JSON.stringify({ name: 'COCA COLA CO', cik: '21344', asOf: '2026-11-23', quarterly: [{ end: '2026-10-02', filed: '2026-10-28', revenue: 1 }], annual: [], recentFilings: [] })
      throw new Error(`unexpected ${url}`)
    },
    stagesFor: async (d) => nights[d] ?? null,
  }
  const history = [point('2026-11-19', 81), point('2026-11-20', 80), point('2026-11-23', 76)]

  it('returns prices, SEC quarters and matters with the first night each was mentioned', async () => {
    const x = await loadStockExtras(deps, 'KO', '2026-11-23', history, new Date('2026-11-24T00:00:00Z'))
    expect(x.prices.map((p) => p.close)).toEqual([80, 76])
    expect(x.profile?.name).toBe('The Coca-Cola Company')
    expect(x.properties?.text).toBe('HQ in Atlanta')
    expect(x.fundamentals?.quarterly).toHaveLength(1)
    expect(x.regulatory.exposure).toBe('elevated')
    const [m] = x.regulatory.matters
    expect(m.firstSeen).toBe('2026-11-20')
    expect(m.sinceFirst).toEqual({ from: '2026-11-20', stockPct: -5, spyPct: 2 })
    expect(x.regulatory.nightsChecked).toBe(3)
  })

  it('keeps the other parts when one service fails', async () => {
    const x = await loadStockExtras({ ...deps, fetchText: async () => Promise.reject(new Error('down')) }, 'KO', '2026-11-23', history)
    expect(x.prices).toEqual([])
    expect(x.pricesError).toBeTruthy()
    expect(x.fundamentals).toBeNull()
    expect(x.regulatory.matters).toHaveLength(1)
  })
})
