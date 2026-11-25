import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { History as HistoryIcon, Grid3x3, ListChecks, Search } from 'lucide-react'
import { fetchHistory, type HistoryRow } from '../services/nightly'
import { Card, PageHeader, SectionTitle, Segmented, StatTile, muted } from '../components/viz'
import { FAMILIES, familyOf, type Family } from '../components/scorecard/charts'
import { TickerLink } from '../components/TickerLink'
import { clip, useNames } from '../components/brandStore'
import { ConfidenceBar, PriceSpark, useSparks } from '../components/today/triggerViz'
import { fmtPct, fmtPrice, moveColor } from '../components/today/format'

const familyColor = (f: Family) => FAMILIES.find((x) => x.key === f)!.color
const PAGE = 40

/** Stocks down the side, nights across: each cell is that night's call, colored by kind. Click a cell for that night's stock page. */
function CallMatrix({ rows, dates }: { rows: HistoryRow[]; dates: string[] }) {
  const go = useNavigate()
  const tickers = useMemo(() => [...new Set(rows.map((r) => r.ticker))].sort(), [rows])
  const names = useNames(tickers)
  const at = useMemo(() => new Map(rows.map((r) => [`${r.ticker}|${r.date}`, r])), [rows])
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {FAMILIES.map((f) => (
          <span key={f.key} className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm" style={{ background: f.color }} aria-hidden="true" />
            {f.name}
          </span>
        ))}
        <span className="flex items-center gap-1.5" style={muted}>
          <span className="inline-block h-3 w-3 rounded-sm" style={{ border: '1px dashed var(--color-border, #cbd5e1)' }} aria-hidden="true" />
          not analysed that night
        </span>
      </div>
      <div className="max-h-[32rem] overflow-auto rounded-lg" style={{ border: '1px solid var(--color-border, #e2e8f0)' }}>
        <table className="border-separate text-xs" style={{ borderSpacing: 2 }}>
          <thead className="sticky top-0" style={{ background: 'var(--color-surface, #fff)' }}>
            <tr>
              <th className="sticky left-0 z-10 p-1 text-left" style={{ background: 'var(--color-surface, #fff)' }}>Stock</th>
              {dates.map((d) => (
                <th key={d} className="whitespace-nowrap p-1 font-normal" style={muted}>{d.slice(5)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tickers.map((t) => (
              <tr key={t}>
                <th scope="row" className="sticky left-0 z-10 whitespace-nowrap p-1 text-left font-semibold" style={{ background: 'var(--color-surface, #fff)' }}>
                  {t} <span className="font-normal" style={muted}>{clip(names[t], 18)}</span>
                </th>
                {dates.map((d) => {
                  const r = at.get(`${t}|${d}`)
                  if (!r) return <td key={d} className="h-6 w-12 rounded" style={{ border: '1px dashed var(--color-border, #e2e8f0)' }} />
                  const v = r.vs_spy['5'] ?? r.vs_spy['3'] ?? r.vs_spy['1']
                  return (
                    <td key={d} className="p-0">
                      <button
                        type="button"
                        onClick={() => go(`/stock/${t}?date=${d}`)}
                        className="block h-6 w-12 rounded"
                        style={{ background: familyColor(familyOf(r.label)) }}
                        title={`${t} ${d}: ${r.label} (${r.decision}, ${Math.round(r.confidence * 100)}%)${v !== undefined ? `; ${fmtPct(v)} against SPY so far` : ''}`}
                        aria-label={`${t} ${d}: ${r.label}`}
                      />
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const resultCell = (v: number | undefined) => (v === undefined ? <span style={muted}>—</span> : <span className="tabular-nums" style={{ color: moveColor(v) }}>{fmtPct(v)}</span>)

export function History() {
  const [data, setData] = useState<{ rows: HistoryRow[]; dates: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [family, setFamily] = useState<'all' | Family>('all')
  const [page, setPage] = useState(0)

  useEffect(() => {
    fetchHistory().then(setData, (e: Error) => setError(e.message))
  }, [])

  const names = useNames(data ? [...new Set(data.rows.map((r) => r.ticker))] : [])
  const shown = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    return data.rows.filter((r) => (family === 'all' || familyOf(r.label) === family) && (!q || r.ticker.toLowerCase().includes(q) || (names[r.ticker] ?? '').toLowerCase().includes(q)))
  }, [data, query, family, names])
  useEffect(() => setPage(0), [query, family])
  const pageRows = shown.slice(page * PAGE, page * PAGE + PAGE)
  const sparks = useSparks([...new Set(pageRows.map((r) => r.ticker))])

  if (error) return <p role="alert" className="app-page p-6">Could not load the call history: {error}.</p>
  if (!data) return <p className="app-page p-6" style={muted}>Loading the call history...</p>

  const scored = data.rows.filter((r) => r.vs_spy['1'] !== undefined)
  const beat = scored.filter((r) => (r.vs_spy['1'] ?? 0) > 0).length

  return (
    <div className="app-page mx-auto max-w-6xl space-y-8 p-3 sm:p-4 md:p-8">
      <PageHeader icon={HistoryIcon} title="Call history" sub="Every call the nightly analysis has made, newest first, with how the stock did against SPY afterwards." />

      <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))]">
        <StatTile icon={ListChecks} label="Calls" value={data.rows.length} hint={`${data.dates.length} nights`} />
        <StatTile label="Stocks" value={new Set(data.rows.map((r) => r.ticker)).size} hint="analysed at least once" />
        <StatTile label="Scored after a day" value={scored.length} hint="the rest are too recent" />
        <StatTile label="Beat SPY the next day" value={scored.length ? `${Math.round((beat / scored.length) * 100)}%` : '—'} hint={`${beat} of ${scored.length}`} to="/scorecard" />
      </div>

      <Card className="space-y-4">
        <SectionTitle icon={Grid3x3} title="Every call, stock by night" sub="One square per call, colored by what it said. Gaps: the stock was not analysed that night. Click a square for that night's stock page." />
        <CallMatrix rows={data.rows} dates={data.dates} />
      </Card>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <SectionTitle icon={ListChecks} title="All calls" sub={`${shown.length} shown. Result: the stock's return minus SPY's after 1, 3 and 5 trading days.`} />
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 rounded border px-2 py-1.5 text-sm" style={{ borderColor: 'var(--color-border, #e2e8f0)' }}>
              <Search className="h-4 w-4" style={muted} aria-hidden="true" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ticker or company" className="w-40 bg-transparent outline-none" aria-label="Search by ticker or company" />
            </label>
            <Segmented label="Kind of call" value={family} onChange={setFamily} options={[{ value: 'all', label: 'All' }, ...FAMILIES.map((f) => ({ value: f.key, label: f.name }))]} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead style={muted}>
              <tr>
                <th className="p-2 font-normal">Night</th>
                <th className="p-2 font-normal">Stock</th>
                <th className="p-2 font-normal">Last 30 days</th>
                <th className="p-2 font-normal">Call</th>
                <th className="p-2 font-normal">Confidence</th>
                <th className="p-2 text-right font-normal">Price</th>
                <th className="p-2 text-right font-normal">Trigger</th>
                <th className="p-2 text-right font-normal">1 day</th>
                <th className="p-2 text-right font-normal">3 days</th>
                <th className="p-2 text-right font-normal">5 days</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={`${r.date}-${r.ticker}`} style={{ borderTop: '1px solid var(--color-border, #e2e8f0)' }}>
                  <td className="whitespace-nowrap p-2 tabular-nums">{r.date}</td>
                  <td className="p-2"><TickerLink ticker={r.ticker} /><div className="text-xs" style={muted}>{r.group}</div></td>
                  <td className="p-2"><PriceSpark closes={(sparks[r.ticker] ?? []).slice(-30)} trigger={r.trigger_price} walk={r.walk_away} width={110} height={30} /></td>
                  <td className="p-2">
                    <span className="whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold" style={{ border: `1.5px solid ${familyColor(familyOf(r.label))}` }}>{r.label}</span>
                  </td>
                  <td className="p-2"><ConfidenceBar value={r.confidence} /></td>
                  <td className="p-2 text-right tabular-nums">{fmtPrice(r.price)}</td>
                  <td className="p-2 text-right tabular-nums">{r.trigger_price ? fmtPrice(r.trigger_price) : <span style={muted}>—</span>}</td>
                  <td className="p-2 text-right">{resultCell(r.vs_spy['1'])}</td>
                  <td className="p-2 text-right">{resultCell(r.vs_spy['3'])}</td>
                  <td className="p-2 text-right">{resultCell(r.vs_spy['5'])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {shown.length > PAGE && (
          <div className="flex items-center justify-between text-sm">
            <button type="button" className="rounded border px-3 py-1.5 disabled:opacity-40" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Newer</button>
            <span style={muted}>Page {page + 1} of {Math.ceil(shown.length / PAGE)}</span>
            <button type="button" className="rounded border px-3 py-1.5 disabled:opacity-40" disabled={(page + 1) * PAGE >= shown.length} onClick={() => setPage((p) => p + 1)}>Older</button>
          </div>
        )}
      </Card>
    </div>
  )
}
