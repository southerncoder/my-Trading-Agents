import { useEffect, useState } from 'react'
import { AlertOctagon, AlertTriangle, CalendarClock, CheckCircle2, Cpu, Layers, ListChecks, Server, Zap } from 'lucide-react'
import { lineSeverity } from '../components/platform/status'
import { fetchLatestNight, fetchRunStatus, fetchWatchlist, type NightlyDay, type RunStatus, type Watchlist } from '../services/nightly'
import { Card, PageHeader, SectionTitle, SegmentBar, StatTile, callColor, muted } from '../components/viz'

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
