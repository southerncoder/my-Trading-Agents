import { Link } from 'react-router-dom'
import { TickerName } from '../TickerLink'
import { AlertTriangle, ArrowRight, Flag, LogOut, RefreshCw, Target } from 'lucide-react'
import type { NightlyRow } from '../../services/nightly'
import { fmtPct, fmtPrice, muted } from './format'
import { PriceSpark, typicalDays, type Closes } from './triggerViz'
import { newsSearches, riskQuery } from '../stock/research'
import { useName } from '../brandStore'
import { ProfessorNote } from './ProfessorNote'

const STAGES: Array<[string, string]> = [
  ['market', 'Market'],
  ['rm', 'Research mgr'],
  ['trader', 'Trader'],
  ['pm', 'Portfolio mgr'],
]

const LEAN: Record<string, { text: string; color: string }> = {
  wait: { text: 'wait', color: 'var(--viz-1, #2a78d6)' },
  now: { text: 'act now', color: '#0A8F80' },
  none: { text: 'no view', color: '#64748b' },
}

const box = { border: '1px solid var(--color-border, #e2e8f0)' }

function Fig({ icon: Icon, label, value, hint, color }: { icon: React.ElementType; label: string; value: string; hint?: string; color?: string }) {
  return (
    <div className="min-w-0 rounded-xl p-3" style={box}>
      <div className="flex items-center gap-1.5 text-xs" style={muted}>
        <Icon className="h-3.5 w-3.5" style={{ color }} aria-hidden="true" />
        {label}
      </div>
      <div className="text-lg font-semibold tabular-nums" style={color ? { color } : undefined}>{value}</div>
      {hint && <div className="text-xs" style={muted}>{hint}</div>}
    </div>
  )
}

/** The reasoning behind one waiting call: 90-day chart with its levels, figures, risks to read up on, stage leans. */
export function RowDetail({ row, closes = [] }: { row: NightlyRow; closes?: Closes }) {
  const risks = row.pm.key_risks ?? []
  const days = typicalDays(row)
  // Searches use the company's name: a bare ticker like "T" matches T-Mobile, T-bills and T. Rowe Price.
  const company = useName(row.ticker) ?? row.ticker
  return (
    <div className="space-y-4 py-3 text-base">
      {row.pm.rationale && <p className="text-lg leading-relaxed">{row.pm.rationale}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="rounded-xl p-3" style={box}>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-semibold">Last {closes.length || 90} trading days</span>
            <span className="flex gap-3 text-xs" style={muted}>
              <span><span style={{ color: '#0A8F80' }}>– –</span> trigger</span>
              <span><span style={{ color: '#D4501A' }}>– –</span> walk away</span>
            </span>
          </div>
          {closes.length > 1 ? (
            <PriceSpark closes={closes} trigger={row.trigger_price} walk={row.walk_away} width={560} height={150} axis />
          ) : (
            <p className="text-sm" style={muted}>Price history is loading or not available.</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 content-start">
          <Fig icon={Target} label={`Trigger${row.trigger_type ? ` · ${row.trigger_type}` : ''}`} value={fmtPrice(row.trigger_price)} hint={row.distance_to_trigger_pct !== null ? `${fmtPct(row.distance_to_trigger_pct)} away` : undefined} color="#0A8F80" />
          <Fig icon={LogOut} label="Walk away below" value={fmtPrice(row.walk_away)} hint="the idea is dropped" color="#D4501A" />
          <Fig icon={Flag} label="Typical days away" value={days === null ? '—' : Math.abs(days).toFixed(1)} hint={row.atr ? `one day ≈ ${fmtPrice(row.atr)}` : undefined} />
          <Fig icon={Flag} label="Confidence" value={`${Math.round(row.confidence * 100)}%`} hint="not yet calibrated" />
        </div>
      </div>

      <ProfessorNote review={row.educational_review} />

      {row.trigger_reason && (
        <p>
          <span style={muted}>Why that trigger: </span>
          {row.trigger_reason}
        </p>
      )}

      {risks.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide" style={{ color: '#D4501A' }}>
            <AlertTriangle className="h-4 w-4" aria-hidden="true" /> Key risks
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {risks.map((r) => (
              <div key={r} className="rounded-xl p-3" style={{ ...box, borderLeft: '3px solid #D4501A' }}>
                <div>{r}</div>
                <div className="mt-1 flex flex-wrap gap-x-3 text-xs" style={muted}>
                  Read up:
                  {newsSearches(riskQuery(company, r)).map((l) => (
                    <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--color-primary, #2563eb)' }}>{l.label}</a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {row.pm.what_would_change_my_mind && (
        <div className="flex gap-3 rounded-xl p-3" style={{ background: 'color-mix(in srgb, var(--color-primary, #2563eb) 7%, transparent)' }}>
          <RefreshCw className="mt-1 h-4 w-4 shrink-0" style={{ color: 'var(--color-primary, #2563eb)' }} aria-hidden="true" />
          <p><span className="font-semibold">What would change its mind: </span>{row.pm.what_would_change_my_mind}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm" style={muted}>How each stage leaned:</span>
        {STAGES.map(([key, name], i) => {
          const l = LEAN[row.stance[key]]
          return (
            <span key={key} className="flex items-center gap-2">
              <span className="rounded-full px-3 py-1 text-sm" style={{ border: `1px solid ${l?.color ?? 'var(--color-border, #cbd5e1)'}` }}>
                {name}: <strong style={{ color: l?.color }}>{l?.text ?? '—'}</strong>
              </span>
              {i < STAGES.length - 1 && <ArrowRight className="h-3.5 w-3.5" style={muted} aria-hidden="true" />}
            </span>
          )
        })}
      </div>

      <Link to={`/stock/${row.ticker}`} className="inline-flex items-center gap-1 font-semibold underline">
        Full opinion trail and history for <TickerName ticker={row.ticker} /> <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  )
}
