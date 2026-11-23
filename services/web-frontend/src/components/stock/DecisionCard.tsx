import { AlertTriangle, HelpCircle, RefreshCw, Target, LogOut } from 'lucide-react'
import type { StageDecision } from './decision'
import { DOWN, UP, fmtPrice, muted } from '../today/format'

const HOLD = '#B7791F'

export function decisionColor(d?: string): string {
  if (!d) return 'var(--color-text-primary, inherit)'
  if (d.includes('BUY')) return UP
  if (d.includes('SELL')) return DOWN
  return HOLD
}

const ACTION_TEXT: Record<string, string> = {
  wait_for_trigger: 'Wait for the trigger',
  buy_now: 'Buy now',
  sell_now: 'Sell now',
  act_now: 'Act now',
  hold: 'Keep holding',
  none: 'No action',
}

export const actionText = (a?: string) => (a ? (ACTION_TEXT[a] ?? a.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())) : undefined)

const box = { border: '1px solid var(--color-border, #e2e8f0)', borderRadius: '0.5rem' }

function Figure({ label, value, hint, color }: { label: string; value: React.ReactNode; hint?: string; color?: string }) {
  return (
    <div className="min-w-0 p-3" style={box}>
      <div className="text-xs" style={muted}>{label}</div>
      <div className="text-lg font-semibold" style={color ? { color } : undefined}>{value}</div>
      {hint && <div className="text-xs" style={muted}>{hint}</div>}
    </div>
  )
}

function List({ icon: Icon, title, items, color }: { icon: React.ElementType; title: string; items?: string[]; color?: string }) {
  if (!items?.length) return null
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color: color ?? muted.color }}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {title}
      </div>
      <ul className="list-disc space-y-0.5 pl-5">
        {items.map((t) => <li key={t}>{t}</li>)}
      </ul>
    </div>
  )
}

/** The Portfolio Manager's structured decision, laid out instead of shown as raw JSON. */
export function DecisionCard({ d }: { d: StageDecision }) {
  const color = decisionColor(d.decision)
  const conf = d.confidence !== undefined ? Math.round(d.confidence * 100) : null
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <div className="flex flex-wrap items-center gap-3">
        {d.decision && (
          <span className="rounded-md px-3 py-1 text-base font-bold tracking-wide" style={{ color, border: `2px solid ${color}` }}>
            {d.decision}
          </span>
        )}
        {actionText(d.action_now) && <span className="font-medium">{actionText(d.action_now)}</span>}
        {conf !== null && (
          <span className="ml-auto flex items-center gap-2 text-xs" style={muted} title="How sure the model is. Not yet calibrated against results.">
            confidence
            <span className="inline-block h-1.5 w-20 overflow-hidden rounded-full" style={{ background: 'var(--color-border, #e2e8f0)' }}>
              <span className="block h-full rounded-full" style={{ width: `${conf}%`, background: color }} />
            </span>
            <strong style={{ color }}>{conf}%</strong>
          </span>
        )}
      </div>

      {d.rationale && <p className="text-base">{d.rationale}</p>}

      {(d.trigger_price != null || d.walk_away_price != null) && (
        <div className="grid grid-cols-[repeat(1,minmax(0,1fr))] gap-2 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
          {d.trigger_price != null && (
            <Figure
              label={`Trigger${d.trigger_type ? ` · ${d.trigger_type}` : ''}`}
              value={<span className="inline-flex items-center gap-1.5"><Target className="h-4 w-4" aria-hidden="true" />{fmtPrice(d.trigger_price)}</span>}
              hint={d.trigger_reason}
            />
          )}
          {d.walk_away_price != null && (
            <Figure
              label="Walk away below"
              value={<span className="inline-flex items-center gap-1.5"><LogOut className="h-4 w-4" aria-hidden="true" />{fmtPrice(d.walk_away_price)}</span>}
              hint="Below this the idea is dropped."
              color={DOWN}
            />
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <List icon={AlertTriangle} title="Key risks" items={d.key_risks} color={DOWN} />
        <List icon={HelpCircle} title="What it could not check" items={d.data_gaps} />
      </div>

      {d.what_would_change_my_mind && (
        <div className="flex gap-2 rounded-lg p-3" style={{ background: 'color-mix(in srgb, var(--color-primary, #2563eb) 7%, transparent)' }}>
          <RefreshCw className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--color-primary, #2563eb)' }} aria-hidden="true" />
          <p><span className="font-semibold">What would change its mind: </span>{d.what_would_change_my_mind}</p>
        </div>
      )}
    </div>
  )
}
