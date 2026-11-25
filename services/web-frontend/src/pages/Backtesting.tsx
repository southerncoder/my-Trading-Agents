import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Activity, FlaskConical, LineChart, ListChecks, PieChart } from 'lucide-react'
import { fetchBacktest, type Backtest, type BacktestOutcome } from '../services/nightly'
import { Card, HBars, PageHeader, SectionTitle, SegmentBar, Segmented, StatTile, muted } from '../components/viz'
import { niceTicks, scale, useWidth, viz } from '../components/stock/charts'
import { fmtPct, fmtPrice, moveColor } from '../components/today/format'
import { TickerLink } from '../components/TickerLink'

const OUTCOME: Record<BacktestOutcome, { name: string; color: string; help: string }> = {
  closed: { name: 'Bought and sold', color: 'var(--viz-1, #2a78d6)', help: 'held for the days set, or sold at the walk-away' },
  open: { name: 'Still held', color: 'var(--viz-3, #1baf7a)', help: 'bought, holding days not over yet: valued at the last close' },
  cancelled: { name: 'Cancelled', color: 'var(--viz-2, #eb6834)', help: 'price fell to the walk-away before the trigger' },
  expired: { name: 'Never triggered', color: 'var(--viz-4, #eda100)', help: 'the trigger price was not reached in time' },
  held: { name: 'Already holding', color: '#94a3b8', help: 'a repeat call on a stock already held: skipped' },
  no_prices: { name: 'Too recent', color: '#cbd5e1', help: 'no trading day after the call yet' },
}

const money = (n: number) => `${n < 0 ? '−' : n > 0 ? '+' : ''}$${Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`

