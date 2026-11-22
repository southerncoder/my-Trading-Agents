import { useState } from 'react'
import { Link } from 'react-router-dom'
import { card, fmtPct, moveColor, muted } from '../components/today/format'
import { button, field, money, primaryButton, primaryStyle, sectionTitle, useLoad } from '../components/portfolio/ui'
import { createPortfolio, fetchPortfolios, type PortfolioSummary } from '../services/portfolio'

function Versus({ p }: { p: PortfolioSummary }) {
  return (
    <span>
      <span style={{ color: moveColor(p.returnPct) }}>{fmtPct(p.returnPct)}</span>
      <span style={muted}> vs SPY {p.spyReturnPct === null ? 'n/a' : fmtPct(p.spyReturnPct)}</span>
    </span>
  )
}

export function Portfolios() {
  const { data, error, reload } = useLoad(fetchPortfolios, 'all')
  const [name, setName] = useState('')
  const [cash, setCash] = useState('10000')
  const [size, setSize] = useState('1000')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

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
    <div className="space-y-4 p-2 sm:p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Portfolios</h1>
        <p className="text-sm" style={muted}>
          Paper money only, on real prices. You record the trades; each night the system checks the exit plan and the risk
          limits and tells you when to act. The shadow portfolio takes every pick by itself, so you can see whether your choices beat the system&apos;s.
        </p>
      </header>

      {error && <p role="alert" className="text-sm" style={{ color: '#D4501A' }}>Could not load portfolios: {error}</p>}
      {!data && !error && <p role="status" className="text-sm" style={muted}>Loading...</p>}

      {data && (
        <div className="grid grid-cols-[repeat(1,minmax(0,1fr))] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))] lg:grid-cols-[repeat(3,minmax(0,1fr))]">
          {data.map((p) => (
            <Link key={p.id} to={`/portfolios/${p.id}`} className="block rounded-lg p-4 no-underline" style={card}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold">{p.name}</span>
                {p.kind === 'shadow' && <span className="rounded px-1.5 text-xs" style={{ ...muted, border: '1px solid currentColor' }}>shadow</span>}
              </div>
              <div className="mt-1 text-2xl font-semibold">{money(p.equity, 0)}</div>
              <div className="text-sm"><Versus p={p} /></div>
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
