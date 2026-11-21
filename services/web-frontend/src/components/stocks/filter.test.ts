import { describe, it, expect } from 'vitest'
import { filterStocks } from './filter'
import type { WatchStock } from '../../services/nightly'

const s = (ticker: string, list: 'core' | 'brands', cadence: WatchStock['cadence']): WatchStock => ({
  ticker,
  list,
  cadence,
  latest: null,
})
const all = [s('AAA', 'core', 'nightly'), s('BBB', 'brands', 'weekly'), s('CCC', 'core', 'paused')]

describe('filterStocks', () => {
  it('returns everything for all/all', () => {
    expect(filterStocks(all, 'all', 'all')).toHaveLength(3)
  })
  it('filters by list', () => {
    expect(filterStocks(all, 'core', 'all').map((x) => x.ticker)).toEqual(['AAA', 'CCC'])
  })
  it('filters by cadence and combines both', () => {
    expect(filterStocks(all, 'all', 'weekly').map((x) => x.ticker)).toEqual(['BBB'])
    expect(filterStocks(all, 'core', 'weekly')).toEqual([])
  })
})
