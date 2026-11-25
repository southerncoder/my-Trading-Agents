import { Fragment } from 'react'
import type { Position, Trade } from '../../services/portfolio'
import { TickerLink } from '../TickerLink'
import { card, fmtPct, moveColor, muted } from '../today/format'
import { SOURCE_LABEL } from './helpers'
import { button, money, signedMoney } from './ui'
import { PlanBar, PositionSpark } from './portfolioViz'
import type { Closes } from '../today/triggerViz'

const rule = { borderTop: '1px solid var(--color-border, #e2e8f0)' }
const shares = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(4).replace(/0+$/, ''))

/** Each buy and sale that built the position, oldest first: +1 on a buy call, -1 on a sell call for the baseline. */
function ShareChanges({ trades }: { trades: Trade[] }) {
  if (trades.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span style={muted}>Share changes:</span>
      {trades.map((t) => {
        const up = t.action === 'open' || t.action === 'add'
        return (
          <span
            key={t.id}
            className="rounded px-1.5 py-0.5"
            style={{ border: `1px solid ${up ? '#0A8F80' : '#D4501A'}`, color: up ? '#0A8F80' : '#D4501A' }}
            title={`${t.action} ${shares(t.quantity)} at ${money(t.price)} on ${t.traded_on}${t.note ? ` (${t.note})` : ''}`}
          >
            {up ? '+' : '−'}{shares(t.quantity)} <span style={muted}>{t.traded_on.slice(5)} @ {money(t.price)}</span>
          </span>
        )
      })}
    </div>
  )
}

interface Props {
  positions: Position[]
  trades: Trade[]
  /** The baseline follows calls only, so stops and targets do not apply and are not shown. */
  showPlan: boolean
  canSell: boolean
  selling: number | null
  onSell: (id: number) => void
  renderSellForm: (p: Position) => React.ReactNode
  renderReview: (p: Position) => React.ReactNode
  /** Recent daily closes per ticker, for the sparklines. */
  sparks?: Record<string, Closes>
}

export function OpenPositions({ positions, trades, showPlan, canSell, selling, onSell, renderSellForm, renderReview, sparks = {} }: Props) {
  const last30 = (t: string) => (sparks[t] ?? []).slice(-30)
  const tradesOf = (id: number) => trades.filter((t) => Number(t.position_id) === id).sort((a, b) => a.traded_on.localeCompare(b.traded_on) || a.id - b.id)
  const plan = (x: Position) => (
    <span>stop {money(x.stop_price)} &middot; target {money(x.target_price)} &middot; review by {x.hold_until ?? '-'}</span>
  )
  const extras = (x: Position) => (
    <div className="space-y-1.5">
      <ShareChanges trades={tradesOf(x.id)} />
      {showPlan && <div className="text-xs" style={muted}>{plan(x)}</div>}
      {renderReview(x)}
      {canSell && (selling === x.id ? renderSellForm(x) : (
        <button type="button" className={button} style={card} onClick={() => onSell(x.id)}>{x.direction === 'long' ? 'Sell' : 'Cover'}</button>
      ))}
    </div>
  )

  return (
    <>
      {/* Phones: one card per position. */}
      <ul className="space-y-2 md:hidden">
        {positions.map((x) => (
          <li key={x.id} className="space-y-2 rounded-lg p-3 text-sm" style={card}>
            <div className="flex items-baseline justify-between gap-2">
              <span>
                <TickerLink ticker={x.ticker} className="text-base" />
                {x.direction === 'short' && <span style={muted}> short</span>}
              </span>
              <span className="font-semibold" style={{ color: moveColor(x.unrealized) }}>
                {signedMoney(x.unrealized)} <span className="text-xs">{fmtPct(x.returnPct)}</span>
              </span>
            </div>
            <dl className="grid grid-cols-[repeat(3,minmax(0,1fr))] gap-2 text-xs">
              <div><dt style={muted}>Shares</dt><dd className="font-medium">{shares(x.quantity)}</dd></div>
              <div><dt style={muted}>Avg cost</dt><dd className="font-medium">{money(x.avg_cost)}</dd></div>
              <div><dt style={muted}>Last</dt><dd className="font-medium">{money(x.mark)}</dd></div>
              <div><dt style={muted}>Value</dt><dd className="font-medium">{money(x.market_value)}</dd></div>
              <div><dt style={muted}>Since</dt><dd className="font-medium">{x.opened_on}</dd></div>
              <div><dt style={muted}>Source</dt><dd className="font-medium">{SOURCE_LABEL[x.source ?? ''] ?? x.source ?? '-'}</dd></div>
            </dl>
            <div className="flex flex-wrap items-center gap-3">
              <PositionSpark closes={last30(x.ticker)} p={x} width={140} height={38} />
              {showPlan && <PlanBar p={x} width={150} />}
            </div>
            {extras(x)}
          </li>
        ))}
      </ul>

      {/* Tablets and desktops: one row of figures per position, details underneath. */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs" style={muted}>
              <th className="py-2 pr-3 font-normal">Stock</th>
              <th className="py-2 pr-3 font-normal">Last 30 days</th>
              <th className="py-2 pr-3 text-right font-normal">Shares</th>
              <th className="py-2 pr-3 text-right font-normal">Avg cost</th>
              <th className="py-2 pr-3 text-right font-normal">Last close</th>
              <th className="py-2 pr-3 text-right font-normal">Value</th>
              <th className="py-2 pr-3 text-right font-normal">Gain</th>
              {showPlan && <th className="py-2 pr-3 font-normal">Stop · bought · target</th>}
              <th className="py-2 font-normal">Source</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((x) => (
              <Fragment key={x.id}>
                <tr style={rule}>
                  <td className="pt-3 pr-3 align-top">
                    <TickerLink ticker={x.ticker} className="text-base" />
                    {x.direction === 'short' && <span style={muted}> short</span>}
                    <div className="text-xs" style={muted}>since {x.opened_on}</div>
                  </td>
                  <td className="pt-3 pr-3 align-top"><PositionSpark closes={last30(x.ticker)} p={x} width={130} height={36} /></td>
                  <td className="pt-3 pr-3 text-right align-top font-medium tabular-nums">{shares(x.quantity)}</td>
                  <td className="pt-3 pr-3 text-right align-top tabular-nums">{money(x.avg_cost)}</td>
                  <td className="pt-3 pr-3 text-right align-top tabular-nums">
                    {money(x.mark)}
                    <div className="text-xs" style={muted}>{x.mark_date ?? 'at cost'}</div>
                  </td>
                  <td className="pt-3 pr-3 text-right align-top tabular-nums">{money(x.market_value)}</td>
                  <td className="pt-3 pr-3 text-right align-top tabular-nums" style={{ color: moveColor(x.unrealized) }}>
                    {signedMoney(x.unrealized)}
                    <div className="text-xs">{fmtPct(x.returnPct)}</div>
                  </td>
                  {showPlan && <td className="pt-3 pr-3 align-top"><PlanBar p={x} width={150} /></td>}
                  <td className="pt-3 align-top">{SOURCE_LABEL[x.source ?? ''] ?? x.source ?? '-'}</td>
                </tr>
                <tr>
                  <td colSpan={showPlan ? 9 : 8} className="pb-3 pt-1.5">{extras(x)}</td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
