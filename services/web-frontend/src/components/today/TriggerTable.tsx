import { Fragment, useState } from 'react'
import type { NightlyRow } from '../../services/nightly'
import { DistanceBar } from './DistanceBar'
import { RowDetail } from './RowDetail'
import { arrow, card, fmtPct, fmtPrice, moveColor, muted } from './format'

function sortByDistance(rows: NightlyRow[]): NightlyRow[] {
  return [...rows].sort((a, b) => {
    const da = a.distance_to_trigger_pct === null ? Infinity : Math.abs(a.distance_to_trigger_pct)
    const db = b.distance_to_trigger_pct === null ? Infinity : Math.abs(b.distance_to_trigger_pct)
    return da - db
  })
}

export function TriggerTable({ rows }: { rows: NightlyRow[] }) {
  const [open, setOpen] = useState<string | null>(null)
  if (rows.length === 0) return null

  return (
    <section aria-labelledby="waiting-heading" className="space-y-2">
      <h2 id="waiting-heading" className="text-lg font-semibold">
        Waiting for a trigger
      </h2>
      <p className="text-sm" style={muted}>
        Closest to its trigger first. The bar fills as the price nears the trigger; the middle tick is one typical day
        of movement away.
      </p>
      <div className="overflow-x-auto rounded-lg" style={card}>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left" style={muted}>
              <th className="p-3 font-normal">Stock</th>
              <th className="p-3 font-normal">Price</th>
              <th className="p-3 font-normal">Trigger</th>
              <th className="p-3 font-normal">Distance</th>
              <th className="p-3 font-normal">Since last night</th>
            </tr>
          </thead>
          <tbody>
            {sortByDistance(rows).map((r) => {
              const isOpen = open === r.ticker
              const atrPct = r.atr && r.price ? (r.atr / r.price) * 100 : 0
              return (
                <Fragment key={r.ticker}>
                  <tr style={{ borderTop: '1px solid var(--color-border, #e2e8f0)' }}>
                    <td className="p-3">
                      <button
                        type="button"
                        className="font-semibold"
                        aria-expanded={isOpen}
                        onClick={() => setOpen(isOpen ? null : r.ticker)}
                      >
                        {r.ticker}
                      </button>
                      {r.inside_half_day && (
                        <span className="ml-2 text-xs" style={{ color: '#B7791F' }}>
                          close
                        </span>
                      )}
                    </td>
                    <td className="p-3">{fmtPrice(r.price)}</td>
                    <td className="p-3">
                      {fmtPrice(r.trigger_price)}
                      <span className="ml-1 text-xs" style={muted}>
                        {r.trigger_type ?? ''}
                      </span>
                    </td>
                    <td className="p-3">
                      {r.distance_to_trigger_pct === null ? (
                        <span style={muted}>{'—'}</span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          <DistanceBar distancePct={r.distance_to_trigger_pct} atrPct={atrPct} />
                          {fmtPct(r.distance_to_trigger_pct)}
                        </span>
                      )}
                    </td>
                    <td className="p-3" style={{ color: moveColor(r.change_pct) ?? muted.color }}>
                      {arrow(r.change_pct)} {fmtPct(r.change_pct)}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={5} className="px-3">
                        <RowDetail row={r} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
