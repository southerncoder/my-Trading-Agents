import { useEffect, useState } from 'react'
import { ChartGuide } from '../components/learn/Learn'
import { Activity, AlertOctagon, AlertTriangle, BarChart3, CalendarClock, CheckCircle2, Cpu, History, Layers, ListChecks, Server, Timer, Zap } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CallsPerNight, ModelTimeline, PriceChecks, ProviderList, RunMinutes, ServiceGrid } from '../components/platform/charts'
import { lineSeverity } from '../components/platform/status'
import { fetchLatestNight, fetchPlatform, fetchPriceCheck, fetchProviders, type PriceCheck, type ProviderItem, fetchRunStatus, fetchWatchlist, type NightlyDay, type Platform as PlatformData, type RunStatus, type Watchlist } from '../services/nightly'
import { Card, HBars, PageHeader, SectionTitle, SegmentBar, StatTile, callColor, muted } from '../components/viz'

const SEVERITY = {
  problem: { icon: AlertOctagon, color: '#b91c1c', word: 'Problem' },
  warning: { icon: AlertTriangle, color: '#b45309', word: 'Check' },
  ok: { icon: CheckCircle2, color: '#0A8F80', word: 'OK' },
} as const

const CADENCE_COLOR = { nightly: 'var(--viz-1, #2a78d6)', weekly: 'var(--viz-2, #eb6834)', once: 'var(--viz-3, #1baf7a)', paused: '#94a3b8' }

