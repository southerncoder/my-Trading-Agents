import { useState } from 'react'
import { ExternalLink, FileText } from 'lucide-react'
import type { StockExtras } from '../../services/nightly'
import { compactMoney, niceTicks, scale, useWidth, viz } from './charts'

type Fund = NonNullable<StockExtras['fundamentals']>

/** What an 8-K is about, by item number (SEC Form 8-K instructions). */
const ITEM: Record<string, string> = {
  '1.01': 'New material agreement',
  '1.02': 'Agreement ended',
  '1.03': 'Bankruptcy',
  '1.05': 'Cybersecurity incident',
  '2.01': 'Acquisition or sale of assets',
  '2.02': 'Results announced',
  '2.03': 'New debt',
  '2.05': 'Restructuring costs',
  '2.06': 'Write-down',
  '3.01': 'Listing notice',
  '3.02': 'Unregistered share sale',
  '3.03': 'Shareholder rights changed',
  '4.01': 'Auditor changed',
  '4.02': 'Past results no longer reliable',
  '5.01': 'Change in control',
  '5.02': 'Executive or director change',
  '5.03': 'Bylaws or fiscal year changed',
  '5.07': 'Shareholder vote results',
  '7.01': 'Regulation FD disclosure',
  '8.01': 'Other events',
  '9.01': 'Financial statements and exhibits',
}
const FORM: Record<string, string> = { '8-K': 'Current report', '10-Q': 'Quarterly report', '10-K': 'Annual report', '20-F': 'Annual report (foreign issuer)', '6-K': 'Current report (foreign issuer)' }

/** The 8-K's main subject (exhibits-only item 9.01 dropped). */
const itemText = (items?: string[] | null) => {
  const main = (items ?? []).filter((i) => i !== '9.01')
  return main.length ? main.map((i) => ITEM[i] ?? `Item ${i}`).join(', ') : ''
}

const H = 240
const PAD = { top: 26, bottom: 56, left: 56, right: 8 }

const quarterName = (end: string) => {
  const d = new Date(`${end}T00:00:00Z`)
  // Fiscal quarters end near a calendar month end; name them by the month the quarter ends in.
  return `${d.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })} ${String(d.getUTCFullYear()).slice(2)}`
}

function Column({ x, w, top, base, color, label }: { x: number; w: number; top: number; base: number; color: string; label: string }) {
  const up = top <= base
  const h = Math.max(2, Math.abs(base - top))
  const r = Math.min(4, h / 2)
  const y0 = up ? base - h : base
  // Rounded data end, square at the baseline (a loss hangs below it).
  const d = up
    ? `M${x},${base} V${y0 + r} Q${x},${y0} ${x + r},${y0} H${x + w - r} Q${x + w},${y0} ${x + w},${y0 + r} V${base} Z`
    : `M${x},${base} V${base + h - r} Q${x},${base + h} ${x + r},${base + h} H${x + w - r} Q${x + w},${base + h} ${x + w},${base + h - r} V${base} Z`
  return (
    <path d={d} fill={color}>
      <title>{label}</title>
    </path>
  )
}

