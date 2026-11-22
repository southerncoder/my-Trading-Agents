import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { groupPicks, pickAction, SOURCE_HELP, SOURCE_LABEL } from '../components/portfolio/helpers'
import { button, field, money, primaryButton, primaryStyle, sectionTitle, useLoad } from '../components/portfolio/ui'
import { card, muted } from '../components/today/format'
import { buy, fetchPicks, fetchPortfolios, fetchRequests, requestAnalysis, triggerOrder, type Pick } from '../services/portfolio'

const bad = { color: '#D4501A' }
const good = { color: '#0A8F80' }

function Reasons({ p }: { p: Pick }) {
  const r = p.reasons as { checks?: string[]; headlines?: string[]; mentions?: number } | null | undefined
  if (!r) return null
  if (r.checks) return <p className="text-xs" style={muted}>Why the screen chose it: {r.checks.join('; ')}.</p>
  if (r.headlines) return <p className="text-xs" style={muted}>In {r.mentions} stories today, e.g. &ldquo;{r.headlines[0]}&rdquo;</p>
  return null
}

function PickCard({ p, portfolioId, amount, onTraded }: { p: Pick; portfolioId: number | null; amount: number; onTraded: (msg: string) => void }) {
  const action = pickAction(p)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  // One recording per pick per visit: a second click would add to the same position by mistake.
  const [done, setDone] = useState(false)
  async function act() {
    if (!action || !portfolioId || done) return
    setBusy(true)
    setMsg(null)
    try {
      if (action.kind === 'market') {
        const r = await buy(portfolioId, { ticker: p.ticker, direction: p.direction ?? 'long', amount, candidateId: p.id })
        setMsg({ text: `Recorded.${r.warnings?.length ? ` Note: ${r.warnings.join('; ')}` : ''}`, ok: true })
      } else {
        await triggerOrder(portfolioId, { ticker: p.ticker, direction: p.direction ?? 'long', amount, candidateId: p.id, triggerPrice: p.trigger_price as number })
        setMsg({ text: 'Order placed. It fills if a later day trades through the price.', ok: true })
      }
      setDone(true)
      onTraded(p.ticker)
    } catch (e) {
      setMsg({ text: (e as Error).message, ok: false })
    } finally {
      setBusy(false)
    }
  }
  const risks = p.key_risks.slice(0, 2)
  return (
    <li className="space-y-1 rounded-lg p-3 text-sm" style={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span>
          <Link to={`/stock/${p.ticker}`} className="font-semibold underline">{p.ticker}</Link>
          {p.company && <span className="text-xs" style={muted}> {p.company}</span>}
        </span>
        <span className="font-medium">{p.label}{p.confidence !== null && <span className="text-xs" style={muted}> &middot; confidence {p.confidence.toFixed(2)}</span>}</span>
      </div>
      <div className="flex flex-wrap gap-x-3 text-xs" style={muted}>
        <span>price {money(p.price)}</span>
        {p.trigger_price !== null && <span>trigger {money(p.trigger_price)}{p.trigger_type ? ` (${p.trigger_type})` : ''}</span>}
        {p.walk_away !== null && <span>walk away below {money(p.walk_away)}</span>}
        {p.llm_seconds ? <span>{p.llm_seconds}s of analysis</span> : null}
      </div>
      {p.rationale && <p className="line-clamp-3">{p.rationale}</p>}
      {risks.length > 0 && <p className="text-xs" style={muted}>Risks: {risks.join('; ')}</p>}
      <Reasons p={p} />
      {action && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button type="button" disabled={busy || done || !portfolioId} onClick={act} className={primaryButton} style={primaryStyle}>
            {done ? 'Recorded' : busy ? 'Saving...' : `${action.text} (${money(amount, 0)})`}
          </button>
          {!portfolioId && <span className="text-xs" style={muted}>Choose a portfolio above first.</span>}
          {msg && <span role={msg.ok ? 'status' : 'alert'} className="text-xs" style={msg.ok ? good : bad}>{msg.text}</span>}
        </div>
      )}
    </li>
  )
}

