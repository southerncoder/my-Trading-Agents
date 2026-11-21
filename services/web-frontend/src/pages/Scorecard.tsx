import { useEffect, useState } from 'react'
import { ZodError } from 'zod'
import { fetchScorecard, type Scorecard as ScorecardData, type ScoreCell } from '../services/nightly'
import { pivot } from '../components/scorecard/pivot'
import { card, fmtPct, moveColor, muted } from '../components/today/format'

type State = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ready'; data: ScorecardData | null }

function GroupTable({ title, cells, horizons }: { title: string; cells: ScoreCell[]; horizons: number[] }) {
  const rows = pivot(cells, horizons)
  return (
    <section className="rounded-lg p-4" style={card}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="pt-2 text-sm" style={muted}>Nothing has matured yet.</p>
      ) : (
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">{title}: average return versus the market after 1, 3 and 5 trading days</caption>
            <thead style={muted}>
              <tr>
                <th scope="col" className="p-2">Group</th>
                {horizons.map((h) => (
                  <th key={h} scope="col" className="p-2">After {h} day{h === 1 ? '' : 's'}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} style={{ borderTop: '1px solid var(--color-border, #e2e8f0)' }}>
                  <th scope="row" className="p-2 font-medium">{r.key}</th>
                  {r.cells.map((c, i) => (
                    <td key={horizons[i]} className="p-2" style={c && !c.enough ? muted : undefined}>
                      {c ? (
                        <>
                          <span style={{ color: c.enough ? moveColor(c.avg_excess_pct) : undefined }}>
                            {fmtPct(c.avg_excess_pct)}
                          </span>{' '}
                          <span style={muted}>
                            ({c.n} call{c.n === 1 ? '' : 's'}, {Math.round(c.up_share * 100)}% beat it)
                          </span>
                          {!c.enough && <span className="block text-xs">too early to judge</span>}
                        </>
                      ) : (
                        <span style={muted}>-</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function WaitingTable({ cells }: { cells: ScoreCell[] }) {
  const rows = cells.filter((c) => c.trigger).sort((a, b) => a.key.localeCompare(b.key) || a.horizon - b.horizon)
  if (rows.length === 0) return null
  return (
    <section className="rounded-lg p-4" style={card}>
      <h2 className="text-lg font-semibold">Did waiting for the trigger pay?</h2>
      <p className="text-sm" style={muted}>
        For calls that said to wait. "Waiting vs buying now" is positive when waiting for the trigger beat buying at the
        call price (a call that never triggers counts as 0%).
      </p>
      <div className="overflow-x-auto pt-2">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Fill rate and waiting versus buying now, by call and horizon</caption>
          <thead style={muted}>
            <tr>
              <th scope="col" className="p-2">Call</th>
              <th scope="col" className="p-2">Horizon</th>
              <th scope="col" className="p-2">Calls</th>
              <th scope="col" className="p-2">Triggered</th>
              <th scope="col" className="p-2">Cancelled</th>
              <th scope="col" className="p-2">Waiting vs buying now</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={`${c.key}-${c.horizon}`} style={{ borderTop: '1px solid var(--color-border, #e2e8f0)' }}>
                <th scope="row" className="p-2 font-medium">{c.key}</th>
                <td className="p-2">{c.horizon} day{c.horizon === 1 ? '' : 's'}</td>
                <td className="p-2">{c.trigger?.n}</td>
                <td className="p-2">{Math.round((c.trigger?.fill_rate ?? 0) * 100)}%</td>
                <td className="p-2">{Math.round((c.trigger?.cancelled_rate ?? 0) * 100)}%</td>
                <td className="p-2" style={(c.trigger?.n ?? 0) >= 10 ? { color: moveColor(c.trigger?.wait_minus_now_pct) } : muted}>
                  {fmtPct(c.trigger?.wait_minus_now_pct)}
                  {(c.trigger?.n ?? 0) < 10 && <span className="block text-xs">too early to judge</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function Scorecard() {
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    fetchScorecard()
      .then((data) => !cancelled && setState({ kind: 'ready', data }))
      .catch((e: unknown) =>
        !cancelled &&
        setState({
          kind: 'error',
          message: e instanceof ZodError ? 'The scorecard data was not in the expected shape' : 'Could not load the scorecard',
        }),
      )
    return () => {
      cancelled = true
    }
  }, [])

  if (state.kind === 'loading') return <p role="status" className="p-6" style={muted}>Loading the scorecard...</p>
  if (state.kind === 'error') {
    return (
      <div role="alert" className="p-6">
        <h1 className="text-xl font-semibold">Scorecard</h1>
        <p className="pt-2">{state.message}.</p>
      </div>
    )
  }
  if (!state.data) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Scorecard</h1>
        <p className="pt-2">No scorecard yet.</p>
        <p className="text-sm" style={muted}>It is built after each nightly run once calls are a trading day old.</p>
      </div>
    )
  }

  const d = state.data
  const m = (h: number) => d.matured[String(h)] ?? 0

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Scorecard</h1>
        <p className="text-sm" style={muted}>
          Did past calls work? Each number is how much the stock beat (or lagged) {d.benchmark} over the next 1, 3 or 5
          trading days, so a falling market does not make every call look bad.
        </p>
      </header>

      <section className="rounded-lg p-4 text-sm" style={card} aria-label="How much data this is based on">
        <p>
          {d.calls} calls in the ledger. Finished results so far:{' '}
          {d.horizons.map((h, i) => (
            <span key={h}>
              {i > 0 && ', '}
              {m(h)} after {h} day{h === 1 ? '' : 's'}
            </span>
          ))}
          .
        </p>
        <p className="pt-1" style={muted}>
          This is early. Results based on fewer than 10 calls are greyed out and marked "too early to judge". Calls are
          the same stock in different nights, so treat every number as a hint, not a verdict.
          {d.unscored > 0 && ` ${d.unscored} call(s) could not be scored because price history was missing.`}
        </p>
        <p className="pt-1 text-xs" style={muted}>Updated {d.generated_at.slice(0, 16).replace('T', ' ')} UTC</p>
      </section>

      <p className="text-xs" style={muted}>
        Every number is measured from the close on the day of the call, whether or not a "wait for the trigger" call ever
        triggered. The last table shows what waiting changed.
      </p>
      <GroupTable title="By call" cells={d.groups.label} horizons={d.horizons} />
      <GroupTable title="By confidence" cells={d.groups.band} horizons={d.horizons} />
      <GroupTable title="By model setup" cells={d.groups.profile} horizons={d.horizons} />
      <WaitingTable cells={d.groups.label} />
    </div>
  )
}
