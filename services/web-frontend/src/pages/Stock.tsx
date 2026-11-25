import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { BarChart3, Building2, CandlestickChart, Crosshair, Gavel, Landmark, ListChecks, MessagesSquare } from 'lucide-react'
import { fetchStock, fetchStockExtras, fetchStockMedia, type StockDetail, type StockExtras, type StockMedia } from '../services/nightly'
import { SocialDesk } from '../components/stock/SocialDesk'
import { shortName } from '../components/stock/research'
import { HistoryTable } from '../components/stock/HistoryTable'
import { StageTabs } from '../components/stock/StageTabs'
import { arrow, card, fmtPct, fmtPrice, moveColor, muted } from '../components/today/format'
import { ProfessorPanel } from '../components/stock/ProfessorPanel'
import { DecisionCard, decisionColor } from '../components/stock/DecisionCard'
import { extractDecision } from '../components/stock/decision'
import { PriceChart } from '../components/stock/PriceChart'
import { LevelsBar } from '../components/stock/LevelsBar'
import { CallTimeline } from '../components/stock/CallTimeline'
import { FinancialsChart } from '../components/stock/FinancialsChart'
import { RegulatoryWatch } from '../components/stock/RegulatoryWatch'
import { BrandIcon } from '../components/BrandIcon'
import { CompanyProfile } from '../components/stock/CompanyProfile'

function Fig({ label, value, hint, hintColor }: { label: string; value: React.ReactNode; hint?: string; hintColor?: string }) {
  return (
    <div className="min-w-0 rounded-2xl p-4" style={card}>
      <div className="text-sm" style={muted}>{label}</div>
      <div className="mt-1 text-2xl font-semibold md:text-3xl">{value}</div>
      {hint && <div className="mt-1 truncate text-sm" style={{ color: hintColor ?? muted.color }} title={hint}>{hint}</div>}
    </div>
  )
}

function Section({ id, title, icon: Icon, sub, children }: { id: string; title: string; icon: React.ElementType; sub?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <div>
        <h2 id={id} className="flex items-center gap-2 text-2xl font-bold">
          <Icon className="h-6 w-6" style={{ color: 'var(--color-primary, #2563eb)' }} aria-hidden="true" /> {title}
        </h2>
        {sub && <p className="mt-1 text-base" style={muted}>{sub}</p>}
      </div>
      {children}
    </section>
  )
}

type Result = { key: string; data?: StockDetail; error?: string }
type Extras = { key: string; data?: StockExtras; error?: string }
type Media = { ticker: string; data?: StockMedia; error?: string }

