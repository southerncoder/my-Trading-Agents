import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchStock, type StockDetail } from '../services/nightly'
import { HistoryTable } from '../components/stock/HistoryTable'
import { StageTabs } from '../components/stock/StageTabs'
import { fmtPrice, muted } from '../components/today/format'

type Result = { key: string; data?: StockDetail; error?: string }

export function Stock() {
  const { ticker = '' } = useParams()
  const [date, setDate] = useState<string | undefined>(undefined)
  const [result, setResult] = useState<Result | null>(null)
  const key = `${ticker}|${date ?? ''}`

  useEffect(() => {
    let cancelled = false
    fetchStock(ticker, date)
      .then((data) => !cancelled && setResult({ key, data }))
      .catch((e: unknown) => !cancelled && setResult({ key, error: e instanceof Error ? e.message : 'Could not load this stock' }))
    return () => {
      cancelled = true
    }
  }, [ticker, date, key])

  const back = (
    <Link to="/" className="text-sm underline">
      &larr; Today
    </Link>
  )

  if (result?.key === key && result.error) {
    return (
      <div role="alert" className="space-y-2 p-6">
        {back}
        <h1 className="text-xl font-semibold">{ticker}</h1>
        <p>Nothing to show for this stock: {result.error}.</p>
      </div>
    )
  }

  const data = result?.data
  if (!data || data.ticker !== ticker) {
    return (
      <div role="status" className="p-6" style={muted}>
        Loading {ticker}...
      </div>
    )
  }

  const point = data.history.find((h) => h.date === data.date) ?? data.history[data.history.length - 1]

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        {back}
        <h1 className="text-2xl font-semibold">
          {data.ticker} <span className="text-base font-normal" style={muted}>night of {data.date}</span>
        </h1>
        <p className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span>{fmtPrice(point.price)}</span>
          <span>{point.label}</span>
          <span>
            <span style={muted}>Trigger: </span>
            {fmtPrice(point.trigger_price)}
            {point.trigger_type ? ` (${point.trigger_type})` : ''}
          </span>
          <span>
            <span style={muted}>Walk away below: </span>
            {fmtPrice(point.walk_away)}
          </span>
        </p>
      </header>

      <section aria-labelledby="history-heading" className="space-y-2">
        <h2 id="history-heading" className="text-lg font-semibold">
          How the call changed
        </h2>
        <HistoryTable history={data.history} selected={data.date} onSelect={setDate} />
      </section>

      <section aria-labelledby="trail-heading" className="space-y-2">
        <h2 id="trail-heading" className="text-lg font-semibold">
          Opinion trail
        </h2>
        {data.stages ? (
          <StageTabs key={data.date} stages={data.stages} />
        ) : (
          <p style={muted}>The write-ups for this night aren&rsquo;t available.</p>
        )}
      </section>
    </div>
  )
}
