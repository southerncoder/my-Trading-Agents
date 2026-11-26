import { AlertTriangle, Sparkles } from 'lucide-react'
import { Card, HBars, SectionTitle, SegmentBar, callColor } from '../components/viz'
import { ConfidenceBar, PriceSpark, useSparks, type Closes } from '../components/today/triggerViz'
import { EntryRadar, PickLadder, entryOf, roomPct } from '../components/portfolio/picksViz'
import { fmtPct } from '../components/today/format'
import { newsSearches, riskQuery, shortName } from '../components/stock/research'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { groupPicks, pickAction, SOURCE_HELP, SOURCE_LABEL } from '../components/portfolio/helpers'
import { button, field, money, primaryButton, primaryStyle, sectionTitle, useLoad } from '../components/portfolio/ui'
import { card, muted } from '../components/today/format'
import { buy, fetchPicks, fetchPortfolios, fetchRequests, requestAnalysis, triggerOrder, type Pick } from '../services/portfolio'
import { TickerLink } from '../components/TickerLink'
import { timingTitle } from '../components/learn/glossary'

const bad = { color: '#D4501A' }
const good = { color: '#0A8F80' }

function Reasons({ p }: { p: Pick }) {
  const r = p.reasons as { checks?: string[]; headlines?: string[]; mentions?: number } | null | undefined
  if (!r) return null
  if (r.checks) return <p className="text-xs" style={muted}>Why the screen chose it: {r.checks.join('; ')}.</p>
  if (r.headlines) return <p className="text-xs" style={muted}>In {r.mentions} stories today, e.g. &ldquo;{r.headlines[0]}&rdquo;</p>
  return null
}

function ProfessorReview({ p }: { p: Pick }) {
  const [open, setOpen] = useState(false)
  const r = p.educational_review
  if (!r) return null
  return (
    <div className="rounded-lg border border-dashed p-2 text-xs" style={{ borderColor: 'var(--color-border, #e2e8f0)' }}>
      <button type="button" className="font-medium underline" onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide Professor review' : 'Why this call? (Professor review)'}
      </button>
      {open && (
        <div className="mt-2 space-y-1" style={muted}>
          {r.summary && <p><strong>Summary:</strong> {r.summary}</p>}
          {r.why_not_before_flag && <p><strong>{timingTitle(p.label)}</strong> {r.why_not_before_flag}</p>}
          {r.figures_explained && <p><strong>Figures explained:</strong> {r.figures_explained}</p>}
          {r.buy_low_sell_high && <p><strong>Buy low, sell high?</strong> {r.buy_low_sell_high}</p>}
          {r.risk_temperament && <p><strong>Risk temperament:</strong> {r.risk_temperament}</p>}
          {r.portfolio_fit && <p><strong>Portfolio fit:</strong> {r.portfolio_fit}</p>}
        </div>
      )}
    </div>
  )
}