/** The last reported quarters from SEC filings: revenue next to net income, with margin and EPS under each. */
export function FinancialsChart({ f }: { f: Fund }) {
  const [box, W] = useWidth<HTMLDivElement>(300, 720, 560)
  const [table, setTable] = useState(false)
  const qs = [...f.quarterly].filter((q) => q.revenue != null).sort((a, b) => a.end.localeCompare(b.end)).slice(-6)

  const edgar = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(f.cik)}&type=&dateb=&owner=include&count=40`
  const filings = f.recentFilings.slice(0, 8)

  const chart = () => {
    if (qs.length === 0) return <p className="text-sm" style={{ color: viz.muted }}>No quarterly figures in the SEC filings yet.</p>
    const vals = qs.flatMap((q) => [q.revenue ?? 0, q.netIncome ?? 0])
    const lo = Math.min(0, ...vals)
    const hi = Math.max(...vals)
    const y = scale(lo, hi * 1.08, H - PAD.bottom, PAD.top)
    const band = (W - PAD.left - PAD.right) / qs.length
    const bw = Math.min(24, (band - 16) / 2)
    const ticks = niceTicks(lo, hi, 3)
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Quarterly revenue and net income for the last ${qs.length} quarters`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke={viz.grid} />
            <text x={PAD.left - 6} y={y(t) + 4} fontSize="12" textAnchor="end" fill={viz.muted}>{t === 0 ? '0' : compactMoney(t)}</text>
          </g>
        ))}
        {qs.map((q, i) => {
          const cx = PAD.left + band * i + band / 2
          const last = i === qs.length - 1
          const margin = q.revenue && q.netIncome != null ? (q.netIncome / q.revenue) * 100 : null
          return (
            <g key={q.end}>
              <Column x={cx - bw - 1} w={bw} top={y(q.revenue ?? 0)} base={y(0)} color={viz.s1} label={`${quarterName(q.end)} revenue ${compactMoney(q.revenue ?? 0)}`} />
              {q.netIncome != null && (
                <Column x={cx + 1} w={bw} top={y(q.netIncome)} base={y(0)} color={viz.s2} label={`${quarterName(q.end)} net income ${compactMoney(q.netIncome)}`} />
              )}
              {last && (
                <text x={cx - bw / 2 - 1} y={y(q.revenue ?? 0) - 6} fontSize="12" fontWeight="600" textAnchor="middle" fill="var(--color-text-primary, #0f172a)">
                  {compactMoney(q.revenue ?? 0)}
                </text>
              )}
              <text x={cx} y={H - PAD.bottom + 18} fontSize="12" textAnchor="middle" fill="var(--color-text-primary, #0f172a)">
                {quarterName(q.end)}{q.derived ? '*' : ''}
              </text>
              <text x={cx} y={H - PAD.bottom + 34} fontSize="11" textAnchor="middle" fill={viz.muted}>
                {margin !== null ? `${margin.toFixed(0)}% margin` : ''}
              </text>
              <text x={cx} y={H - PAD.bottom + 48} fontSize="11" textAnchor="middle" fill={viz.muted}>
                {q.epsDiluted != null ? `EPS $${q.epsDiluted.toFixed(2)}` : ''}
              </text>
            </g>
          )
        })}
      </svg>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm" style={{ color: viz.ink }}>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm" style={{ background: viz.s1 }} aria-hidden="true" />Revenue</span>
        <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm" style={{ background: viz.s2 }} aria-hidden="true" />Net income</span>
        <button type="button" className="ml-auto underline" onClick={() => setTable(!table)}>{table ? 'Show chart' : 'Show as table'}</button>
      </div>
      <div ref={box}>
        {table ? (
          <table className="w-full text-sm tabular-nums">
            <thead style={{ color: viz.ink }}>
              <tr><th className="p-2 text-left font-normal">Quarter ending</th><th className="p-2 text-right font-normal">Revenue</th><th className="p-2 text-right font-normal">Net income</th><th className="p-2 text-right font-normal">EPS</th><th className="p-2 text-left font-normal">Filed</th></tr>
            </thead>
            <tbody>
              {[...qs].reverse().map((q) => (
                <tr key={q.end} style={{ borderTop: '1px solid var(--color-border, #e2e8f0)' }}>
                  <td className="p-2">{q.end}{q.derived ? '*' : ''}</td>
                  <td className="p-2 text-right">{q.revenue != null ? compactMoney(q.revenue) : '—'}</td>
                  <td className="p-2 text-right">{q.netIncome != null ? compactMoney(q.netIncome) : '—'}</td>
                  <td className="p-2 text-right">{q.epsDiluted != null ? `$${q.epsDiluted.toFixed(2)}` : '—'}</td>
                  <td className="p-2">{q.filed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          chart()
        )}
      </div>
      {qs.some((q) => q.derived) && (
        <p className="text-xs" style={{ color: viz.muted }}>* Fourth quarter worked out as the full year minus the first three (companies file no 10-Q for it).</p>
      )}

      {filings.length > 0 && (
        <div className="space-y-2 pt-2">
          <div className="text-sm font-semibold">Latest SEC filings</div>
          <div className="flex flex-wrap gap-2">
            {filings.map((x) => (
              <a
                key={`${x.form}-${x.filed}-${x.url ?? ''}`}
                href={x.url ?? edgar}
                target="_blank"
                rel="noopener noreferrer"
                className="clickable inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                style={{ border: '1px solid var(--color-border, #e2e8f0)' }}
                title={`${FORM[x.form] ?? x.form}${x.items?.length ? `: ${x.items.map((i) => ITEM[i] ?? `item ${i}`).join('; ')}` : ''}. Opens the filing.`}
              >
                <FileText className="h-4 w-4" style={{ color: viz.muted }} aria-hidden="true" />
                <strong>{x.form}</strong>
                <span style={{ color: viz.muted }}>{x.filed}</span>
                {itemText(x.items) && <span className="max-w-56 truncate">{itemText(x.items)}</span>}
              </a>
            ))}
            <a href={edgar} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-2 text-sm underline">
              All on EDGAR <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </div>
      )}
      <p className="text-xs" style={{ color: viz.muted }}>As filed with the SEC by {f.asOf} (later filings and restatements are left out, matching what the analysis saw).</p>
    </div>
  )
}
