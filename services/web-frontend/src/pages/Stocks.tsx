import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchWatchlist, type Watchlist } from '../services/nightly'
import { filterStocks, type CadenceFilter, type ListFilter } from '../components/stocks/filter'
import { card, fmtPrice, muted } from '../components/today/format'

const CADENCE_HELP: Record<string, string> = {
  nightly: 'analysed every night',
  weekly: 'analysed once a week',
  once: 'analysed one time',
  paused: 'skipped for now',
}

export function Stocks() {
  const [data, setData] = useState<Watchlist | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [list, setList] = useState<ListFilter>('all')
  const [cadence, setCadence] = useState<CadenceFilter>('all')

  useEffect(() => {
    let cancelled = false
    fetchWatchlist()
      .then((d) => !cancelled && setData(d))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load the watchlist'))
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <div role="alert" className="p-6">
        <h1 className="text-xl font-semibold">Stocks</h1>
        <p className="pt-2">Could not load the watchlist: {error}.</p>
      </div>
    )
  }
  if (!data) return <p className="p-6" style={muted}>Loading the watchlist...</p>

  if (!data.available) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Stocks</h1>
        <p className="pt-2">The watchlist file could not be read.</p>
        <p className="text-sm" style={muted}>It lives in tools/watchlist.json and is mounted read-only into the API.</p>
      </div>
    )
  }

  const shown = filterStocks(data.stocks, list, cadence)

  return (
    <div className="space-y-4 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Stocks</h1>
        <p className="text-sm" style={muted}>
          {data.stocks.length} on the watchlist &middot; {data.counts.nightly} nightly, {data.counts.weekly} weekly,{' '}
          {data.counts.once} one-time, {data.counts.paused} paused. Read-only for now.
        </p>
      </header>

      {data.skipped > 0 && (
        <p className="text-xs" style={muted}>{data.skipped} watchlist entr{data.skipped === 1 ? 'y was' : 'ies were'} skipped as invalid.</p>
      )}

      <div className="flex flex-wrap gap-4 text-sm">
        <label className="flex items-center gap-2">
          List
          <select value={list} onChange={(e) => setList(e.target.value as ListFilter)} className="rounded border px-2 py-1" style={card}>
            <option value="all">All</option>
            <option value="core">Core</option>
            <option value="brands">Brands</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          Schedule
          <select value={cadence} onChange={(e) => setCadence(e.target.value as CadenceFilter)} className="rounded border px-2 py-1" style={card}>
            <option value="all">All</option>
            <option value="nightly">Nightly</option>
            <option value="weekly">Weekly</option>
            <option value="once">One time</option>
            <option value="paused">Paused</option>
          </select>
        </label>
      </div>

      {shown.length === 0 ? (
        <p style={muted}>No stocks match these filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg" style={card}>
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Watchlist stocks with their schedule and latest call</caption>
            <thead style={muted}>
              <tr>
                <th scope="col" className="p-3">Stock</th>
                <th scope="col" className="p-3">List</th>
                <th scope="col" className="p-3">Schedule</th>
                <th scope="col" className="p-3">Latest call</th>
                <th scope="col" className="p-3 text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.ticker} style={{ borderTop: '1px solid var(--color-border, #e2e8f0)' }}>
                  <th scope="row" className="p-3 font-semibold">
                    {s.latest ? (
                      <Link to={`/stock/${s.ticker}`} className="underline">{s.ticker}</Link>
                    ) : (
                      s.ticker
                    )}
                  </th>
                  <td className="p-3">{s.list}</td>
                  <td className="p-3" title={CADENCE_HELP[s.cadence]}>{s.cadence}</td>
                  <td className="p-3">
                    {s.latest ? (
                      <>
                        {s.latest.label} <span style={muted}>({s.latest.date})</span>
                      </>
                    ) : (
                      <span style={muted}>Not analysed yet</span>
                    )}
                  </td>
                  <td className="p-3 text-right">{s.latest ? fmtPrice(s.latest.price) : <span style={muted}>-</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
