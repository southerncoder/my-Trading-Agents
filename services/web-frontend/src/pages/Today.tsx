import { useEffect, useState } from 'react'
import { fetchLatestNight, type NightlyDay } from '../services/nightly'
import { SummaryStrip } from '../components/today/SummaryStrip'
import { BuyNowList } from '../components/today/BuyNowList'
import { TriggerTable } from '../components/today/TriggerTable'
import { muted } from '../components/today/format'

export function Today() {
  const [day, setDay] = useState<NightlyDay | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchLatestNight()
      .then((d) => !cancelled && setDay(d))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load the nightly brief'))
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
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

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Today</h1>
        <p className="text-sm" style={muted}>
          Night of {day.date} &middot; {day.rows.length} stocks &middot; models: {day.profile}
        </p>
      </header>

      {day.stale && (
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

      <SummaryStrip day={day} />
      <BuyNowList rows={buyNow} />
      <TriggerTable rows={waiting} />
    </div>
  )
}