export function Picks() {
  const [date, setDate] = useState<string | undefined>(undefined)
  const picks = useLoad(() => fetchPicks(date), date ?? 'latest')
  const portfolios = useLoad(fetchPortfolios, 'p')
  const [reqTick, setReqTick] = useState(0)
  const requests = useLoad(fetchRequests, String(reqTick))
  const owners = (portfolios.data ?? []).filter((p) => p.kind === 'owner')
  const [pid, setPid] = useState<number | null>(null)
  const chosen = owners.find((p) => p.id === pid) ?? owners[0] ?? null
  const [amount, setAmount] = useState<string>('')
  useEffect(() => {
    if (chosen && !amount) setAmount(String(chosen.rules.position_size))
  }, [chosen, amount])
  const [ticker, setTicker] = useState('')
  const [askMsg, setAskMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [showAll, setShowAll] = useState(false)

  async function ask(e: React.FormEvent) {
    e.preventDefault()
    setAskMsg(null)
    try {
      const r = await requestAnalysis(ticker)
      setAskMsg({ text: `${r.ticker} is ${r.status === 'queued' ? 'queued' : r.status}. It runs within about 10 minutes when the worker task is on, otherwise with tonight's run.`, ok: true })
      setTicker('')
      setReqTick((t) => t + 1)
    } catch (err) {
      setAskMsg({ text: (err as Error).message, ok: false })
    }
  }

  const data = picks.data
  const shown = (data?.picks ?? []).filter((p) => showAll || p.tradeable)
  const hidden = (data?.picks.length ?? 0) - shown.length

  return (
    <div className="space-y-4 p-2 sm:p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold">Picks</h1>
        <p className="text-sm" style={muted}>
          The night&apos;s calls from three sources: your watchlist, a rule-based screen and names in the news. Recording a pick buys it in a paper
          portfolio at the latest price, or places an order that waits for the trigger price. Nothing here is advice.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-3 rounded-lg p-3 text-sm" style={card}>
        <label className="flex min-w-0 flex-col gap-1">
          Night
          <select value={data?.date ?? ''} onChange={(e) => setDate(e.target.value)} className={field} style={card}>
            {(data?.dates ?? []).map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          Record into
          {owners.length ? (
            <select value={chosen?.id ?? ''} onChange={(e) => { setPid(Number(e.target.value)); setAmount('') }} className={field} style={card}>
              {owners.map((p) => <option key={p.id} value={p.id}>{p.name} ({money(p.cash, 0)} cash)</option>)}
            </select>
          ) : (
            <Link to="/portfolios" className="underline">Create a portfolio first</Link>
          )}
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          Dollars per pick
          <input type="number" min={1} step={10} value={amount} onChange={(e) => setAmount(e.target.value)} className={`${field} w-28`} style={card} />
        </label>
        <label className="flex items-center gap-2 pb-1.5">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Show holds and exits too
        </label>
      </div>

      {picks.error && <p role="alert" style={bad}>Could not load picks: {picks.error}</p>}
      {data && data.picks.length === 0 && <p className="text-sm" style={muted}>No picks yet. They appear after the nightly run copies its calls into the portfolio service.</p>}
      {data && hidden > 0 && <p className="text-xs" style={muted}>{hidden} calls with no trade tonight (wait, keep, exit) are hidden.</p>}

      {groupPicks(shown).map((g) => (
        <section key={g.source} className="space-y-2" aria-labelledby={`src-${g.source}`}>
          <h2 id={`src-${g.source}`} className={sectionTitle}>{SOURCE_LABEL[g.source] ?? g.source} <span className="text-sm font-normal" style={muted}>({g.picks.length})</span></h2>
          <p className="text-xs" style={muted}>{SOURCE_HELP[g.source]}</p>
          <ul className="grid grid-cols-[repeat(1,minmax(0,1fr))] gap-2 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
            {g.picks.map((p) => <PickCard key={p.id} p={p} portfolioId={chosen?.id ?? null} amount={Number(amount) || 0} onTraded={() => portfolios.reload()} />)}
          </ul>
        </section>
      ))}

      <section className="space-y-2 rounded-lg p-4" style={card} aria-labelledby="ask">
        <h2 id="ask" className={sectionTitle}>Analyze a ticker now</h2>
        <form onSubmit={ask} className="flex flex-wrap items-end gap-2 text-sm">
          <label className="flex flex-col gap-1">
            Ticker
            <input value={ticker} onChange={(e) => setTicker(e.target.value)} maxLength={10} placeholder="AAPL" autoCapitalize="characters" spellCheck={false} className={`${field} w-28 uppercase`} style={card} />
          </label>
          <button type="submit" disabled={!ticker.trim()} className={button} style={card}>Ask for an analysis</button>
        </form>
        {askMsg && <p role={askMsg.ok ? 'status' : 'alert'} className="text-sm" style={askMsg.ok ? good : bad}>{askMsg.text}</p>}
        <ul className="space-y-1 text-sm">
          {requests.data?.slice(0, 10).map((r) => (
            <li key={r.id} className="flex flex-wrap gap-x-2">
              <strong>{r.ticker}</strong>
              <span style={muted}>{r.reason.replace('_', ' ')}</span>
              <span style={r.status === 'failed' ? bad : r.status === 'done' ? good : muted}>{r.status}</span>
              {r.status === 'done' && r.label && <span>{r.label} ({r.decision} {r.confidence?.toFixed(2)})</span>}
              {r.status === 'failed' && r.error && <span className="text-xs" style={muted}>{r.error.slice(0, 120)}</span>}
            </li>
          ))}
        </ul>
        <button type="button" className={button} style={card} onClick={() => { setReqTick((t) => t + 1); picks.reload() }}>Refresh</button>
      </section>
    </div>
  )
}
