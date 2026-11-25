import { useNavigate } from 'react-router-dom'
import { Card, HBars, SectionTitle, SegmentBar, Sparkline } from '../components/viz'
import { useSparks } from '../components/today/triggerViz'
import { PlanMap, orderDistancePct, planProgress, sectorShares } from '../components/portfolio/portfolioViz'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { IndexChart } from '../components/portfolio/IndexChart'
import { OpenPositions } from '../components/portfolio/OpenPositions'
import { ALERT_LABEL, SOURCE_LABEL } from '../components/portfolio/helpers'
import { button, field, money, sectionTitle, signedMoney, useLoad } from '../components/portfolio/ui'
import { card, fmtPct, moveColor, muted } from '../components/today/format'
import { TickerLink, TickerName } from '../components/TickerLink'
import {
  ackAlert, cancelOrder, fetchAlerts, fetchOrders, fetchPerformance, fetchPortfolio, fetchPositions, fetchTrades, patchRules, sell,
  type Order, type Position, type Rules,
} from '../services/portfolio'
import type { Closes } from '../components/today/triggerViz'
import { TimingToggle } from '../components/portfolio/TimingReview'

const EXIT_KINDS = new Set(['stop_hit', 'target_hit', 'max_hold', 'sell_call', 'reanalysis', 'big_move'])
const bad = { color: '#D4501A' }

function Tile({ title, children, hint, chart }: { title: string; children: React.ReactNode; hint?: string; chart?: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl p-4" style={card}>
      <div className="text-sm" style={muted}>{title}</div>
      <div className="flex items-end justify-between gap-2">
        <div className="text-2xl font-bold tabular-nums">{children}</div>
        {chart}
      </div>
      {hint && <div className="text-xs" style={muted}>{hint}</div>}
    </div>
  )
}

const SECTOR_COLORS = ['var(--viz-1, #2a78d6)', 'var(--viz-2, #eb6834)', 'var(--viz-3, #1baf7a)', 'var(--viz-4, #eda100)']

function SellForm({ pid, pos, onDone }: { pid: number; pos: Position; onDone: () => void }) {
  const [qty, setQty] = useState(String(pos.quantity))
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const verb = pos.direction === 'long' ? 'Sell' : 'Cover'
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    try {
      await sell(pid, pos.id, { quantity: Number(qty), price: price ? Number(price) : undefined })
      onDone()
    } catch (err) {
      setMsg((err as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={submit} className="mt-2 flex flex-wrap items-end gap-2 text-sm">
      <label className="flex flex-col gap-1">Shares<input type="number" step="any" min="0" max={pos.quantity} value={qty} onChange={(e) => setQty(e.target.value)} className={`${field} w-28`} style={card} /></label>
      <label className="flex flex-col gap-1">Price (blank = latest)<input type="number" step="any" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className={`${field} w-32`} style={card} /></label>
      <button type="submit" disabled={busy} className={button} style={card}>{busy ? 'Saving...' : <>{verb} <TickerName ticker={pos.ticker} /></>}</button>
      {msg && <span role="alert" style={bad}>{msg}</span>}
    </form>
  )
}

function PositionReview({ p }: { p: Position }) {
  const [open, setOpen] = useState(false)
  const r = p.educational_review
  if (!r) return null
  return (
    <div className="w-full rounded-lg border border-dashed p-2 text-xs" style={{ borderColor: 'var(--color-border, #e2e8f0)' }}>
      <button type="button" className="font-medium underline" onClick={() => setOpen((o) => !o)}>
        {open ? 'Hide why this position was chosen' : 'Why was this position chosen?'}
      </button>
      {open && (
        <div className="mt-2 space-y-1" style={muted}>
          {r.summary && <p><strong>Summary:</strong> {r.summary}</p>}
          {r.why_not_before_flag && <p><strong>Why not before the flag?</strong> {r.why_not_before_flag}</p>}
          {r.figures_explained && <p><strong>Figures explained:</strong> {r.figures_explained}</p>}
          {r.buy_low_sell_high && <p><strong>Buy low, sell high?</strong> {r.buy_low_sell_high}</p>}
          {r.risk_temperament && <p><strong>Risk temperament:</strong> {r.risk_temperament}</p>}
          {r.portfolio_fit && <p><strong>Portfolio fit:</strong> {r.portfolio_fit}</p>}
        </div>
      )}
    </div>
  )
}

function RulesForm({ id, rules, onDone }: { id: number; rules: Rules; onDone: () => void }) {
  const [draft, setDraft] = useState<Record<string, string>>(Object.fromEntries(Object.entries(rules).map(([k, v]) => [k, String(v)])))
  const [msg, setMsg] = useState<string | null>(null)
  // follow_shares belongs to the baseline portfolio, which has no rules form.
  const labels: Record<Exclude<keyof Rules, 'follow_shares'>, string> = {
    position_size: 'Dollars per new position', max_position_pct: 'Largest position (% of value)', max_sector_pct: 'Largest sector (% of value)',
    stop_pct: 'Stop when there is no walk-away price (%)', target_pct: 'Profit target (%)', max_hold_days: 'Review after (trading days)',
    order_expiry_days: 'Waiting orders expire after (trading days)', drawdown_alert_pct: 'Warn when down from peak (%)', max_open_positions: 'Most open positions',
  }
  async function save(e: React.FormEvent) {
    e.preventDefault()
    try {
      await patchRules(id, Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, Number(v)])))
      setMsg('Saved. New positions use these; open positions keep the plan they started with.')
      onDone()
    } catch (err) {
      setMsg((err as Error).message)
    }
  }
  return (
    <form onSubmit={save} className="space-y-2 text-sm">
      <div className="grid grid-cols-[repeat(1,minmax(0,1fr))] gap-2 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
        {(Object.keys(labels) as (keyof typeof labels)[]).map((k) => (
          <label key={k} className="flex flex-col gap-1">
            {labels[k]}
            <input type="number" step="any" min="0" value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} className={field} style={card} />
          </label>
        ))}
      </div>
      <button type="submit" className={button} style={card}>Save rules</button>
      {msg && <p className="text-xs" style={muted}>{msg}</p>}
    </form>
  )
}

