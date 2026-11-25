import { Link } from 'react-router-dom'
import type { WatchStock } from '../../services/nightly'
import { BrandIcon } from '../BrandIcon'
import { useNames } from '../brandStore'
import { callColor } from '../viz'
import { fmtPct, fmtPrice, moveColor, muted } from '../today/format'
import { PriceSpark, type Closes } from '../today/triggerViz'

/** Percent change over the last `days` trading days of closes, or null without enough history. */
export function changeOver(closes: Closes | undefined, days: number): number | null {
  if (!closes || closes.length < 2) return null
  const last = closes[closes.length - 1].close
  const first = closes[Math.max(0, closes.length - 1 - days)].close
  return first > 0 ? ((last - first) / first) * 100 : null
}

/** Where the last close sits in the range of the closes shown: 0 = at the low, 100 = at the high. */
export function rangePosition(closes: Closes | undefined): number | null {
  if (!closes || closes.length < 2) return null
  const v = closes.map((c) => c.close)
  const lo = Math.min(...v)
  const hi = Math.max(...v)
  return hi > lo ? ((v[v.length - 1] - lo) / (hi - lo)) * 100 : 50
}

/** One tile per stock: mark, name, last close, 30-day change, a 30-day sparkline with the trigger, and its latest call. */
export function StockBoard({ stocks, sparks }: { stocks: WatchStock[]; sparks: Record<string, Closes> }) {
  const names = useNames(stocks.map((s) => s.ticker))
  return (
    <ul className="grid grid-cols-[repeat(1,minmax(0,1fr))] gap-3 sm:grid-cols-[repeat(2,minmax(0,1fr))] lg:grid-cols-[repeat(3,minmax(0,1fr))] xl:grid-cols-[repeat(4,minmax(0,1fr))]">
      {stocks.map((s) => {
        const closes = sparks[s.ticker]
        const last30 = closes?.slice(-31)
        const ch = changeOver(closes, 30)
        const price = closes?.length ? closes[closes.length - 1].close : s.latest?.price
        const color = s.latest ? callColor(s.latest.label) : '#94a3b8'
        const body = (
          <>
            <div className="flex items-center gap-2">
              <BrandIcon ticker={s.ticker} size={28} />
              <div className="min-w-0">
                <div className="font-bold leading-tight">{s.ticker}</div>
                <div className="truncate text-xs" style={muted}>{names[s.ticker] ?? ' '}</div>
              </div>
              <div className="ml-auto text-right">
                <div className="font-semibold tabular-nums">{fmtPrice(price ?? null)}</div>
                <div className="text-xs font-semibold tabular-nums" style={{ color: ch === null ? undefined : moveColor(ch) }}>{ch === null ? '—' : `${fmtPct(ch)} 30d`}</div>
              </div>
            </div>
            <div className="mt-2">
              {last30 && last30.length > 1 ? (
                <PriceSpark closes={last30} trigger={s.latest?.trigger_price ?? null} width={260} height={48} fluid />
              ) : (
                <div className="flex h-12 items-center text-xs" style={muted}>No price history yet</div>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
              <span className="truncate rounded-full px-2 py-0.5 font-semibold" style={{ border: `1.5px solid ${color}` }} title={s.latest?.label}>
                {(s.latest?.label ?? 'Not analysed yet').replace('Buy if price reaches trigger', 'Buy at trigger').replace('Short if price reaches trigger', 'Short at trigger')}
              </span>
              <span className="shrink-0" style={muted}>{s.latest ? `${Math.round(s.latest.confidence * 100)}% · ${s.latest.date.slice(5)}` : s.cadence}</span>
            </div>
          </>
        )
        return (
          <li key={`${s.ticker}-${s.list}`}>
            {s.latest ? (
              <Link to={`/stock/${encodeURIComponent(s.ticker)}`} className="clickable block h-full rounded-2xl p-3 no-underline" style={{ border: '1px solid var(--color-border, #e2e8f0)', borderTop: `3px solid ${color}`, background: 'var(--color-surface, #fff)' }}>
                {body}
              </Link>
            ) : (
              <div className="h-full rounded-2xl p-3" style={{ border: '1px dashed var(--color-border, #e2e8f0)' }}>{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