function PickCard({ p, portfolioId, shares, onTraded, closes = [] }: { p: Pick; portfolioId: number | null; shares: number; onTraded: (msg: string) => void; closes?: Closes }) {
  const action = pickAction(p)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  // One recording per pick per visit: a second click would add to the same position by mistake.
  const [done, setDone] = useState(false)
  async function act() {
    if (!action || !portfolioId || done || !(shares > 0)) return
    setBusy(true)
    setMsg(null)
    try {
      if (action.kind === 'market') {
        const r = await buy(portfolioId, { ticker: p.ticker, direction: p.direction ?? 'long', quantity: shares, candidateId: p.id })
        setMsg({ text: `Recorded.${r.warnings?.length ? ` Note: ${r.warnings.join('; ')}` : ''}`, ok: true })
      } else {
        await triggerOrder(portfolioId, { ticker: p.ticker, direction: p.direction ?? 'long', quantity: shares, candidateId: p.id, triggerPrice: p.trigger_price as number })
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
    <li className="space-y-2 rounded-2xl p-4 text-base transition-shadow hover:shadow-md" style={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span>
          <TickerLink ticker={p.ticker} />
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
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl p-2" style={{ border: '1px solid var(--color-border, #e2e8f0)' }}>
        <div>
          <div className="text-xs" style={muted}>Last 30 days</div>
          <PriceSpark closes={closes.slice(-30)} trigger={p.trigger_price} walk={p.walk_away} width={150} height={40} />
        </div>
        <div>
          <div className="text-xs" style={muted}>Price · {p.trigger_price ? 'trigger' : 'buys now'} · walk away</div>
          <PickLadder p={p} width={190} />
        </div>
        {p.confidence !== null && (
          <div>
            <div className="text-xs" style={muted}>Confidence</div>
            <ConfidenceBar value={p.confidence} />
          </div>
        )}
      </div>
      {p.rationale && <p className="line-clamp-3">{p.rationale}</p>}
      {risks.length > 0 && (
        <div className="space-y-1.5 pt-1">
          {risks.map((r) => (
            <div key={r} className="rounded-lg px-3 py-2" style={{ border: '1px solid var(--color-border, #e2e8f0)', borderLeft: '3px solid #D4501A' }}>
              <div className="flex items-start gap-1.5"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: '#D4501A' }} aria-hidden="true" />{r}</div>
              <div className="mt-1 flex flex-wrap gap-x-3 text-xs" style={muted}>
                Read up:
                {newsSearches(riskQuery(shortName(p.company, p.ticker), r)).map((l) => (
                  <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--color-primary, #2563eb)' }}>{l.label}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <Reasons p={p} />
      <ProfessorReview p={p} />
      {action && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button type="button" disabled={busy || done || !portfolioId || !(shares > 0)} onClick={act} className={primaryButton} style={primaryStyle}>
            {done ? 'Recorded' : busy ? 'Saving...' : `${action.text} (${shares} share${shares === 1 ? '' : 's'})`}
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
  // Every pick buys the same number of shares, so position changes are easy to follow.
  const [shares, setShares] = useState<string>('1')
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
  const sparks = useSparks(shown.map((p) => p.ticker))
  const navigate = useNavigate()

  return (
    <div className="app-page mx-auto max-w-6xl space-y-6 p-3 sm:p-4 md:p-8">
      <header className="space-y-2">
        <h1 className="flex items-center gap-3"><Sparkles className="h-9 w-9" style={{ color: 'var(--color-primary, #2563eb)' }} aria-hidden="true" />Picks</h1>
        <p className="max-w-3xl text-lg" style={muted}>
          The night&apos;s calls from three sources: your watchlist, a rule-based screen and names in the news. Recording a pick buys the chosen number of shares in a paper
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
            <select value={chosen?.id ?? ''} onChange={(e) => setPid(Number(e.target.value))} className={field} style={card}>
              {owners.map((p) => <option key={p.id} value={p.id}>{p.name} ({money(p.cash, 0)} cash)</option>)}
            </select>
          ) : (
            <Link to="/portfolios" className="underline">Create a portfolio first</Link>
          )}
        </label>
        <label className="flex min-w-0 flex-col gap-1">
          Shares per pick
          <input type="number" min={1} step={1} value={shares} onChange={(e) => setShares(e.target.value)} className={`${field} w-28`} style={card} />
        </label>
        <label className="flex items-center gap-2 pb-1.5">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Show holds and exits too
        </label>
      </div>

      {picks.error && <p role="alert" style={bad}>Could not load picks: {picks.error}</p>}
      {data && data.picks.length === 0 && <p className="text-sm" style={muted}>No picks yet. They appear after the nightly run copies its calls into the portfolio service.</p>}
      {data && hidden > 0 && <p className="text-xs" style={muted}>{hidden} calls with no trade tonight (wait, keep, exit) are hidden.</p>}

      {data && data.picks.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="space-y-3">
            <SectionTitle title="Where tonight's picks came from" />
            <SegmentBar unit=" picks" parts={groupPicks(data.picks).map((g, i) => ({ label: SOURCE_LABEL[g.source] ?? g.source, value: g.picks.length, color: ['var(--viz-1, #2a78d6)', 'var(--viz-2, #eb6834)', 'var(--viz-3, #1baf7a)', '#94a3b8'][i % 4] }))} />
          </Card>
          <Card className="space-y-3">
            <SectionTitle title="What they say" />
            <SegmentBar
              unit=" picks"
              parts={Object.entries(data.picks.reduce<Record<string, number>>((a, p) => ({ ...a, [p.label]: (a[p.label] ?? 0) + 1 }), {}))
                .sort((a, b) => b[1] - a[1])
                .map(([label, n]) => ({ label, value: n, color: callColor(label) }))}
            />
          </Card>
        </div>
      )}

      {shown.length > 0 && (
        <Card className="space-y-3">
          <SectionTitle title="Entry radar" sub="How far each pick's price has to move before it buys." />
          <EntryRadar picks={shown} />
        </Card>
      )}

      {shown.some((p) => roomPct(p) !== null) && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-3">
            <SectionTitle title="Room before walking away" sub="How far the price can fall from the entry before the idea is dropped. Short bars leave little room for an ordinary bad day. Click for the stock." />
            <HBars
              labelWidth={70}
              format={(v) => fmtPct(v)}
              onRow={(k) => { const t = shown.find((x) => String(x.id) === k)?.ticker; if (t) navigate(`/stock/${t}`) }}
              rows={shown
                .map((p) => ({ p, r: roomPct(p) }))
                .filter((e): e is { p: Pick; r: number } => e.r !== null)
                .sort((a, b) => b.r - a.r)
                .map(({ p, r }) => ({ key: String(p.id), label: p.ticker, ticker: p.ticker, value: r, note: `${money(entryOf(p))} → ${money(p.walk_away)}` }))}
            />
          </Card>
          <Card className="space-y-3">
            <SectionTitle title="Confidence" sub="The model's own confidence in each call. Not yet checked against results, so treat it as a ranking at most." />
            <HBars
              labelWidth={70}
              max={1}
              format={(v) => `${Math.round(v * 100)}%`}
              onRow={(k) => { const t = shown.find((x) => String(x.id) === k)?.ticker; if (t) navigate(`/stock/${t}`) }}
              rows={shown
                .filter((p) => p.confidence !== null)
                .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))
                .map((p) => ({ key: String(p.id), label: p.ticker, ticker: p.ticker, value: p.confidence as number, note: p.label, color: callColor(p.label) }))}
            />
          </Card>
        </div>
      )}

      {groupPicks(shown).map((g) => (
        <section key={g.source} className="space-y-2" aria-labelledby={`src-${g.source}`}>
          <h2 id={`src-${g.source}`} className={sectionTitle}>{SOURCE_LABEL[g.source] ?? g.source} <span className="text-sm font-normal" style={muted}>({g.picks.length})</span></h2>
          <p className="text-xs" style={muted}>{SOURCE_HELP[g.source]}</p>
          <ul className="grid grid-cols-[repeat(1,minmax(0,1fr))] gap-2 lg:grid-cols-[repeat(2,minmax(0,1fr))]">
            {g.picks.map((p) => <PickCard key={p.id} p={p} closes={sparks[p.ticker]} portfolioId={chosen?.id ?? null} shares={Number(shares) || 0} onTraded={() => portfolios.reload()} />)}
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
              <TickerLink ticker={r.ticker} />
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
