import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { TickerLink } from '../TickerLink'
import type { NightlyRow } from '../../services/nightly'
import { RowDetail } from './RowDetail'
import { arrow, card, fmtPct, fmtPrice, moveColor, muted } from './format'

export function BuyNowList({ rows, compact }: { rows: NightlyRow[]; compact?: boolean }) {
  const [open, setOpen] = useState<number | null>(null)
  if (rows.length === 0) return null

  return (
    <section id={compact ? undefined : 'buy-now'} aria-labelledby={compact ? undefined : 'buy-now-heading'} className="scroll-mt-20 space-y-2">
      {!compact && (
        <>
          <h2 id="buy-now-heading" className="text-lg font-semibold">
            Buy now
          </h2>
          <p className="text-sm" style={muted}>
            The final call said act today, with no price trigger to wait for.
          </p>
        </>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((r, i) => {
          const isOpen = open === i
          return (
            <div key={`${r.ticker}-${i}`} className="clickable rounded-lg p-4" style={card} onClick={() => setOpen(isOpen ? null : i)}>
              <div className="flex w-full items-center justify-between gap-3">
                <TickerLink ticker={r.ticker} className="text-lg" />
                <button
                  type="button"
                  className="flex flex-1 items-center justify-end gap-2 text-right"
                  aria-expanded={isOpen}
                  aria-label={`${isOpen ? 'Hide' : 'Show'} the reasoning for ${r.ticker}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpen(isOpen ? null : i)
                  }}
                >
                  <span>
                    <span className="block">{fmtPrice(r.price)}</span>
                    <span className="block text-xs" style={{ color: moveColor(r.change_pct) ?? muted.color }}>
                      {arrow(r.change_pct)} {fmtPct(r.change_pct)} since last night
                    </span>
                  </span>
                  <ChevronDown className="chevron h-4 w-4 shrink-0" data-open={isOpen} style={muted} aria-hidden="true" />
                </button>
              </div>
              {isOpen && (
                <div onClick={(e) => e.stopPropagation()} className="cursor-auto">
                  <RowDetail row={r} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
