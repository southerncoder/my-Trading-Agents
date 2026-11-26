import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, Clock, Loader2, Play, Timer, TrendingUp, XCircle } from 'lucide-react'
import { fetchRequest, fetchRequests, requestAnalysis, type AnalysisRequest, type Pick } from '../services/portfolio'
import { fetchWatchlist } from '../services/nightly'
import { Card, HBars, PageHeader, SectionTitle, callColor, muted } from '../components/viz'
import { TickerLink } from '../components/TickerLink'
import { ConfidenceBar, PriceSpark, useSparks } from '../components/today/triggerViz'
import { PickLadder } from '../components/portfolio/picksViz'
import { newsSearches, riskQuery } from '../components/stock/research'
import { useName } from '../components/brandStore'
import { ProfessorNote } from '../components/today/ProfessorNote'

const STATUS = {
  queued: { icon: Clock, color: '#64748b', word: 'Waiting for the worker' },
  running: { icon: Loader2, color: 'var(--viz-1, #2a78d6)', word: 'Running' },
  done: { icon: CheckCircle2, color: '#0A8F80', word: 'Done' },
  failed: { icon: XCircle, color: '#b91c1c', word: 'Failed' },
} as const

const secs = (a?: string | null, b?: string | null) => (a && b ? Math.max(0, (Date.parse(b) - Date.parse(a)) / 1000) : null)
const dur = (s: number | null) => (s === null ? '—' : s < 90 ? `${Math.round(s)}s` : `${Math.round(s / 60)} min`)

/** Waiting (grey) then running (blue) as one bar, scaled to the longest request shown. */
function TimeBar({ r, max, now }: { r: AnalysisRequest; max: number; now: string }) {
  const wait = secs(r.requested_at, r.started_at ?? (r.status === 'queued' ? now : r.finished_at)) ?? 0
  const run = secs(r.started_at, r.finished_at ?? (r.status === 'running' ? now : null)) ?? 0
  const pct = (s: number) => `${Math.max(s > 0 ? 2 : 0, (s / max) * 100)}%`
  return (
    <div className="space-y-0.5">
      <div className="flex h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--color-border, #e2e8f0)' }} aria-hidden="true">
        <span style={{ width: pct(wait), background: '#94a3b8' }} />
        <span style={{ width: pct(run), background: 'var(--viz-1, #2a78d6)', marginLeft: 2 }} />
      </div>
      <div className="text-xs" style={muted}>waited {dur(wait)} · ran {dur(run)}</div>
    </div>
  )
}