/** How far each price-triggered order is from the last close (left: must fall; right: must rise). */
function OrderDistances({ orders, sparks, onStock }: { orders: Order[]; sparks: Record<string, Closes>; onStock: (t: string) => void }) {
  const rows = orders
    .map((o) => ({ o, d: orderDistancePct(o, sparks[o.ticker]?.[sparks[o.ticker].length - 1]?.close) }))
    .filter((e): e is { o: Order; d: number } => e.d !== null)
    .sort((a, b) => a.d - b.d)
  if (!rows.length) return null
  const market = orders.filter((o) => o.trigger_price === null || o.trigger_price === undefined).length
  return (
    <div className="space-y-2 pb-2">
      <p className="text-sm" style={muted}>
        Distance from the last close to each order&apos;s price. Left: the price must fall to fill it; right: it must rise.
        {market > 0 && ` ${market} more fill${market === 1 ? 's' : ''} at the next market open.`}
      </p>
      <HBars
        labelWidth={70}
        format={(v) => fmtPct(v)}
        onRow={(k) => {
          const o = orders.find((x) => String(x.id) === k)
          if (o) onStock(o.ticker)
        }}
        rows={rows.map(({ o, d }) => ({
          key: String(o.id),
          label: o.ticker, ticker: o.ticker,
          value: d,
          color: d < 0 ? '#D4501A' : '#0A8F80',
          note: `${o.intent === 'close' ? 'sell' : o.direction === 'long' ? 'buy' : 'short'} at ${money(o.trigger_price)} · expires ${o.expires_on ?? '-'}`,
        }))}
      />
    </div>
  )
}

/** Tiles and a bar per closed position: what each one made or lost. */
function ClosedResults({ closed, onStock, portfolioId }: { closed: Position[]; onStock: (t: string) => void; portfolioId: number }) {
  const wins = closed.filter((x) => x.realized_pnl > 0).length
  const total = closed.reduce((a, x) => a + x.realized_pnl, 0)
  return (
    <Card className="space-y-3">
      <SectionTitle title="Closed positions" sub="Profit or loss taken on each closed position. Click for the stock." />
      <div className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-3">
        <Tile title="Closed">{closed.length}</Tile>
        <Tile title="Won" hint="closed at a profit">{wins} of {closed.length}</Tile>
        <Tile title="Taken in total"><span style={{ color: moveColor(total) }}>{signedMoney(total)}</span></Tile>
      </div>
      <HBars
        labelWidth={70}
        format={(v) => signedMoney(v)}
        onRow={(k) => {
          const x = closed.find((c) => String(c.id) === k)
          if (x) onStock(x.ticker)
        }}
        rows={[...closed].sort((a, b) => b.realized_pnl - a.realized_pnl).map((x) => ({ key: String(x.id), label: x.ticker, ticker: x.ticker, value: x.realized_pnl, note: `${fmtPct(x.returnPct)} · ${x.opened_on} to ${x.closed_on ?? '-'}` }))}
      />
      <div className="space-y-2">
        <div className="text-sm font-semibold">Timing reviews</div>
        {[...closed].sort((a, b) => (b.closed_on ?? '').localeCompare(a.closed_on ?? '')).map((x) => (
          <TimingToggle key={x.id} portfolioId={portfolioId} positionId={x.id} closed label={<><TickerName ticker={x.ticker} /> sold {x.closed_on ?? '-'}</>} />
        ))}
      </div>
    </Card>
  )
}

