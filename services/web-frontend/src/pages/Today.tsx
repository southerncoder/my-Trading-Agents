import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { fetchLatestNight, fetchNight, fetchNightDates, type NightlyDay } from '../services/nightly'
import { SummaryStrip } from '../components/today/SummaryStrip'
import { BuyNowList } from '../components/today/BuyNowList'
import { TriggerTable } from '../components/today/TriggerTable'
import { neighbours, newestFirst } from '../components/today/nights'
import { card, muted } from '../components/today/format'

export function Today() {
  const [day, setDay] = useState<NightlyDay | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dates, setDates] = useState<string[]>([])
  // undefined means "the newest night"; a date means the reader picked an older one.
  const [picked, setPicked] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const { hash } = useLocation()

  // Tiles and the dashboard link to #buy-now / #waiting: scroll there once the night has rendered.
  useEffect(() => {
    if (!hash || !day) return
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [hash, day])

  useEffect(() => {
    let cancelled = false
    fetchNightDates()
      .then((d) => !cancelled && setDates(newestFirst(d)))
      .catch(() => undefined) // without the list there is simply no picker
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(picked ? fetchNight(picked) : fetchLatestNight())
      .then((d) => {
        if (cancelled) return
        setDay(d)
        setError(null)
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load the nightly brief'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [picked])

  if (error && !day) {
    return (
      <div role="alert" className="p-6">
        <h1 className="text-xl font-semibold">Today</h1>
        <p className="pt-2">No nightly brief to show yet: {error}.</p>
        <p className="text-sm" style={muted}>
          The brief appears after the nightly run finishes.
        </p>
      </div>
    )
  }

  if (!day) {
    return <p className="p-6" style={muted}>Loading last night's brief...</p>
  }

  const buyNow = day.rows.filter((r) => r.label === 'Buy now')
  const waiting = day.rows.filter((r) => r.label !== 'Buy now')
  const newest = dates[0]
  const near = neighbours(dates, day.date)
  const older = dates.length > 0 && newest !== undefined && day.date !== newest
  const step = 'rounded border px-3 py-2 text-sm disabled:opacity-40'

  return (
    <div className="space-y-6 p-2 sm:p-4 md:p-6" aria-busy={loading}>
      <header className="space-y-3">
        <div>
          <h1 className="text-2xl font-semibold">{older ? 'Past night' : 'Today'}</h1>
          <p className="text-sm" style={muted}>
            Night of {day.date} &middot;{' '}
            <Link to="/stocks" className="underline decoration-dotted underline-offset-2 hover:decoration-solid">
              {day.rows.length} stocks
            </Link>{' '}
            &middot; models: {day.profile} &middot;{' '}
            <Link to="/scorecard" className="underline decoration-dotted underline-offset-2 hover:decoration-solid">
              how past calls did
            </Link>
          </p>
        </div>

        {dates.length > 1 && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Choose a night">
            <button
              type="button"
              className={step}
              style={card}
              disabled={!near.older || loading}
              onClick={() => near.older && setPicked(near.older)}
              aria-label="Show the previous night"
            >
              &larr; Older
            </button>
            <select
              aria-label="Night"
              value={day.date}
              disabled={loading}
              onChange={(e) => setPicked(e.target.value === newest ? undefined : e.target.value)}
              className="min-w-0 flex-1 rounded border px-2 py-2 text-sm sm:flex-none"
              style={card}
            >
              {dates.map((d) => (
                <option key={d} value={d}>
                  {d}
                  {d === newest ? ' (latest)' : ''}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={step}
              style={card}
              disabled={!near.newer || loading}
              onClick={() => near.newer && setPicked(near.newer === newest ? undefined : near.newer)}
              aria-label="Show the next night"
            >
              Newer &rarr;
            </button>
          </div>
        )}
        {error && (
          <p role="alert" className="text-sm" style={{ color: '#b91c1c' }}>
            Could not load that night: {error}
          </p>
        )}
      </header>

      {older && (
        <div role="status" className="rounded-lg p-3 text-sm" style={card}>
          You are looking at an older night. Prices and calls are as they were then.{' '}
          <button type="button" className="underline" onClick={() => setPicked(undefined)}>
            Back to the latest night
          </button>
        </div>
      )}

      {day.stale && !older && (
        <div role="status" className="rounded-lg p-3 text-sm" style={{ border: '1px solid #B7791F', color: '#B7791F' }}>
          This brief is from {day.date}, but the newest night should be {day.expected_date}. The nightly run may have
          missed a day.
        </div>
      )}

      {day.skipped_lines > 0 && (
        <p className="text-xs" style={muted}>
          {day.skipped_lines} unreadable ledger line(s) were skipped.
        </p>
      )}

      <div style={{ opacity: loading ? 0.6 : 1 }}>
        <div className="space-y-6">
          <SummaryStrip day={day} />
          <BuyNowList rows={buyNow} />
          <TriggerTable rows={waiting} />
        </div>
      </div>
    </div>
  )
}