export function Stock() {
  const { ticker = '' } = useParams()
  // A link may open a given night (?date=YYYY-MM-DD), e.g. from the scorecard's best and worst calls.
  const [params] = useSearchParams()
  const [date, setDate] = useState<string | undefined>(() => {
    const d = params.get('date')
    return d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined
  })
  const [result, setResult] = useState<Result | null>(null)
  const [extras, setExtras] = useState<Extras | null>(null)
  const [media, setMedia] = useState<Media | null>(null)
  const key = `${ticker}|${date ?? ''}`

  useEffect(() => {
    let cancelled = false
    fetchStock(ticker, date)
      .then((data) => !cancelled && setResult({ key, data }))
      .catch((e: unknown) => !cancelled && setResult({ key, error: e instanceof Error ? e.message : 'Could not load this stock' }))
    fetchStockExtras(ticker, date)
      .then((data) => !cancelled && setExtras({ key, data }))
      .catch((e: unknown) => !cancelled && setExtras({ key, error: e instanceof Error ? e.message : 'Could not load the charts' }))
    return () => {
      cancelled = true
    }
  }, [ticker, date, key])

  // News and social links depend on the stock, not the night, so changing nights does not refetch them.
  useEffect(() => {
    let cancelled = false
    fetchStockMedia(ticker)
      .then((data) => !cancelled && setMedia({ ticker, data }))
      .catch((e: unknown) => !cancelled && setMedia({ ticker, error: e instanceof Error ? e.message : 'Could not load news' }))
    return () => {
      cancelled = true
    }
  }, [ticker])

  const back = (
    <nav className="flex flex-wrap gap-x-4 text-base" aria-label="Related pages">
      <Link to="/" className="underline">&larr; Today</Link>
      <Link to="/picks" className="underline">Picks</Link>
      <Link to="/stocks" className="underline">All stocks</Link>
    </nav>
  )

  if (result?.key === key && result.error) {
    return (
      <div role="alert" className="space-y-2 p-6">
        {back}
        <h1 className="text-3xl font-bold">{ticker}</h1>
        <p className="text-lg">Nothing to show for this stock: {result.error}.</p>
      </div>
    )
  }

  const data = result?.data
  if (!data || data.ticker !== ticker) {
    return (
      <div role="status" className="p-6 text-lg" style={muted}>
        Loading {ticker}...
      </div>
    )
  }

  // Charts keep showing the previous night's data while the new one loads (no layout jump).
  const x = extras?.data
  const xLoading = extras?.key !== key
  const point = data.history.find((h) => h.date === data.date) ?? data.history[data.history.length - 1]
  const prev = data.history[data.history.indexOf(point) - 1]
  const change = prev ? (point.price / prev.price - 1) * 100 : null
  const priceHint = prev ? `${arrow(change)} ${fmtPct(change)} since ${prev.date}` : 'first night on record'
  const toTrigger = point.trigger_price != null && point.price ? ((point.trigger_price - point.price) / point.price) * 100 : null
  const decision = data.stages?.pm ? extractDecision(data.stages.pm) : null
  const color = decisionColor(point.decision.toUpperCase())
  const company = x?.profile?.name ?? x?.fundamentals?.name
  const m = media?.ticker === ticker ? media.data : undefined
  const short = shortName(x?.profile?.name ?? x?.fundamentals?.name, data.ticker)
  const research = {
    company: short,
    items: [...(m?.articles ?? []), ...(m?.social?.docs ?? []).map((d) => ({ title: d.title, url: d.url, source: d.domain }))],
  }
  const industry = x?.profile ? [x.profile.sector, x.profile.industry].filter(Boolean).join(' · ') : x?.fundamentals?.industry

  return (
    <div className="stock-page mx-auto max-w-6xl space-y-10 p-4 text-base md:p-8">
      <header className="space-y-5">
        {back}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <BrandIcon ticker={data.ticker} size={52} />
              <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">{data.ticker}</h1>
              <span className="rounded-lg px-3 py-1 text-lg font-bold" style={{ color, border: `2px solid ${color}` }}>
                {point.label}
              </span>
            </div>
            <div className="text-base" style={muted}>
              {company ? `${company}${industry ? ` · ${industry}` : ''} · ` : ''}night of {data.date} · models: {point.profile}
            </div>
          </div>
          <div className="text-right">
            <div className="text-5xl font-bold">{fmtPrice(point.price)}</div>
            <div className="text-base" style={{ color: moveColor(change) ?? muted.color }}>{priceHint}</div>
          </div>
        </div>
        <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))]">
          <Fig
            label="Trigger"
            value={fmtPrice(point.trigger_price)}
            hint={point.trigger_type ? `${point.trigger_type}${toTrigger !== null ? ` · ${fmtPct(toTrigger)} away` : ''}` : 'no trigger: acts on the call alone'}
          />
          <Fig label="Walk away below" value={fmtPrice(point.walk_away)} hint="the idea is dropped below this" />
          <Fig label="Confidence" value={`${Math.round(point.confidence * 100)}%`} hint={`decision: ${point.decision}`} />
          <Fig label="Nights on record" value={data.history.length} hint={`since ${data.history[0].date}`} />
        </div>
      </header>

      <Section id="price-heading" title="Price and the calls" icon={CandlestickChart} sub="Each marker is a night's call; click one to load that night.">
        <div className="rounded-2xl p-4 md:p-5" style={card}>
          {x && x.prices.length > 1 ? (
            <PriceChart prices={x.prices} history={data.history} selected={data.date} onSelect={setDate} />
          ) : xLoading ? (
            <div className="h-72 animate-pulse rounded-xl" />
          ) : (
            <p style={muted}>{x?.pricesError ?? extras?.error ?? 'No daily prices available.'}</p>
          )}
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section id="levels-heading" title="Where the price sits" icon={Crosshair} sub="The night's price against its trigger, walk-away and averages.">
          <div className="rounded-2xl p-4 md:p-5" style={card}>
            <LevelsBar point={point} />
          </div>
        </Section>
        <Section id="timeline-heading" title="How sure, night by night" icon={BarChart3} sub="Column height is confidence; letter and color are the call.">
          <div className="rounded-2xl p-4 md:p-5" style={card}>
            <CallTimeline history={data.history} selected={data.date} onSelect={setDate} />
          </div>
        </Section>
      </div>

      {x && (x.profile || x.fundamentals?.company || x.properties) && (
        <Section id="company-heading" title="About the company" icon={Building2} sub="Who they are, where they are, who runs them and what they own.">
          <CompanyProfile data={x} />
        </Section>
      )}

      {decision && (
        <Section id="call-heading" title="The final call" icon={ListChecks} sub="The portfolio manager's decision for this night.">
          <div className="rounded-2xl p-5 md:p-6" style={card}>
            <DecisionCard d={decision.decision} research={research} />
          </div>
        </Section>
      )}

      <SocialDesk media={m} loading={media?.ticker !== ticker} ticker={data.ticker} company={short} social={data.stages?.social} date={data.date} />

      <ProfessorPanel review={data.review} history={data.history} date={data.date} />

      <div style={{ opacity: xLoading && x ? 0.6 : 1 }}>
        <RegulatoryWatch data={x} date={data.date} loading={xLoading} />
      </div>

      {x?.fundamentals && (
        <Section id="fin-heading" title="Company financials" icon={Landmark} sub="Quarterly results from the company's SEC filings.">
          <div className="rounded-2xl p-4 md:p-5" style={card}>
            <FinancialsChart f={x.fundamentals} />
          </div>
        </Section>
      )}

      <Section id="history-heading" title="How the call changed" icon={Gavel}>
        <HistoryTable history={data.history} selected={data.date} onSelect={setDate} />
      </Section>

      <Section id="trail-heading" title="Opinion trail" icon={MessagesSquare} sub="Every analyst's write-up for this night, in the order they ran.">
        {data.stages ? (
          <StageTabs key={data.date} stages={data.stages} stance={data.stance} ctx={{ ticker: data.ticker, company: short, media: m, extras: x }} />
        ) : (
          <p style={muted}>The write-ups for this night aren&rsquo;t available.</p>
        )}
      </Section>
    </div>
  )
}