export function Portfolio() {
  const id = Number(useParams().id)
  const [tick, setTick] = useState(0)
  const key = `${id}:${tick}`
  const summary = useLoad(() => fetchPortfolio(id), key, String(id))
  const perf = useLoad(() => fetchPerformance(id), key, String(id))
  const open = useLoad(() => fetchPositions(id, 'open'), key, String(id))
  const closed = useLoad(() => fetchPositions(id, 'closed'), key, String(id))
  const alerts = useLoad(() => fetchAlerts(id, true), key, String(id))
  const orders = useLoad(() => fetchOrders(id, true), key, String(id))
  const trades = useLoad(() => fetchTrades(id), key, String(id))
  const [selling, setSelling] = useState<number | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const refresh = () => setTick((t) => t + 1)
  /** Runs a button's request; a refusal (order already filled, service down) shows as a message instead of vanishing. */
  async function act(fn: () => Promise<unknown>) {
    setActionError(null)
    try {
      await fn()
      refresh()
    } catch (e) {
      setActionError((e as Error).message)
    }
  }
  const p = summary.data
  const owner = p?.kind === 'owner'
  const navigate = useNavigate()
  const sparks = useSparks([...(open.data ?? []).map((x) => x.ticker), ...(orders.data ?? []).map((o) => o.ticker)])

  if (summary.error) return <div className="p-4"><p role="alert" style={bad}>{summary.error}</p><Link to="/portfolios" className="underline">Back to portfolios</Link></div>
  if (!p) return <p role="status" className="p-4 text-sm" style={muted}>Loading...</p>

  return (
    <div className="app-page mx-auto max-w-6xl space-y-6 p-3 sm:p-4 md:p-8">
      <header className="space-y-2">
        <Link to="/portfolios" className="text-base underline">&larr; Portfolios</Link>
        <h1>{p.name}</h1>
        <p className="max-w-3xl text-lg" style={muted}>
          {owner
            ? 'Your paper portfolio. You record trades; the nightly run checks each exit plan and the limits and raises alerts.'
            : p.kind === 'baseline'
              ? `Baseline: follows every call by itself, buying ${p.rules.follow_shares ?? 1} share${(p.rules.follow_shares ?? 1) === 1 ? '' : 's'} on a buy call (now, or at the trigger) and selling the same on a sell call. No stops or targets, so each position's trades show exactly what following the advice did.`
              : 'Shadow portfolio: takes every pick at the same size and exits by the rules, so it shows what the system would do on its own.'}
          {' '}Started {p.created_on} with {money(p.starting_cash, 0)}.
        </p>
      </header>

      {actionError && <p role="alert" className="text-sm" style={bad}>{actionError}</p>}
      <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))]">
        <Tile title="Value" hint={`cash ${money(p.cash, 0)} · invested ${money(p.longValue + p.shortValue, 0)}`} chart={perf.data && perf.data.series.length > 1 ? <Sparkline values={perf.data.series.map((s) => s.portfolio)} width={90} height={30} label="value since it started, indexed to 100" /> : undefined}>{money(p.equity, 0)}</Tile>
        <Tile title="Return" hint={p.spyReturnPct === null ? 'since it started' : `${p.returnPct >= p.spyReturnPct ? 'ahead of' : 'behind'} SPY by ${Math.abs(p.returnPct - p.spyReturnPct).toFixed(2)} points`}><span style={{ color: moveColor(p.returnPct) }}>{fmtPct(p.returnPct)}</span></Tile>
        <Tile title="SPY over the same days" hint="the yardstick" chart={perf.data && perf.data.series.filter((s) => s.spy !== null).length > 1 ? <Sparkline values={perf.data.series.flatMap((s) => (s.spy === null ? [] : [s.spy]))} width={90} height={30} color="#8a94a6" label="SPY over the same days, indexed to 100" /> : undefined}>{p.spyReturnPct === null ? 'n/a' : fmtPct(p.spyReturnPct)}</Tile>
        <Tile title="Worst drop from a peak" hint="at nightly closes">{p.maxDrawdownPct ? `-${p.maxDrawdownPct}%` : '0%'}</Tile>
      </div>

      <section className="rounded-lg p-4" style={card} aria-labelledby="perf">
        <h2 id="perf" className={sectionTitle}>Against SPY</h2>
        {perf.data ? <IndexChart series={perf.data.series} name={p.name} /> : <p className="text-sm" style={muted}>Loading...</p>}
      </section>

      {p.kind !== 'baseline' && open.data && open.data.some((x) => planProgress(x) !== null) && (
        <Card className="space-y-3">
          <SectionTitle title="Exit plan map" sub="Where every open position sits between the price that closes it at a loss (stop) and the one that takes the profit (target)." />
          <PlanMap positions={open.data} />
        </Card>
      )}

      {open.data && open.data.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="space-y-3">
            <SectionTitle title="Where the money is" sub="Market value by sector (the four largest named, the rest together), and cash." />
            <SegmentBar
              parts={(() => {
                const secs = sectorShares(open.data, p.equity)
                const rest = secs.slice(4).reduce((a, x) => a + x.value, 0)
                return [
                  ...secs.slice(0, 4).map((x, i) => ({ label: x.sector, value: Math.round(x.value), color: SECTOR_COLORS[i] })),
                  ...(rest > 0 ? [{ label: `Other sectors (${secs.length - 4})`, value: Math.round(rest), color: '#64748b' }] : []),
                  { label: 'Cash', value: Math.round(Math.max(0, p.cash)), color: '#cbd5e1' },
                ]
              })()}
              unit=" $"
            />
            {p.rules.max_sector_pct < 100 && (
              <>
                <div className="pt-2 text-sm font-semibold">Each sector against the {p.rules.max_sector_pct}% limit</div>
                <HBars
                  labelWidth={160}
                  max={p.rules.max_sector_pct}
                  format={(v) => `${v.toFixed(1)}%`}
                  rows={sectorShares(open.data, p.equity).map((x) => ({
                    key: x.sector,
                    label: x.sector,
                    value: x.pct,
                    color: x.pct > p.rules.max_sector_pct ? '#e34948' : undefined,
                    note: `${x.count} position${x.count === 1 ? '' : 's'}${x.pct > p.rules.max_sector_pct ? ' · over the limit' : ''}`,
                  }))}
                />
              </>
            )}
          </Card>
          <Card className="space-y-3">
            <SectionTitle title="Open positions, gain or loss" sub="Return on each open position since it was bought. Click for the stock." />
            <HBars
              labelWidth={70}
              format={(v) => fmtPct(v)}
              onRow={(t) => navigate(`/stock/${t}`)}
              rows={[...open.data].sort((a, b) => b.returnPct - a.returnPct).map((x) => ({ key: x.ticker, label: x.ticker, ticker: x.ticker, value: x.returnPct, note: `${x.quantity} sh · ${money(x.unrealized)}` }))}
            />
          </Card>
        </div>
      )}

      <section className="space-y-2 rounded-lg p-4" style={card} aria-labelledby="alerts">
        <h2 id="alerts" className={sectionTitle}>Alerts {alerts.data?.length ? `(${alerts.data.length})` : ''}</h2>
        {alerts.data?.length === 0 && <p className="text-sm" style={muted}>Nothing needs your attention.</p>}
        <ul className="space-y-2">
          {alerts.data?.map((a) => (
            <li key={a.id} className="rounded p-2 text-sm" style={{ border: `1px solid ${a.severity === 'action' ? '#D4501A' : 'var(--color-border, #e2e8f0)'}` }}>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <strong>{ALERT_LABEL[a.kind] ?? a.kind}</strong>
                {a.ticker && !a.ticker.startsWith('sector:') && <TickerLink ticker={a.ticker} />}
                <span className="text-xs" style={muted}>{a.run_date}</span>
              </div>
              <p>{a.message}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                <button type="button" className={button} style={card} onClick={() => act(() => ackAlert(id, a.id))}>Got it</button>
                {owner && a.position_id && EXIT_KINDS.has(a.kind) && open.data?.some((x) => x.id === a.position_id) && (
                  <button type="button" className={button} style={card} onClick={() => setSelling(a.position_id)}>Record sale</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2 rounded-lg p-4" style={card} aria-labelledby="open">
        <h2 id="open" className={sectionTitle}>Open positions</h2>
        {open.data?.length === 0 && <p className="text-sm" style={muted}>None yet. {owner ? <>Record a buy from the <Link to="/picks" className="underline">Picks</Link> page.</> : `The ${p.kind} portfolio buys after the next nightly run.`}</p>}
        {open.data && open.data.length > 0 && (
          <OpenPositions
            positions={open.data}
            sparks={sparks}
            trades={trades.data ?? []}
            showPlan={p.kind !== 'baseline'}
            canSell={owner}
            selling={selling}
            onSell={setSelling}
            renderSellForm={(x) => <SellForm pid={id} pos={x} onDone={() => { setSelling(null); refresh() }} />}
            renderReview={(x) => (
              <>
                <PositionReview p={x} />
                <TimingToggle portfolioId={id} positionId={x.id} closed={false} />
              </>
            )}
          />
        )}
      </section>

      <section className="space-y-2 rounded-lg p-4" style={card} aria-labelledby="orders">
        <h2 id="orders" className={sectionTitle}>Waiting orders</h2>
        {orders.data?.length === 0 && <p className="text-sm" style={muted}>No orders waiting for a price.</p>}
        <OrderDistances orders={orders.data ?? []} sparks={sparks} onStock={(t) => navigate(`/stock/${t}`)} />
        <ul className="space-y-1 text-sm">
          {orders.data?.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <TickerLink ticker={o.ticker} /> {o.intent === 'close' ? 'sell' : o.direction === 'long' ? 'buy' : 'short'} {o.quantity ? `${o.quantity} share${o.quantity === 1 ? '' : 's'}` : money(o.amount, 0)} {o.intent === 'close' ? 'at the next market open' : o.trigger_price === null || o.trigger_price === undefined ? 'at the next market open' : `if the price ${o.trigger_when === 'above' ? 'rises to' : 'falls to'} ${money(o.trigger_price)}`}
                <span style={muted}> &middot; placed {o.created_on}, expires {o.expires_on ?? '-'}</span>
              </span>
              {owner && <button type="button" className={button} style={card} onClick={() => act(() => cancelOrder(id, o.id))}>Cancel</button>}
            </li>
          ))}
        </ul>
      </section>

      {closed.data && closed.data.length > 0 && <ClosedResults closed={closed.data} portfolioId={id} onStock={(t) => navigate(`/stock/${t}`)} />}

      <details className="rounded-lg p-4" style={card}>
        <summary className="cursor-pointer font-semibold">Closed positions ({closed.data?.length ?? 0}) and trade history</summary>
        <div className="mt-2 space-y-3 overflow-x-auto text-sm">
          <table className="data-table w-full">
            <thead><tr className="text-left" style={muted}><th>Stock</th><th>Held</th><th className="text-right">Return</th><th className="text-right">Profit</th><th>Source</th></tr></thead>
            <tbody>
              {closed.data?.map((x) => (
                <tr key={x.id}><td><TickerLink ticker={x.ticker} />{x.direction === 'short' ? ' (short)' : ''}</td><td>{x.opened_on} to {x.closed_on}</td><td className="text-right" style={{ color: moveColor(x.returnPct) }}>{fmtPct(x.returnPct)}</td><td className="text-right" style={{ color: moveColor(x.realized_pnl) }}>{signedMoney(x.realized_pnl)}</td><td>{SOURCE_LABEL[x.source ?? ''] ?? x.source}</td></tr>
              ))}
            </tbody>
          </table>
          <table className="data-table w-full">
            <thead><tr className="text-left" style={muted}><th>Date</th><th>Trade</th><th className="text-right">Shares</th><th className="text-right">Price</th><th className="text-right">Realized</th></tr></thead>
            <tbody>
              {trades.data?.map((t) => (
                <tr key={t.id}><td>{t.traded_on}</td><td>{t.action} {t.direction} <TickerLink ticker={t.ticker} /></td><td className="text-right">{t.quantity}</td><td className="text-right">{money(t.price)}</td><td className="text-right">{t.realized_pnl ? signedMoney(t.realized_pnl) : ''}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {owner && (
        <details className="rounded-lg p-4" style={card}>
          <summary className="cursor-pointer font-semibold">Rules and limits</summary>
          <div className="mt-2"><RulesForm id={id} rules={p.rules} onDone={refresh} /></div>
        </details>
      )}
    </div>
  )
}
