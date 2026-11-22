import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { IndexChart } from '../components/portfolio/IndexChart'
import { ALERT_LABEL, SOURCE_LABEL } from '../components/portfolio/helpers'
import { button, field, money, sectionTitle, signedMoney, useLoad } from '../components/portfolio/ui'
import { card, fmtPct, moveColor, muted } from '../components/today/format'
import {
  ackAlert, cancelOrder, fetchAlerts, fetchOrders, fetchPerformance, fetchPortfolio, fetchPositions, fetchTrades, patchRules, sell,
  type Position, type Rules,
} from '../services/portfolio'

const EXIT_KINDS = new Set(['stop_hit', 'target_hit', 'max_hold', 'sell_call', 'reanalysis', 'big_move'])
const bad = { color: '#D4501A' }

function Tile({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="min-w-0 rounded-lg p-3" style={card}>
      <div className="text-xs" style={muted}>{title}</div>
      <div className="text-lg font-semibold">{children}</div>
      {hint && <div className="text-xs" style={muted}>{hint}</div>}
    </div>
  )
}

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
      <button type="submit" disabled={busy} className={button} style={card}>{busy ? 'Saving...' : `${verb} ${pos.ticker}`}</button>
      {msg && <span role="alert" style={bad}>{msg}</span>}
    </form>
  )
}

function PlanLine({ p }: { p: Position }) {
  return (
    <span className="text-xs" style={muted}>
      stop {money(p.stop_price)} &middot; target {money(p.target_price)} &middot; review by {p.hold_until ?? '-'}
    </span>
  )
}

