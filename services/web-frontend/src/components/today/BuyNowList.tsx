import { useState } from 'react'
import type { NightlyRow } from '../../services/nightly'
import { RowDetail } from './RowDetail'
import { arrow, card, fmtPct, fmtPrice, moveColor, muted } from './format'

export function BuyNowList({ rows }: { rows: NightlyRow[] }) {
  const [open, setOpen] = useState<string | null>(null)
  if (rows.length === 0) return null

  return (
    <section aria-labelledby="buy-now-heading" className="space-y-2">
      <h2 id="buy-now-heading" className="text-lg font-semibold">
        Buy now
      </h2>
      <p className="text-sm" style={muted}>
        The final call said act today, with no price trigger to wait for.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((r) => {
          const isOpen = open === r.ticker
          return (
            <div key={r.ticker} className="rounded-lg p-4" style={card}>
              <button
                type="button"
                className="flex w-full items-center justify-between text-left"
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? null : r.ticker)}
              >
                <span className="text-lg font-semibold">{r.ticker}</span>
                <span className="text-right">
                  <span className="block">{fmtPrice(r.price)}</span>
                  <span className="block text-xs" style={{ color: moveColor(r.change_pct) ?? muted.color }}>
                    {arrow(r.change_pct)} {fmtPct(r.change_pct)} since last night
                  </span>
                </span>
              </button>
              {isOpen && <RowDetail row={r} />}
            </div>
          )
        })}
      </div>
    </section>
  )
}
