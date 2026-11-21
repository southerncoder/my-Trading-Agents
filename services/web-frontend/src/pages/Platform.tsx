import { useEffect, useState } from 'react'
import { fetchRunStatus, fetchWatchlist, type RunStatus, type Watchlist } from '../services/nightly'
import { card, muted } from '../components/today/format'

export function Platform() {
  const [run, setRun] = useState<RunStatus | null>(null)
  const [watch, setWatch] = useState<Watchlist | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchRunStatus(), fetchWatchlist()])
      .then(([r, w]) => {
        if (cancelled) return
        setRun(r)
        setWatch(w)
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load platform status'))
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <div role="alert" className="p-6">
        <h1 className="text-xl font-semibold">Platform</h1>
        <p className="pt-2">Could not load platform status: {error}.</p>
      </div>
    )
  }
  if (!run || !watch) return <p className="p-6" style={muted}>Loading platform status...</p>

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Platform</h1>
        <p className="text-sm" style={muted}>How the nightly analysis ran and what it ran on.</p>
      </header>

      <section aria-labelledby="last-run" className="rounded-lg p-4" style={card}>
        <h2 id="last-run" className="text-lg font-semibold">Last nightly run</h2>
        {run.status ? (
          <>
            <p className="text-sm" style={muted}>Night of {run.status.date}</p>
            <ul className="list-disc space-y-1 pl-5 pt-2 text-sm">
              {run.status.lines.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="pt-2 text-sm" style={muted}>No run summary yet. It appears after the first nightly run finishes.</p>
        )}
      </section>

      <section aria-labelledby="models" className="rounded-lg p-4" style={card}>
        <h2 id="models" className="text-lg font-semibold">Models used</h2>
        {run.models ? (
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 pt-2 text-sm">
            <dt style={muted}>Night</dt>
            <dd>{run.models.date}</dd>
            <dt style={muted}>Profile</dt>
            <dd>{run.models.profile || 'unknown'}</dd>
            <dt style={muted}>Quick-look model</dt>
            <dd>{run.models.fast_model ?? 'not recorded'}</dd>
            <dt style={muted}>Decision model</dt>
            <dd>{run.models.decision_model ?? 'not recorded'}</dd>
            <dt style={muted}>Stocks analysed</dt>
            <dd>{run.models.rows}</dd>
          </dl>
        ) : (
          <p className="pt-2 text-sm" style={muted}>No analysed nights in the ledger yet.</p>
        )}
      </section>

      <section aria-labelledby="schedule" className="rounded-lg p-4" style={card}>
        <h2 id="schedule" className="text-lg font-semibold">Watchlist schedule</h2>
        {watch.available ? (
          <p className="pt-2 text-sm">
            {watch.stocks.length} stocks: {watch.counts.nightly} nightly, {watch.counts.weekly} weekly, {watch.counts.once}{' '}
            one-time, {watch.counts.paused} paused.
          </p>
        ) : (
          <p className="pt-2 text-sm" style={muted}>The watchlist file could not be read.</p>
        )}
      </section>
    </div>
  )
}
