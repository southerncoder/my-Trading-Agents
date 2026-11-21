import type { NightlyDay } from '../../services/nightly'
import { arrow, card, fmtPct, moveColor, muted } from './format'

function Tile({ title, children, hint }: { title: string; children: React.ReactNode; hint: string }) {
  return (
    <div className="rounded-lg p-4" style={card}>
      <div className="text-sm" style={muted}>
        {title}
      </div>
      <div className="text-2xl font-semibold">{children}</div>
      <div className="text-xs" style={muted}>
        {hint}
      </div>
    </div>
  )
}

export function SummaryStrip({ day }: { day: NightlyDay }) {
  const buyNow = day.summary.by_label['Buy now'] ?? 0
  const waiting = day.rows.length - buyNow
  const mover = day.summary.biggest_mover

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Tile title="Buy now" hint="no trigger needed">
        {buyNow}
      </Tile>
      <Tile title="Waiting for a trigger" hint="buy only if price gets there">
        {waiting}
      </Tile>
      <Tile title="Close to firing" hint="trigger within half a typical day">
        {day.summary.inside_half_day}
      </Tile>
      <Tile title="Biggest mover" hint="since the previous night">
        {mover ? (
          <span style={{ color: moveColor(mover.change_pct) }}>
            {mover.ticker} {arrow(mover.change_pct)} {fmtPct(mover.change_pct)}
          </span>
        ) : (
          <span style={muted}>{'—'}</span>
        )}
      </Tile>
    </div>
  )
}
