import { Briefcase } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, HBars, SectionTitle } from '../components/viz'
import { useEffect, useState } from 'react'
import { MiniVersus } from '../components/dashboard/widgets'
import { ChartGuide } from '../components/learn/Learn'
import { Link } from 'react-router-dom'
import { card, fmtPct, moveColor, muted } from '../components/today/format'
import { button, field, money, primaryButton, primaryStyle, sectionTitle, useLoad } from '../components/portfolio/ui'
import { kindInfo } from '../components/portfolio/helpers'
import { createPortfolio, fetchPerformance, fetchPortfolios, type Performance, type PortfolioSummary } from '../services/portfolio'

function Versus({ p }: { p: PortfolioSummary }) {
  return (
    <span>
      <span style={{ color: moveColor(p.returnPct) }}>{fmtPct(p.returnPct)}</span>
      <span style={muted}> vs SPY {p.spyReturnPct === null ? 'n/a' : fmtPct(p.spyReturnPct)}</span>
    </span>
  )
}

export function Portfolios() {
  const navigate = useNavigate()
  const { data, error, reload } = useLoad(fetchPortfolios, 'all')
  const [name, setName] = useState('')
  const [cash, setCash] = useState('10000')
  const [size, setSize] = useState('1000')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [perf, setPerf] = useState<Record<number, Performance['series']>>({})
  const ids = (data ?? []).map((p) => p.id).join(',')
  useEffect(() => {
    if (!ids) return
    let live = true
    Promise.allSettled(ids.split(',').map((id) => fetchPerformance(Number(id)).then((r) => [Number(id), r.series] as const))).then((rs) => {
      if (!live) return
      const out: Record<number, Performance['series']> = {}
      for (const r of rs) if (r.status === 'fulfilled') out[r.value[0]] = r.value[1]
      setPerf(out)
    })
    return () => {
      live = false
    }
  }, [ids])

  async function onCreate(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      await createPortfolio({ name: name.trim(), startingCash: Number(cash), rules: { position_size: Number(size) } })
      setName('')
      reload()
    } catch (err) {
      setMsg((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="app-page mx-auto max-w-6xl space-y-6 p-3 sm:p-4 md:p-8">
      <header className="space-y-2">
        <h1 className="flex items-center gap-3"><Briefcase className="h-9 w-9" style={{ color: 'var(--color-primary, #2563eb)' }} aria-hidden="true" />Portfolios</h1>
        <p className="max-w-3xl text-lg" style={muted}>
          Paper money only, on real prices. You record the trades; each night the system checks the exit plan and the risk
          limits and tells you when to act. The shadow portfolio takes every pick by itself, so you can see whether your choices beat the system&apos;s.
        </p>
      </header>

      {error && <p role="alert" className="text-sm" style={{ color: '#D4501A' }}>Could not load portfolios: {error}</p>}
      {!data && !error && <p role="status" className="text-sm" style={muted}>Loading...</p>}

      {data && data.some((p) => p.spyReturnPct !== null) && (
        <Card className="space-y-3">
          <SectionTitle title="Return against SPY" sub="Each portfolio's return since it started (bar) and how it compares with SPY over the same days. Click a bar to open it." />
          <HBars
            labelWidth={200}
            format={(v) => fmtPct(v, 2)}
            onRow={(id) => navigate(`/portfolios/${id}`)}
            rows={data.map((p) => ({ key: String(p.id), label: p.name, value: p.returnPct, note: p.spyReturnPct === null ? 'SPY n/a' : `SPY ${fmtPct(p.spyReturnPct, 2)} · ${p.returnPct >= p.spyReturnPct ? 'ahead' : 'behind'}` }))}
          />
          <ChartGuide shows="Each portfolio's return since it started, with SPY's return over the same days beside it." good="Ahead of SPY over many weeks, not just a few days." careful="A new portfolio is mostly cash waiting for triggers, so early returns sit near zero whatever the market does." terms={['shadow', 'baseline', 'vs-spy']} />
        </Card>
      )}

      {data && (
        <div className="grid grid-cols-[repeat(1,minmax(0,1fr))] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))] lg:grid-cols-[repeat(3,minmax(0,1fr))]">
          {data.map((p) => (
            <Link key={p.id} to={`/portfolios/${p.id}`} className="clickable block rounded-2xl p-5 no-underline" style={card} title={`Open ${p.name}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{p.name}</span>
                {kindInfo(p.kind).tag && <span className="rounded px-1.5 text-xs" style={{ ...muted, border: '1px solid currentColor' }} title={kindInfo(p.kind).label}>{kindInfo(p.kind).tag}</span>}
              </div>
              <div className="mt-1 text-3xl font-bold">{money(p.equity, 0)}</div>
              <div className="text-sm"><Versus p={p} /></div>
              {perf[p.id] && (
                <div className="mt-3">
                  <MiniVersus series={perf[p.id]} />
                  <div className="mt-1 flex gap-3 text-[11px]" style={muted}>
                    <span><span style={{ color: 'var(--viz-1, #2a78d6)' }}>——</span> this portfolio</span>
                    <span><span style={{ color: '#8a94a6' }}>- -</span> SPY, both from 100</span>
                  </div>
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-x-3 text-xs" style={muted}>
                <span>{p.openPositions} open</span>
                <span>{p.pendingOrders} waiting orders</span>
                <span style={p.openAlerts ? { color: '#D4501A', fontWeight: 600 } : undefined}>{p.openAlerts} alerts</span>
                <span>since {p.created_on}</span>
              </div>
            </Link>
          ))}
          {data.length === 0 && <p className="text-sm" style={muted}>No portfolios yet. Create one below; the shadow portfolio appears after the first nightly run.</p>}
        </div>
      )}

      <form onSubmit={onCreate} className="space-y-3 rounded-lg p-4" style={card} aria-labelledby="new-portfolio">
        <h2 id="new-portfolio" className={sectionTitle}>New paper portfolio</h2>
        <div className="flex flex-wrap items-end gap-3 text-sm">
          <label className="flex min-w-0 basis-full flex-col gap-1 sm:basis-56">
            Name
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required placeholder="My picks" className={field} style={card} />
          </label>
          <label className="flex min-w-0 basis-[calc(50%-0.375rem)] flex-col gap-1 sm:basis-36">
            Starting cash ($)
            <input type="number" min={100} step={100} value={cash} onChange={(e) => setCash(e.target.value)} required className={field} style={card} />
          </label>
          <label className="flex min-w-0 basis-[calc(50%-0.375rem)] flex-col gap-1 sm:basis-36">
            Per position ($)
            <input type="number" min={10} step={10} value={size} onChange={(e) => setSize(e.target.value)} required className={field} style={card} />
          </label>
          <button type="submit" disabled={busy || !name.trim()} className={`${primaryButton} basis-full sm:basis-auto`} style={primaryStyle}>
            {busy ? 'Creating...' : 'Create'}
          </button>
        </div>
        <p className="text-xs" style={muted}>
          Every position starts at the same dollar size: the model&apos;s confidence is not calibrated yet, so it does not set the size.
          Stops, targets and limits can be changed on the portfolio page.
        </p>
        {msg && <p role="alert" className="text-sm" style={{ color: '#D4501A' }}>{msg}</p>}
      </form>
      <button type="button" className={button} style={card} onClick={reload}>Refresh</button>
    </div>
  )
}
