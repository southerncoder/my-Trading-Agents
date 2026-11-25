import { Link } from 'react-router-dom'
import { TickerName } from '../TickerLink'
import { ArrowRight } from 'lucide-react'
import type { NightlyDay } from '../../services/nightly'
import { arrow, card, fmtPct, moveColor, muted } from './format'

function Tile({ title, children, hint, to }: { title: string; children: React.ReactNode; hint: string; to: string }) {
  return (
    <Link to={to} className="clickable group block min-w-0 rounded-lg p-3 md:p-4" style={card}>
      <div className="flex items-center justify-between text-sm" style={muted}>
        {title}
        <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
      </div>
      <div className="break-words text-xl font-semibold md:text-2xl">{children}</div>
      <div className="text-xs" style={muted}>
        {hint}
      </div>
    </Link>
  )
}

export function SummaryStrip({ day }: { day: NightlyDay }) {
  const buyNow = day.summary.by_label['Buy now'] ?? 0
  const waiting = day.rows.length - buyNow
  const mover = day.summary.biggest_mover

  return (
    <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))]">
      <Tile title="Buy now" hint="no trigger needed" to={buyNow ? '#buy-now' : '/picks'}>
        {buyNow}
      </Tile>
      <Tile title="Waiting for a trigger" hint="buy only if price gets there" to="#waiting">
        {waiting}
      </Tile>
      <Tile title="Close to firing" hint="trigger within half a typical day" to="#waiting">
        {day.summary.inside_half_day}
      </Tile>
      <Tile title="Biggest mover" hint="since the previous night" to={mover ? `/stock/${encodeURIComponent(mover.ticker)}` : '/stocks'}>
        {mover ? (
          <span style={{ color: moveColor(mover.change_pct) }}>
            <TickerName ticker={mover.ticker} /> {arrow(mover.change_pct)} {fmtPct(mover.change_pct)}
          </span>
        ) : (
          <span style={muted}>{'—'}</span>
        )}
      </Tile>
    </div>
  )
}