/** Profit in dollars over time: the strategy (solid) against the same dollars put in SPY on the same days (dashed). */
function EquityChart({ bt }: { bt: Backtest }) {
  const [box, W] = useWidth<HTMLDivElement>(300, 1100, 900)
  const [hover, setHover] = useState<number | null>(null)
  const e = bt.equity
  if (e.length < 2) return <p style={muted}>Not enough trading days yet to draw a line.</p>
  const H = 260
  const L = 60
  const vals = e.flatMap((x) => [x.strategy, x.spy, 0])
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const pad = (hi - lo) * 0.1 || 10
  const x = scale(0, e.length - 1, L, W - 70)
  const y = scale(lo - pad, hi + pad, H - 28, 10)
  const path = (k: 'strategy' | 'spy') => e.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join('')
  const ticks = niceTicks(lo - pad, hi + pad, 5)
  const last = e[e.length - 1]
  const h = hover === null ? null : e[hover]
  return (
    <div ref={box} className="space-y-2">
      <div className="flex flex-wrap gap-x-4 text-sm">
        <span className="flex items-center gap-1.5"><svg width="20" height="6" aria-hidden="true"><line x1="0" y1="3" x2="20" y2="3" stroke={viz.s1} strokeWidth="2" /></svg>Following the calls</span>
        <span className="flex items-center gap-1.5"><svg width="20" height="6" aria-hidden="true"><line x1="0" y1="3" x2="20" y2="3" stroke="#8a94a6" strokeWidth="2" strokeDasharray="4 3" /></svg>Same dollars in SPY, same days</span>
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full touch-none"
          role="img"
          aria-label={`Profit following the calls ${money(last.strategy)} against ${money(last.spy)} in SPY, ${e[0].date} to ${last.date}`}
          onPointerMove={(ev) => {
            const r = ev.currentTarget.getBoundingClientRect()
            const px = ((ev.clientX - r.left) / r.width) * W
            setHover(Math.max(0, Math.min(e.length - 1, Math.round(((px - L) / (W - 70 - L)) * (e.length - 1)))))
          }}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - 70} y1={y(t)} y2={y(t)} stroke={t === 0 ? viz.ink : viz.grid} strokeOpacity={t === 0 ? 0.5 : 1} />
              <text x={L - 6} y={y(t) + 4} fontSize="11" textAnchor="end" fill={viz.muted}>{money(t)}</text>
            </g>
          ))}
          <path d={path('spy')} fill="none" stroke="#8a94a6" strokeWidth="2" strokeDasharray="5 4" />
          <path d={path('strategy')} fill="none" stroke={viz.s1} strokeWidth="2.5" strokeLinejoin="round" />
          <text x={W - 64} y={y(last.strategy) + 4} fontSize="12" fontWeight="600" fill="var(--color-text-primary, #0f172a)">{money(last.strategy)}</text>
          <text x={W - 64} y={y(last.spy) + 4} fontSize="11" fill={viz.muted}>{money(last.spy)}</text>
          <text x={L} y={H - 8} fontSize="11" fill={viz.muted}>{e[0].date}</text>
          <text x={W - 70} y={H - 8} fontSize="11" textAnchor="end" fill={viz.muted}>{last.date}</text>
          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={10} y2={H - 28} stroke={viz.ink} strokeOpacity="0.3" />
              <circle cx={x(hover)} cy={y(e[hover].strategy)} r="4" fill={viz.s1} stroke={viz.surface} strokeWidth="2" />
            </g>
          )}
        </svg>
        {h && (
          <div className="pointer-events-none absolute left-16 top-2 rounded px-2 py-1 text-xs shadow" style={{ background: 'var(--color-surface, #fff)', border: '1px solid var(--color-border, #e2e8f0)' }}>
            <div className="font-semibold">{h.date}</div>
            <div>Following the calls: {money(h.strategy)}</div>
            <div style={muted}>SPY: {money(h.spy)}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export function Backtesting() {
  const navigate = useNavigate()
  const [calls, setCalls] = useState<'both' | 'now' | 'trigger'>('both')
  const [source, setSource] = useState<'all' | 'watchlist' | 'screen' | 'news'>('all')
  const [hold, setHold] = useState(5)
  const [stop, setStop] = useState<'on' | 'off'>('on')
  const [minConf, setMinConf] = useState(0)
  const [bt, setBt] = useState<Backtest | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let live = true
    setBusy(true)
    setError(null)
    fetchBacktest({ calls, source, hold, stop: stop === 'on', minConfidence: minConf, triggerDays: 5 })
      .then((r) => live && setBt(r))
      .catch((e: Error) => live && setError(e.message))
      .finally(() => live && setBusy(false))
    return () => {
      live = false
    }
  }, [calls, source, hold, stop, minConf])

  const taken = bt?.trades.filter((t) => t.entryDate) ?? []
  return (
    <div className="app-page mx-auto max-w-6xl space-y-8 p-3 sm:p-4 md:p-8">
      <PageHeader icon={FlaskConical} title="Backtesting" sub="What following the past calls would have done, replayed on real daily prices with the simple rules you pick. $1,000 per trade, no fees, one position per stock at a time." />

      <Card className="space-y-4">
        <SectionTitle icon={Activity} title="Rules" sub="Change any rule and the replay runs again." />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1"><div className="text-sm font-semibold">Which calls</div><Segmented label="Which calls" value={calls} onChange={setCalls} options={[{ value: 'both', label: 'All buys' }, { value: 'now', label: 'Buy now only' }, { value: 'trigger', label: 'Trigger buys only' }]} /></div>
          <div className="space-y-1"><div className="text-sm font-semibold">From</div><Segmented label="Source" value={source} onChange={setSource} options={[{ value: 'all', label: 'Every source' }, { value: 'watchlist', label: 'Watchlist' }, { value: 'screen', label: 'Screen' }, { value: 'news', label: 'News' }]} /></div>
          <div className="space-y-1"><div className="text-sm font-semibold">Sell after</div><Segmented label="Holding days" value={hold} onChange={setHold} options={[1, 3, 5, 10].map((d) => ({ value: d, label: `${d} day${d === 1 ? '' : 's'}` }))} /></div>
          <div className="space-y-1"><div className="text-sm font-semibold">Sell early at the walk-away price</div><Segmented label="Walk-away stop" value={stop} onChange={setStop} options={[{ value: 'on', label: 'Yes' }, { value: 'off', label: 'No' }]} /></div>
          <div className="space-y-1"><div className="text-sm font-semibold">Minimum confidence</div><Segmented label="Minimum confidence" value={minConf} onChange={setMinConf} options={[0, 0.6, 0.65].map((c) => ({ value: c, label: c ? `${Math.round(c * 100)}%+` : 'Any' }))} /></div>
        </div>
        <p className="text-xs" style={muted}>
          Buy now: bought at the next day&apos;s open. Trigger buys: bought on the first of the next 5 trading days that trades through the trigger,
          unless the walk-away price is touched first. Sold at the close after the holding days, or at the walk-away if that is on.
        </p>
      </Card>

      {error && <p role="alert" style={{ color: '#b91c1c' }}>Could not run the backtest: {error}</p>}
      {busy && !bt && <p style={muted}>Replaying the calls on real prices...</p>}

      {bt && (
        <div className={busy ? 'space-y-8 opacity-60 transition-opacity' : 'space-y-8 transition-opacity'}>
          <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))]">
            <StatTile label="Profit" value={<span style={{ color: moveColor(bt.stats.pnl) }}>{money(bt.stats.pnl)}</span>} hint={`SPY: ${money(bt.stats.spyPnl)}`} />
            <StatTile label="Trades" value={bt.stats.taken} hint={`of ${bt.stats.calls} calls · ${bt.stats.open} still held`} />
            <StatTile label="Won" value={bt.stats.winRatePct === null ? '—' : `${Math.round(bt.stats.winRatePct)}%`} hint={`${bt.stats.wins} of ${bt.stats.taken}`} />
            <StatTile label="Average vs SPY" value={bt.stats.avgVsSpyPct === null ? '—' : <span style={{ color: moveColor(bt.stats.avgVsSpyPct) }}>{fmtPct(bt.stats.avgVsSpyPct)}</span>} hint={`worst dip ${money(bt.stats.maxDrawdown)}`} />
          </div>

          <Card className="space-y-4">
            <SectionTitle icon={LineChart} title="Profit over time" sub={`${bt.from ?? '?'} to ${bt.to ?? '?'}: closed trades at their result, open ones at each day's close. Hover for a day.`} />
            <EquityChart bt={bt} />
            <p className="text-xs" style={muted}>The ledger only starts on {bt.from}, so this is a short stretch of calls in one market mood: read it as a first look, not proof.</p>
          </Card>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <Card className="space-y-4">
              <SectionTitle icon={PieChart} title="What happened to each call" />
              <SegmentBar unit=" calls" parts={(Object.keys(OUTCOME) as BacktestOutcome[]).map((k) => ({ label: OUTCOME[k].name, value: bt.stats.outcomes[k] ?? 0, color: OUTCOME[k].color }))} />
              <ul className="space-y-1 text-sm">
                {(Object.keys(OUTCOME) as BacktestOutcome[]).filter((k) => bt.stats.outcomes[k]).map((k) => (
                  <li key={k}><strong>{OUTCOME[k].name}</strong> <span style={muted}>— {OUTCOME[k].help}</span></li>
                ))}
              </ul>
            </Card>
            <Card className="space-y-4">
              <SectionTitle icon={ListChecks} title="Each trade" sub="Return from buy to sale (or to the last close if still held). Click for the stock." />
              <HBars
                labelWidth={130}
                format={(v) => fmtPct(v)}
                onRow={(k) => navigate(`/stock/${k.split('|')[0]}`)}
                rows={[...taken].sort((a, b) => (b.retPct ?? 0) - (a.retPct ?? 0)).map((t) => ({
                  key: `${t.ticker}|${t.callDate}`,
                  label: t.ticker,
                  ticker: t.ticker,
                  value: t.retPct ?? 0,
                  faint: t.outcome === 'open',
                  note: `${t.entryDate?.slice(5)} → ${t.exitDate?.slice(5)}${t.exitReason === 'stop' ? ' · walk-away' : t.outcome === 'open' ? ' · still held' : ''}`,
                }))}
              />
            </Card>
          </div>

          <details className="rounded-lg p-4" style={{ border: '1px solid var(--color-border, #e2e8f0)' }}>
            <summary className="cursor-pointer font-semibold">All trades as a table</summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead style={muted}><tr><th className="p-2">Stock</th><th className="p-2">Call</th><th className="p-2">Bought</th><th className="p-2">Sold</th><th className="p-2 text-right">Return</th><th className="p-2 text-right">SPY</th><th className="p-2 text-right">Profit</th></tr></thead>
                <tbody>
                  {taken.map((t) => (
                    <tr key={`${t.ticker}-${t.callDate}`} style={{ borderTop: '1px solid var(--color-border, #e2e8f0)' }}>
                      <td className="p-2"><TickerLink ticker={t.ticker} /></td>
                      <td className="p-2">{t.callDate} · {t.label}</td>
                      <td className="p-2 tabular-nums">{t.entryDate} at {fmtPrice(t.entry ?? null)}</td>
                      <td className="p-2 tabular-nums">{t.exitDate} at {fmtPrice(t.exit ?? null)}{t.exitReason === 'stop' ? ' (walk-away)' : t.outcome === 'open' ? ' (still held)' : ''}</td>
                      <td className="p-2 text-right tabular-nums" style={{ color: moveColor(t.retPct ?? 0) }}>{fmtPct(t.retPct ?? null)}</td>
                      <td className="p-2 text-right tabular-nums" style={muted}>{t.spyRetPct === undefined ? '—' : fmtPct(t.spyRetPct)}</td>
                      <td className="p-2 text-right tabular-nums">{money(t.pnl ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </div>
      )}
    </div>
  )
}