function RulesForm({ id, rules, onDone }: { id: number; rules: Rules; onDone: () => void }) {
  const [draft, setDraft] = useState<Record<string, string>>(Object.fromEntries(Object.entries(rules).map(([k, v]) => [k, String(v)])))
  const [msg, setMsg] = useState<string | null>(null)
  const labels: Record<keyof Rules, string> = {
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
        {(Object.keys(labels) as (keyof Rules)[]).map((k) => (
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

  if (summary.error) return <div className="p-4"><p role="alert" style={bad}>{summary.error}</p><Link to="/portfolios" className="underline">Back to portfolios</Link></div>
  if (!p) return <p role="status" className="p-4 text-sm" style={muted}>Loading...</p>

  return (
    <div className="space-y-4 p-2 sm:p-4 md:p-6">
      <header>
        <Link to="/portfolios" className="text-sm underline">&larr; Portfolios</Link>
        <h1 className="text-2xl font-semibold">{p.name}</h1>
        <p className="text-sm" style={muted}>
          {owner ? 'Your paper portfolio. You record trades; the nightly run checks each exit plan and the limits and raises alerts.' : 'Shadow portfolio: takes every pick at the same size and exits by the rules, so it shows what the system would do on its own.'}
          {' '}Started {p.created_on} with {money(p.starting_cash, 0)}.
        </p>
      </header>

      {actionError && <p role="alert" className="text-sm" style={bad}>{actionError}</p>}
      <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))]">
        <Tile title="Value" hint={`cash ${money(p.cash, 0)}`}>{money(p.equity, 0)}</Tile>
        <Tile title="Return" hint="since it started"><span style={{ color: moveColor(p.returnPct) }}>{fmtPct(p.returnPct)}</span></Tile>
        <Tile title="SPY over the same days" hint="the yardstick">{p.spyReturnPct === null ? 'n/a' : fmtPct(p.spyReturnPct)}</Tile>
        <Tile title="Worst drop from a peak" hint="at nightly closes">{p.maxDrawdownPct ? `-${p.maxDrawdownPct}%` : '0%'}</Tile>
      </div>

      <section className="rounded-lg p-4" style={card} aria-labelledby="perf">
        <h2 id="perf" className={sectionTitle}>Against SPY</h2>
        {perf.data ? <IndexChart series={perf.data.series} name={p.name} /> : <p className="text-sm" style={muted}>Loading...</p>}
      </section>

      <section className="space-y-2 rounded-lg p-4" style={card} aria-labelledby="alerts">
        <h2 id="alerts" className={sectionTitle}>Alerts {alerts.data?.length ? `(${alerts.data.length})` : ''}</h2>
        {alerts.data?.length === 0 && <p className="text-sm" style={muted}>Nothing needs your attention.</p>}
        <ul className="space-y-2">
          {alerts.data?.map((a) => (
            <li key={a.id} className="rounded p-2 text-sm" style={{ border: `1px solid ${a.severity === 'action' ? '#D4501A' : 'var(--color-border, #e2e8f0)'}` }}>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <strong>{ALERT_LABEL[a.kind] ?? a.kind}</strong>
                {a.ticker && !a.ticker.startsWith('sector:') && <span>{a.ticker}</span>}
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
        {open.data?.length === 0 && <p className="text-sm" style={muted}>None yet. {owner ? <>Record a buy from the <Link to="/picks" className="underline">Picks</Link> page.</> : 'The shadow portfolio buys after the next nightly run.'}</p>}
        <ul className="space-y-2 md:hidden">
          {open.data?.map((x) => (
            <li key={x.id} className="rounded p-2 text-sm" style={{ border: '1px solid var(--color-border, #e2e8f0)' }}>
              <div className="flex justify-between gap-2">
                <span><Link to={`/stock/${x.ticker}`} className="font-semibold underline">{x.ticker}</Link> {x.direction === 'short' && <span style={muted}>short</span>}</span>
                <span style={{ color: moveColor(x.unrealized) }}>{signedMoney(x.unrealized)} ({fmtPct(x.returnPct)})</span>
              </div>
              <div style={muted} className="text-xs">{x.quantity} @ {money(x.avg_cost)} &middot; last {money(x.mark)} ({x.mark_date ?? 'cost'}) &middot; {SOURCE_LABEL[x.source ?? ''] ?? x.source}</div>
              <PlanLine p={x} />
              {owner && (selling === x.id ? <SellForm pid={id} pos={x} onDone={() => { setSelling(null); refresh() }} /> : <button type="button" className={`${button} mt-1`} style={card} onClick={() => setSelling(x.id)}>{x.direction === 'long' ? 'Sell' : 'Cover'}</button>)}
            </li>
          ))}
        </ul>
        <div className="hidden overflow-x-auto md:block">
          <table className="data-table w-full text-sm">
            <thead><tr className="text-left" style={muted}><th>Stock</th><th className="text-right">Shares</th><th className="text-right">Cost</th><th className="text-right">Last</th><th className="text-right">Profit</th><th>Exit plan</th><th>Source</th><th /></tr></thead>
            <tbody>
              {open.data?.map((x) => (
                <tr key={x.id} className="align-top" style={{ borderTop: '1px solid var(--color-border, #e2e8f0)' }}>
                  <td className="py-2"><Link to={`/stock/${x.ticker}`} className="font-semibold underline">{x.ticker}</Link>{x.direction === 'short' && <span style={muted}> short</span>}<div className="text-xs" style={muted}>since {x.opened_on}</div></td>
                  <td className="text-right">{x.quantity}</td>
                  <td className="text-right">{money(x.avg_cost)}</td>
                  <td className="text-right">{money(x.mark)}<div className="text-xs" style={muted}>{x.mark_date ?? 'at cost'}</div></td>
                  <td className="text-right" style={{ color: moveColor(x.unrealized) }}>{signedMoney(x.unrealized)}<div className="text-xs">{fmtPct(x.returnPct)}</div></td>
                  <td><PlanLine p={x} /></td>
                  <td className="text-xs">{SOURCE_LABEL[x.source ?? ''] ?? x.source}</td>
                  <td className="text-right">
                    {owner && (selling === x.id ? <SellForm pid={id} pos={x} onDone={() => { setSelling(null); refresh() }} /> : <button type="button" className={button} style={card} onClick={() => setSelling(x.id)}>{x.direction === 'long' ? 'Sell' : 'Cover'}</button>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2 rounded-lg p-4" style={card} aria-labelledby="orders">
        <h2 id="orders" className={sectionTitle}>Waiting orders</h2>
        {orders.data?.length === 0 && <p className="text-sm" style={muted}>No orders waiting for a price.</p>}
        <ul className="space-y-1 text-sm">
          {orders.data?.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <strong>{o.ticker}</strong> {o.direction === 'long' ? 'buy' : 'short'} {money(o.amount, 0)} {o.trigger_price === null || o.trigger_price === undefined ? 'at the next market open' : `if the price ${o.trigger_when === 'above' ? 'rises to' : 'falls to'} ${money(o.trigger_price)}`}
                <span style={muted}> &middot; placed {o.created_on}, expires {o.expires_on ?? '-'}</span>
              </span>
              {owner && <button type="button" className={button} style={card} onClick={() => act(() => cancelOrder(id, o.id))}>Cancel</button>}
            </li>
          ))}
        </ul>
      </section>

      <details className="rounded-lg p-4" style={card}>
        <summary className="cursor-pointer font-semibold">Closed positions ({closed.data?.length ?? 0}) and trade history</summary>
        <div className="mt-2 space-y-3 overflow-x-auto text-sm">
          <table className="data-table w-full">
            <thead><tr className="text-left" style={muted}><th>Stock</th><th>Held</th><th className="text-right">Return</th><th className="text-right">Profit</th><th>Source</th></tr></thead>
            <tbody>
              {closed.data?.map((x) => (
                <tr key={x.id}><td>{x.ticker}{x.direction === 'short' ? ' (short)' : ''}</td><td>{x.opened_on} to {x.closed_on}</td><td className="text-right" style={{ color: moveColor(x.returnPct) }}>{fmtPct(x.returnPct)}</td><td className="text-right" style={{ color: moveColor(x.realized_pnl) }}>{signedMoney(x.realized_pnl)}</td><td>{SOURCE_LABEL[x.source ?? ''] ?? x.source}</td></tr>
              ))}
            </tbody>
          </table>
          <table className="data-table w-full">
            <thead><tr className="text-left" style={muted}><th>Date</th><th>Trade</th><th className="text-right">Shares</th><th className="text-right">Price</th><th className="text-right">Realized</th></tr></thead>
            <tbody>
              {trades.data?.map((t) => (
                <tr key={t.id}><td>{t.traded_on}</td><td>{t.action} {t.direction} {t.ticker}</td><td className="text-right">{t.quantity}</td><td className="text-right">{money(t.price)}</td><td className="text-right">{t.realized_pnl ? signedMoney(t.realized_pnl) : ''}</td></tr>
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