export function Platform() {
  const [run, setRun] = useState<RunStatus | null>(null)
  const [watch, setWatch] = useState<Watchlist | null>(null)
  const [night, setNight] = useState<NightlyDay | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [plat, setPlat] = useState<PlatformData | null>(null)
  const [providers, setProviders] = useState<{ checkedAt: string; items: ProviderItem[] } | null>(null)
  const [prices, setPrices] = useState<PriceCheck[] | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchRunStatus(), fetchWatchlist()])
      .then(([r, w]) => {
        if (cancelled) return
        setRun(r)
        setWatch(w)
      })
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load platform status'))
    fetchLatestNight()
      .then((n) => !cancelled && setNight(n))
      .catch(() => undefined)
    fetchPlatform()
      .then((p) => !cancelled && setPlat(p))
      .catch(() => undefined)
    fetchProviders()
      .then((p) => !cancelled && setProviders(p))
      .catch(() => undefined)
    fetchPriceCheck()
      .then((p) => !cancelled && setPrices(p))
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <div role="alert" className="app-page p-6">
        <h1>Platform</h1>
        <p className="pt-2 text-lg">Could not load platform status: {error}.</p>
      </div>
    )
  }
  if (!run || !watch) return <p className="p-6 text-lg" style={muted}>Loading platform status...</p>

  const lines = run.status?.lines ?? []
  const counts = { problem: 0, warning: 0, ok: 0 }
  for (const l of lines) counts[lineSeverity(l)]++
  const byLabel = night ? Object.entries(night.summary.by_label).sort((a, b) => b[1] - a[1]) : []

  return (
    <div className="app-page mx-auto max-w-6xl space-y-8 p-4 md:p-8">
      <PageHeader icon={Server} title="Platform" sub="How the nightly analysis ran, what it ran on and what it covers." />

      <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))]">
        <StatTile icon={CalendarClock} label="Last run" value={run.status?.date ?? '—'} hint={night?.stale ? `expected ${night.expected_date}` : 'up to date'} />
        <StatTile icon={ListChecks} label="Stocks analysed" value={run.models?.rows ?? '—'} hint={run.models ? `night of ${run.models.date}` : undefined} />
        <StatTile icon={AlertOctagon} label="Problems" value={counts.problem} hint={`${counts.warning} to check`} accent={counts.problem ? '#b91c1c' : undefined} />
        <StatTile icon={Layers} label="Watchlist" value={watch.stocks.length} hint={`${watch.counts.nightly} nightly`} to="/stocks" />
      </div>

      {plat && (
        <Card className="space-y-4">
          <SectionTitle icon={Activity} title="Data services right now" sub={`${plat.services.filter((x) => x.ok).length} of ${plat.services.length} answering their health check. Checked when this page loaded.`} />
          <ServiceGrid services={plat.services} />
          <ChartGuide shows={"Whether each data service answered its health check when this page loaded, and how fast."} good={"All up, each answering within a second."} careful={"A health check proves the service answers, not that every data provider behind it returns data."} terms={["pipeline"]} />
        </Card>
      )}

      <Card className="space-y-4">
        <SectionTitle icon={Activity} title="Data providers" sub={providers ? `What each provider returned when asked a small real question at ${providers.checkedAt.slice(11, 16)} UTC (re-checked every 10 minutes).` : 'Asking each provider a small real question...'} />
        {providers ? <ProviderList items={providers.items} /> : <p style={muted}>Checking...</p>}
        <ChartGuide shows="Each provider behind the data services, and what it gave back just now: articles, macro series, filings, sentiment, a price." good="Everything green except what is switched off on purpose (grey)." careful="A red provider means the analysis runs without that data; the nightly run still completes, so this list is where an outage shows." terms={['pipeline']} />
      </Card>

      <Card className="space-y-4">
        <SectionTitle icon={Activity} title="Price check against a second source" sub="The last week of daily closes for tonight's stocks and SPY, from the Yahoo service the whole site uses, compared with Nasdaq's." />
        {prices ? <PriceChecks checks={prices} /> : <p style={muted}>Comparing closes (the first check of the day takes a few seconds)...</p>}
        <ChartGuide shows="Whether the prices behind every chart, score and backtest agree with an independent source." good="Every stock within a few hundredths of a percent." careful="A mismatch means one source has a bad or late close; scores for that stock on that day are suspect until it is fixed." terms={['vs-spy']} />
      </Card>

      {plat && plat.nights.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-4">
            <SectionTitle icon={BarChart3} title="Calls per night" sub="How many stocks each night analysed, by where they came from." />
            <CallsPerNight nights={plat.nights} />
            <ChartGuide shows={"How many stocks each night analysed, by where they came from."} careful={"More stocks means a longer run; the screen and news sources add picks beyond the watchlist."} terms={["call"]} />
          </Card>
          <Card className="space-y-4">
            <SectionTitle icon={Timer} title="Run time per night" sub="Minutes from start to finish of the whole nightly run, as the run itself recorded. A dash: not recorded that night." />
            <RunMinutes nights={plat.nights} />
            <ChartGuide shows={"Minutes from start to finish of each nightly run."} good={"Steady times: a sudden jump usually means a slow model or a provider timing out."} careful={"Cloud model speed varies by time of day."} terms={["pipeline"]} />
          </Card>
        </div>
      )}

      {plat?.lastNight && plat.lastNight.stocks.length > 0 && (() => {
        const st = plat.lastNight.stocks
        const secs = st.map((x) => x.seconds).sort((a, b) => a - b)
        const med = secs[Math.floor(secs.length / 2)]
        return (
          <Card className="space-y-4">
            <SectionTitle icon={Timer} title="Analysis time per stock" sub={`Night of ${plat.lastNight.date}: seconds the full pipeline (analysts, debate, trader, risk, final call) took for each stock. Click for the stock.`} />
            <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-3">
              <StatTile label="Median" value={`${Math.round(med)}s`} hint="half took less" />
              <StatTile label="Longest" value={`${Math.round(secs[secs.length - 1])}s`} hint={st[0].ticker} />
              <StatTile label="All stocks" value={`${Math.round(secs.reduce((a, b) => a + b, 0) / 60)}m`} hint={`${st.length} analysed`} />
            </div>
            <HBars
              labelWidth={150}
              format={(v) => `${Math.round(v)}s`}
              onRow={(t) => navigate(`/stock/${t}`)}
              rows={st.map((x) => ({ key: x.ticker, label: x.ticker, ticker: x.ticker, value: x.seconds, note: x.group }))}
            />
            <ChartGuide shows={"Seconds the full pipeline took for each stock last night."} careful={"Longer does not mean better analysis; it usually means more data or a slower model reply."} terms={["pipeline"]} />
          </Card>
        )
      })()}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <SectionTitle icon={Zap} title="What the last run said" sub={run.status ? `Night of ${run.status.date}` : undefined} />
          {lines.length ? (
            <div className="grid gap-2">
              {lines.map((l, i) => {
                const s = SEVERITY[lineSeverity(l)]
                return (
                  <div key={i} className="flex gap-3 rounded-xl p-3 text-base" style={{ border: '1px solid var(--color-border, #e2e8f0)', borderLeft: `4px solid ${s.color}` }}>
                    <s.icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: s.color }} aria-label={s.word} />
                    <span>{l}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p style={muted}>No run summary yet. It appears after the first nightly run finishes.</p>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="space-y-4">
            <SectionTitle icon={Cpu} title="Models used" sub={run.models ? `Profile "${run.models.profile || 'unknown'}"` : undefined} />
            {run.models ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl p-4" style={{ border: '1px solid var(--color-border, #e2e8f0)' }}>
                  <div className="text-sm" style={muted}>Quick-look model (analysts, debate, risk)</div>
                  <div className="mt-1 break-all text-lg font-semibold">{run.models.fast_model ?? 'not recorded'}</div>
                </div>
                <div className="rounded-xl p-4" style={{ border: '1px solid var(--color-border, #e2e8f0)' }}>
                  <div className="text-sm" style={muted}>Decision model (research manager, trader, final call)</div>
                  <div className="mt-1 break-all text-lg font-semibold">{run.models.decision_model ?? 'not recorded'}</div>
                </div>
              </div>
            ) : (
              <p style={muted}>No analysed nights in the ledger yet.</p>
            )}
          </Card>

          <Card className="space-y-4">
            <SectionTitle icon={CalendarClock} title="Watchlist schedule" sub="How often each stock is analysed." />
            {watch.available ? (
              <SegmentBar
                unit=" stocks"
                parts={(['nightly', 'weekly', 'once', 'paused'] as const).map((k) => ({ label: k === 'once' ? 'one-time' : k, value: watch.counts[k], color: CADENCE_COLOR[k] }))}
              />
            ) : (
              <p style={muted}>The watchlist file could not be read.</p>
            )}
          </Card>

          {plat && plat.nights.length > 0 && (
            <Card className="space-y-4">
              <SectionTitle icon={History} title="Models by night" sub="Quick-look model → decision model. Results before and after a change are not directly comparable." />
              <ModelTimeline nights={plat.nights} />
              <ChartGuide shows={"Which model setup ran each night."} careful={"Results before and after a model change come from different 'analysts': do not pool them when judging the calls."} terms={["pipeline", "sample"]} />
            </Card>
          )}

          {night && byLabel.length > 0 && (
            <Card className="space-y-4">
              <SectionTitle icon={ListChecks} title="Last night's calls" sub={`${night.rows.length} calls on ${night.date}`} />
              <SegmentBar parts={byLabel.map(([label, n]) => ({ label, value: n, color: callColor(label) }))} />
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
