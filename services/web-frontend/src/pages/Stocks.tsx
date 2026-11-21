import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchWatchlist, postWatchlistRequest, type WatchStock, type Watchlist, type WatchlistRequestInput } from '../services/nightly'
import { filterStocks, type CadenceFilter, type ListFilter } from '../components/stocks/filter'
import { buildAddRequest, CADENCE_HELP, describePending, pendingFor, shownCadence } from '../components/stocks/request-form'
import { card, fmtPrice, muted } from '../components/today/format'

const CADENCES: { value: WatchlistRequestInput['cadence']; label: string }[] = [
  { value: 'nightly', label: 'Every night' },
  { value: 'weekly', label: 'Weekly (Mondays)' },
  { value: 'once', label: 'One time' },
  { value: 'paused', label: 'Paused' },
]

type Notice = { kind: 'ok' | 'error'; text: string }

const field = 'rounded border px-2 py-2 text-sm'
const rule = { borderTop: '1px solid var(--color-border, #e2e8f0)' }

export function Stocks() {
  const [data, setData] = useState<Watchlist | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [list, setList] = useState<ListFilter>('all')
  const [cadence, setCadence] = useState<CadenceFilter>('all')

  const [ticker, setTicker] = useState('')
  const [newList, setNewList] = useState<'core' | 'brands'>('core')
  const [newCadence, setNewCadence] = useState<WatchlistRequestInput['cadence']>('nightly')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)

  const load = useCallback(async () => {
    try {
      setData(await fetchWatchlist())
      setError(null)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load the watchlist')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function send(request: WatchlistRequestInput, okText: string) {
    setBusy(true)
    setNotice(null)
    try {
      await postWatchlistRequest(request)
      setNotice({ kind: 'ok', text: okText })
      await load()
      return true
    } catch (e: unknown) {
      setNotice({ kind: 'error', text: e instanceof Error ? e.message : 'Could not save the change.' })
      return false
    } finally {
      setBusy(false)
    }
  }

  if (error && !data) {
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
        <p className="text-sm" style={muted}>It lives in tools/watchlist.json. This page can only read it.</p>
      </div>
    )
  }

  const pending = data.pending
  const shown = filterStocks(data.stocks, list, cadence)
  const known = [...data.stocks.map((s) => s.ticker), ...pending.filter((p) => p.action === 'add').map((p) => p.ticker)]

  async function onAdd(e: React.FormEvent) {
    e.preventDefault()
    const built = buildAddRequest({ ticker, list: newList, cadence: newCadence, lesson: note }, known)
    if (!built.ok) {
      setNotice({ kind: 'error', text: built.error })
      return
    }
    const done = await send(
      built.request,
      `Saved. ${built.request.ticker} is not on the list yet. It will be added when the next nightly run starts.`,
    )
    if (done) {
      setTicker('')
      setNote('')
    }
  }

  const scheduleControl = (s: WatchStock) => {
    const waiting = pendingFor(pending, s.ticker)
    return (
      <>
        <select
          aria-label={`Schedule for ${s.ticker}`}
          value={shownCadence(pending, s)}
          disabled={busy}
          onChange={(e) => {
            const next = e.target.value as WatchlistRequestInput['cadence']
            if (next === shownCadence(pending, s)) return
            void send(
              { action: 'set_cadence', ticker: s.ticker, cadence: next },
              `Saved. ${s.ticker} is ${s.cadence} now and will change to ${next} when the next nightly run starts.`,
            )
          }}
          className={`${field} w-full md:w-auto`}
          style={card}
        >
          {CADENCES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <span className="mt-1 block text-xs" style={muted}>
          {CADENCE_HELP[s.cadence]}
          {waiting ? ` (change to ${waiting.cadence} waiting for the next nightly run)` : ''}
        </span>
      </>
    )
  }

  const tickerCell = (s: WatchStock) =>
    s.latest ? <Link to={`/stock/${s.ticker}`} className="underline">{s.ticker}</Link> : <>{s.ticker}</>

  const latestCell = (s: WatchStock) =>
    s.latest ? (
      <>
        {s.latest.label} <span style={muted}>({s.latest.date})</span>
      </>
    ) : (
      <span style={muted}>Not analysed yet</span>
    )

  return (
    <div className="space-y-4 p-2 sm:p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Stocks</h1>
        <p className="text-sm" style={muted}>
          {data.stocks.length} on the watchlist &middot; {data.counts.nightly} nightly, {data.counts.weekly} weekly,{' '}
          {data.counts.once} one-time, {data.counts.paused} paused. Changes you make here take effect when the next
          nightly run starts, not right away.
        </p>
      </header>

      {data.skipped > 0 && (
        <p className="text-xs" style={muted}>{data.skipped} watchlist entr{data.skipped === 1 ? 'y was' : 'ies were'} skipped as invalid.</p>
      )}

      <form onSubmit={onAdd} className="space-y-3 rounded-lg p-4" style={card} aria-labelledby="add-heading">
        <h2 id="add-heading" className="text-lg font-semibold">Add a stock</h2>
        <div className="grid grid-cols-2 gap-3 text-sm sm:flex sm:flex-wrap sm:items-end">
          <label className="flex flex-col gap-1">
            Ticker
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value)}
              maxLength={12}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="KO"
              className={`${field} uppercase sm:w-28`}
              style={card}
            />
          </label>
          <label className="flex flex-col gap-1">
            List
            <select value={newList} onChange={(e) => setNewList(e.target.value as 'core' | 'brands')} className={field} style={card}>
              <option value="core">Core</option>
              <option value="brands">Brands</option>
            </select>
          </label>
          <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
            Schedule
            <select value={newCadence} onChange={(e) => setNewCadence(e.target.value as WatchlistRequestInput['cadence'])} className={field} style={card}>
              {CADENCES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>
          <label className="col-span-2 flex flex-col gap-1 sm:min-w-48 sm:flex-1">
            Note (optional, up to 200 characters)
            <input value={note} onChange={(e) => setNote(e.target.value)} className={field} style={card} />
          </label>
          <button type="submit" disabled={busy} className="col-span-2 rounded border px-4 py-2 font-medium disabled:opacity-50 sm:col-span-1" style={card}>
            {busy ? 'Saving...' : 'Add stock'}
          </button>
        </div>
        <p className="text-xs" style={muted}>
          The nightly run adds it to the list at the start of its next run (weekday evenings). There is no remove here:
          pause a stock instead.
        </p>
      </form>

      {error && (
        <p role="alert" className="text-sm" style={{ color: '#b91c1c' }}>
          Could not refresh the list ({error}). What you see may be out of date.
        </p>
      )}

      <div aria-live="polite">
        {notice && (
          <p role={notice.kind === 'error' ? 'alert' : 'status'} className="text-sm" style={notice.kind === 'error' ? { color: '#b91c1c' } : undefined}>
            {notice.text}
          </p>
        )}
      </div>

      {pending.length > 0 && (
        <section className="rounded-lg p-4" style={card} aria-labelledby="pending-heading">
          <h2 id="pending-heading" className="text-lg font-semibold">Waiting for the next nightly run</h2>
          <ul className="list-disc pl-5 pt-1 text-sm">
            {pending.map((p) => (
              <li key={p.id}>{describePending(p)}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm sm:flex sm:flex-wrap sm:gap-4">
        <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          List
          <select value={list} onChange={(e) => setList(e.target.value as ListFilter)} className={field} style={card}>
            <option value="all">All</option>
            <option value="core">Core</option>
            <option value="brands">Brands</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
          Schedule
          <select value={cadence} onChange={(e) => setCadence(e.target.value as CadenceFilter)} className={field} style={card}>
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
        <>
          {/* Phones: one card per stock. */}
          <ul className="space-y-2 md:hidden" aria-label="Watchlist stocks">
            {shown.map((s, i) => (
              <li key={`${s.ticker}-${i}`} className="rounded-lg p-3" style={card}>
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold">
                    {tickerCell(s)} <span className="ml-1 text-xs font-normal" style={muted}>{s.list}</span>
                  </span>
                  <span className="font-semibold">{s.latest ? fmtPrice(s.latest.price) : <span style={muted}>-</span>}</span>
                </div>
                <p className="mt-1 text-sm">{latestCell(s)}</p>
                <div className="mt-2">{scheduleControl(s)}</div>
              </li>
            ))}
          </ul>

          {/* Tablets and desktops: the table. */}
          <div className="hidden overflow-x-auto rounded-lg md:block" style={card}>
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
                {shown.map((s, i) => (
                  <tr key={`${s.ticker}-${i}`} style={rule}>
                    <th scope="row" className="p-3 font-semibold">{tickerCell(s)}</th>
                    <td className="p-3">{s.list}</td>
                    <td className="p-3">{scheduleControl(s)}</td>
                    <td className="p-3">{latestCell(s)}</td>
                    <td className="p-3 text-right">{s.latest ? fmtPrice(s.latest.price) : <span style={muted}>-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
