import { Fragment, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { TickerLink } from '../TickerLink'
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

const DASH = '—'
const rule = { borderTop: '1px solid var(--color-border, #e2e8f0)' }

function Distance({ r }: { r: NightlyRow }) {
  const atrPct = r.atr && r.price ? (r.atr / r.price) * 100 : 0
  if (r.distance_to_trigger_pct === null) return <span style={muted}>{DASH}</span>
  return (
    <span className="inline-flex items-center gap-2">
      <DistanceBar distancePct={r.distance_to_trigger_pct} atrPct={atrPct} />
      {fmtPct(r.distance_to_trigger_pct)}
    </span>
  )
}

function CloseTag() {
  return (
    <span className="ml-2 text-xs" style={{ color: '#B7791F' }}>
      close
    </span>
  )
}

export function TriggerTable({ rows, compact }: { rows: NightlyRow[]; compact?: boolean }) {
  const [open, setOpen] = useState<number | null>(null)
  if (rows.length === 0) return null
  const sorted = sortByDistance(rows)

  return (
    <section id={compact ? undefined : 'waiting'} aria-labelledby={compact ? undefined : 'waiting-heading'} className="scroll-mt-20 space-y-2">
      {!compact && (
        <>
          <h2 id="waiting-heading" className="text-lg font-semibold">
            Waiting for a trigger
          </h2>
          <p className="text-sm" style={muted}>
            Closest to its trigger first. The bar fills as the price nears the trigger; the middle tick is one typical day
            of movement away. Tap a row for the reasoning, or a ticker for its full page.
          </p>
        </>
      )}

      {/* Phones: one card per stock. */}
      <ul className="space-y-2 md:hidden">
        {sorted.map((r, i) => {
          const isOpen = open === i
          return (
            <li key={`${r.ticker}-${i}`} className="clickable rounded-lg p-3" style={card} onClick={() => setOpen(isOpen ? null : i)}>
              <div className="flex w-full items-center justify-between gap-3">
                <span>
                  <TickerLink ticker={r.ticker} />
                  {r.inside_half_day && <CloseTag />}
                </span>
                <button
                  type="button"
                  className="flex items-center gap-2 font-semibold"
                  aria-expanded={isOpen}
                  aria-label={`${isOpen ? 'Hide' : 'Show'} the reasoning for ${r.ticker}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpen(isOpen ? null : i)
                  }}
                >
                  {fmtPrice(r.price)}
                  <ChevronDown className="chevron h-4 w-4" data-open={isOpen} style={muted} aria-hidden="true" />
                </button>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs" style={muted}>Trigger</dt>
                  <dd>
                    {fmtPrice(r.trigger_price)}
                    <span className="ml-1 text-xs" style={muted}>{r.trigger_type ?? ''}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs" style={muted}>Since last night</dt>
                  <dd style={{ color: moveColor(r.change_pct) ?? muted.color }}>
                    {arrow(r.change_pct)} {fmtPct(r.change_pct)}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs" style={muted}>Distance to trigger</dt>
                  <dd><Distance r={r} /></dd>
                </div>
              </dl>
              {isOpen && (
                <div onClick={(e) => e.stopPropagation()} className="cursor-auto">
                  <RowDetail row={r} />
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {/* Tablets and desktops: the table. */}
      <div className="hidden overflow-x-auto rounded-lg md:block" style={card}>
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
            {sorted.map((r, i) => {
              const isOpen = open === i
              return (
                <Fragment key={`${r.ticker}-${i}`}>
                  <tr style={rule} className="clickable-row" onClick={() => setOpen(isOpen ? null : i)}>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          aria-label={`${isOpen ? 'Hide' : 'Show'} the reasoning for ${r.ticker}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpen(isOpen ? null : i)
                          }}
                        >
                          <ChevronDown className="chevron h-4 w-4" data-open={isOpen} style={muted} aria-hidden="true" />
                        </button>
                        <TickerLink ticker={r.ticker} />
                      </span>
                      {r.inside_half_day && <CloseTag />}
                    </td>
                    <td className="p-3">{fmtPrice(r.price)}</td>
                    <td className="p-3">
                      {fmtPrice(r.trigger_price)}
                      <span className="ml-1 text-xs" style={muted}>
                        {r.trigger_type ?? ''}
                      </span>
                    </td>
                    <td className="p-3">
                      <Distance r={r} />
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
