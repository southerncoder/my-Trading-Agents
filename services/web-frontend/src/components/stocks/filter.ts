import type { WatchStock } from '../../services/nightly'

export type ListFilter = 'all' | WatchStock['list']
export type CadenceFilter = 'all' | WatchStock['cadence']

export function filterStocks(stocks: WatchStock[], list: ListFilter, cadence: CadenceFilter): WatchStock[] {
  return stocks.filter((s) => (list === 'all' || s.list === list) && (cadence === 'all' || s.cadence === cadence))
}