function Result({ id }: { id: number }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof fetchRequest>> | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setData(null)
    fetchRequest(id).then(setData, (e: Error) => setError(e.message))
  }, [id])
  const c = data?.candidate
  const sparks = useSparks(c ? [c.ticker] : [])
  const name = useName(c?.ticker ?? '')
  if (error) return <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>
  if (!data) return <p style={muted}>Loading the result...</p>
  if (!c) return <p style={muted}>This request has no result{data.request.error ? `: ${data.request.error.slice(0, 200)}` : '.'}</p>
  const pick = c as unknown as Pick
  const risks = (Array.isArray(c.key_risks) ? c.key_risks : []).slice(0, 4) as string[]
  const color = callColor(c.label)
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <TickerLink ticker={c.ticker} className="text-2xl font-bold" />
        <span className="rounded-lg px-3 py-1 text-lg font-bold" style={{ border: `2px solid ${color}` }}>{c.label}</span>
        <span className="text-sm" style={muted}>{c.decision} · analysed for {c.run_date}</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="rounded-xl p-3" style={{ border: '1px solid var(--color-border, #e2e8f0)' }}>
          <div className="mb-1 flex flex-wrap justify-between gap-2 text-sm">
            <span className="font-semibold">Last 90 trading days</span>
            <span className="flex gap-3 text-xs" style={muted}>
              <span><span style={{ color: '#0A8F80' }}>– –</span> trigger</span>
              <span><span style={{ color: '#D4501A' }}>– –</span> walk away</span>
            </span>
          </div>
          <PriceSpark closes={sparks[c.ticker] ?? []} trigger={(c.trigger_price as number | null) ?? null} walk={(c.walk_away as number | null) ?? null} width={560} height={150} axis />
        </div>
        <div className="space-y-3">
          <div className="rounded-xl p-3" style={{ border: '1px solid var(--color-border, #e2e8f0)' }}>
            <div className="text-xs" style={muted}>Price · trigger · walk away</div>
            <PickLadder p={pick} width={200} />
          </div>
          {typeof c.confidence === 'number' && (
            <div className="rounded-xl p-3" style={{ border: '1px solid var(--color-border, #e2e8f0)' }}>
              <div className="text-xs" style={muted}>Confidence (not yet calibrated)</div>
              <ConfidenceBar value={c.confidence} />
            </div>
          )}
          <div className="text-xs" style={muted}>
            {String(c.fast_model ?? '?')} → {String(c.decision_model ?? '?')}{c.llm_seconds ? ` · ${c.llm_seconds}s of analysis` : ''}
          </div>
        </div>
      </div>
      {c.rationale && <p className="text-lg leading-relaxed">{String(c.rationale)}</p>}
      <ProfessorNote review={(c.educational_review as Record<string, unknown> | null | undefined) ?? null} label={c.label} />
      {risks.length > 0 && (
        <div className="grid gap-2 md:grid-cols-2">
          {risks.map((r) => (
            <div key={r} className="rounded-xl p-3" style={{ border: '1px solid var(--color-border, #e2e8f0)', borderLeft: '3px solid #D4501A' }}>
              <div className="flex gap-1.5"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#D4501A' }} aria-hidden="true" />{r}</div>
              <div className="mt-1 flex flex-wrap gap-x-3 text-xs" style={muted}>
                Read up:
                {newsSearches(riskQuery(name ?? c.ticker, r)).map((l) => (
                  <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--color-primary, #2563eb)' }}>{l.label}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-4 text-sm font-semibold">
        <Link to={`/stock/${c.ticker}`} className="underline">Stock page and nightly history</Link>
        <Link to="/picks" className="underline">Record it on the Picks page</Link>
      </div>
    </div>
  )
}

export function Analysis() {
  const { symbol } = useParams()
  const navigate = useNavigate()
  const [ticker, setTicker] = useState((symbol ?? '').toUpperCase())
  const [reqs, setReqs] = useState<AnalysisRequest[] | null>(null)
  const [tick, setTick] = useState(0)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [known, setKnown] = useState<string[]>([])
  // The time the queue was last read: running bars and the 'worker may be off' check measure up to it.
  const [now, setNow] = useState(() => new Date().toISOString())

  useEffect(() => {
    fetchWatchlist().then((w) => setKnown(w.stocks.map((s) => s.ticker)), () => undefined)
  }, [])
  useEffect(() => {
    fetchRequests().then((r) => {
      setReqs(r)
      setNow(new Date().toISOString())
    }, (e: Error) => setMsg({ text: `Could not load the analysis queue: ${e.message}`, ok: false }))
  }, [tick])
  const active = (reqs ?? []).some((r) => r.status === 'queued' || r.status === 'running')
  // Poll while something is waiting or running, so progress shows without a reload.
  useEffect(() => {
    if (!active) return
    const t = window.setInterval(() => setTick((x) => x + 1), 10_000)
    return () => window.clearInterval(t)
  }, [active])

  const done = useMemo(() => (reqs ?? []).filter((r) => r.status === 'done' && r.candidate_id), [reqs])
  const shownId = selected ?? done[0]?.id ?? null
  const max = Math.max(60, ...(reqs ?? []).map((r) => (secs(r.requested_at, r.finished_at ?? now) ?? 0)))
  const stale = (reqs ?? []).some((r) => r.status === 'queued' && Date.parse(now) - Date.parse(r.requested_at) > 20 * 60_000)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setMsg(null)
    try {
      const r = await requestAnalysis(ticker)
      setMsg({ text: `${r.ticker} is ${r.status === 'queued' ? 'in the queue' : r.status}. The worker on this computer picks it up within about 10 minutes; one analysis takes about a minute.`, ok: true })
      navigate(`/analysis/${r.ticker}`, { replace: true })
      setTick((x) => x + 1)
    } catch (err) {
      setMsg({ text: (err as Error).message, ok: false })
    }
  }

  return (
    <div className="app-page mx-auto max-w-6xl space-y-8 p-3 sm:p-4 md:p-8">
      <PageHeader icon={TrendingUp} title="Analysis" sub="Ask for a full analysis of any stock now, instead of waiting for tonight's run: the same analysts, debate, trader, risk team and final call. The result also appears on the Picks page." />

      <Card className="space-y-3">
        <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm font-semibold">
            Ticker
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              list="known-tickers"
              maxLength={10}
              placeholder="AAPL"
              autoCapitalize="characters"
              spellCheck={false}
              className="w-36 rounded border px-3 py-2 text-lg font-normal uppercase"
              style={{ borderColor: 'var(--color-border, #e2e8f0)', background: 'var(--color-surface, #fff)' }}
            />
            <datalist id="known-tickers">{known.map((t) => <option key={t} value={t} />)}</datalist>
          </label>
          <button type="submit" disabled={!ticker.trim()} className="flex items-center gap-2 rounded px-4 py-2.5 font-semibold text-white disabled:opacity-50" style={{ background: 'var(--color-primary, #2563eb)' }}>
            <Play className="h-4 w-4" aria-hidden="true" /> Analyze
          </button>
        </form>
        {msg && <p role={msg.ok ? 'status' : 'alert'} className="text-sm" style={{ color: msg.ok ? '#0A8F80' : '#b91c1c' }}>{msg.text}</p>}
        {stale && (
          <p className="text-sm" style={{ color: '#b45309' }}>
            A request has waited more than 20 minutes: the worker task on this computer may be off. It is the scheduled task &quot;Portfolio analysis worker&quot; (tools/portfolio-worker.ps1).
          </p>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card className="space-y-3">
          <SectionTitle icon={Timer} title="Requests" sub={active ? 'Updating every 10 seconds while one is waiting or running.' : 'Newest first. Click a finished one for its result.'} />
          {reqs?.length === 0 && <p style={muted}>No requests yet.</p>}
          <ul className="space-y-2">
            {(reqs ?? []).slice(0, 15).map((r) => {
              const s = STATUS[r.status]
              const Icon = s.icon
              const pickable = r.status === 'done' && r.candidate_id
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    disabled={!pickable}
                    onClick={() => setSelected(r.id)}
                    className="block w-full space-y-1.5 rounded-xl p-3 text-left disabled:cursor-default"
                    style={{ border: `1px solid ${shownId === r.id ? 'var(--color-primary, #2563eb)' : 'var(--color-border, #e2e8f0)'}`, borderLeft: `4px solid ${s.color}` }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold">{r.ticker}</span>
                      <span className="flex items-center gap-1 text-sm" style={{ color: s.color }}>
                        <Icon className={`h-4 w-4 ${r.status === 'running' ? 'animate-spin' : ''}`} aria-hidden="true" />
                        {s.word}
                      </span>
                      {r.label && <span className="ml-auto rounded-full px-2 py-0.5 text-xs font-semibold" style={{ border: `1.5px solid ${callColor(r.label)}` }}>{r.label}</span>}
                    </div>
                    <TimeBar r={r} max={max} now={now} />
                    <div className="text-xs" style={muted}>
                      asked {r.requested_at.slice(0, 16).replace('T', ' ')} UTC{r.reason !== 'on_demand' ? ` · because of ${r.reason.replace('_', ' ')}` : ''}
                      {r.status === 'failed' && r.error ? ` · ${r.error.slice(0, 100)}` : ''}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card className="space-y-3">
            <SectionTitle icon={CheckCircle2} title="Result" />
            {shownId ? <Result id={shownId} /> : <p style={muted}>No finished analysis yet. Ask for one above.</p>}
          </Card>
          {done.length > 1 && (
            <Card className="space-y-3">
              <SectionTitle icon={Timer} title="How long each analysis ran" sub="From the worker picking it up to the result. Click for the stock." />
              <HBars
                labelWidth={130}
                format={(v) => dur(v)}
                onRow={(k) => navigate(`/stock/${k.split('|')[0]}`)}
                rows={done.slice(0, 12).map((r) => ({ key: `${r.ticker}|${r.id}`, label: r.ticker, ticker: r.ticker, value: secs(r.started_at, r.finished_at) ?? 0, note: r.label ?? '' }))}
              />
            </Card>
          )}
        </div>
      </div>
      <p className="text-xs" style={muted}>
        Analyses run on this computer, not on this page: the request waits in a queue until the worker task takes it.
      </p>
    </div>
  )
}
