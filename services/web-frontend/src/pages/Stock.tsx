import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchStock, type StockDetail } from '../services/nightly'
import { HistoryTable } from '../components/stock/HistoryTable'
import { StageTabs } from '../components/stock/StageTabs'
import { arrow, card, fmtPct, fmtPrice, moveColor, muted } from '../components/today/format'
import { ProfessorPanel } from '../components/stock/ProfessorPanel'
import { decisionColor } from '../components/stock/DecisionCard'

function Fig({ label, value, hint, hintColor }: { label: string; value: React.ReactNode; hint?: string; hintColor?: string }) {
  return (
    <div className="min-w-0 rounded-lg p-3" style={card}>
      <div className="text-xs" style={muted}>{label}</div>
      <div className="text-xl font-semibold">{value}</div>
      {hint && <div className="truncate text-xs" style={{ color: hintColor ?? muted.color }} title={hint}>{hint}</div>}
    </div>
  )
}

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
    <nav className="flex flex-wrap gap-x-4 text-sm" aria-label="Related pages">
      <Link to="/" className="underline">&larr; Today</Link>
      <Link to="/picks" className="underline">Picks</Link>
      <Link to="/stocks" className="underline">All stocks</Link>
    </nav>
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
  const prev = data.history[data.history.indexOf(point) - 1]
  const change = prev ? (point.price / prev.price - 1) * 100 : null
  const priceHint = prev ? `${arrow(change)} ${fmtPct(change)} since ${prev.date}` : 'first night on record'
  const toTrigger = point.trigger_price != null && point.price ? ((point.trigger_price - point.price) / point.price) * 100 : null

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="space-y-3">
        {back}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-3xl font-bold">{data.ticker}</h1>
          <span
            className="rounded-md px-2 py-0.5 text-sm font-semibold"
            style={{ color: decisionColor(point.decision.toUpperCase()), border: `1px solid ${decisionColor(point.decision.toUpperCase())}` }}
          >
            {point.label}
          </span>
          <span className="text-sm" style={muted}>
            night of {data.date} &middot; models: {point.profile}
          </span>
        </div>
        <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))]">
          <Fig label="Price" value={fmtPrice(point.price)} hint={priceHint} hintColor={moveColor(change)} />
          <Fig
            label="Trigger"
            value={fmtPrice(point.trigger_price)}
            hint={point.trigger_type ? `${point.trigger_type}${toTrigger !== null ? ` · ${fmtPct(toTrigger)} away` : ''}` : 'no trigger: acts on the call alone'}
          />
          <Fig label="Walk away below" value={fmtPrice(point.walk_away)} hint="the idea is dropped below this" />
          <Fig label="Confidence" value={`${Math.round(point.confidence * 100)}%`} hint={`decision: ${point.decision}`} />
        </div>
      </header>

      <ProfessorPanel review={data.review} history={data.history} date={data.date} />

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
