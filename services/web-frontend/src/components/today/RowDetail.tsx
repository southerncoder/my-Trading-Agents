import type { NightlyRow } from '../../services/nightly'
import { fmtPrice, muted } from './format'

const STAGES: Array<[string, string]> = [
  ['market', 'Market'],
  ['rm', 'Research mgr'],
  ['trader', 'Trader'],
  ['pm', 'Portfolio mgr'],
]

const stanceText: Record<string, string> = { wait: 'wait', now: 'act now', none: 'no view' }

export function RowDetail({ row }: { row: NightlyRow }) {
  const risks = row.pm.key_risks ?? []
  return (
    <div className="space-y-3 text-sm" style={{ padding: '0.75rem 0' }}>
      {row.pm.rationale && <p>{row.pm.rationale}</p>}

      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <span>
          <span style={muted}>Trigger: </span>
          {fmtPrice(row.trigger_price)}
          {row.trigger_type ? ` (${row.trigger_type})` : ''}
        </span>
        <span>
          <span style={muted}>Walk away below: </span>
          {fmtPrice(row.walk_away)}
        </span>
        <span>
          <span style={muted}>Confidence: </span>
          {Math.round(row.confidence * 100)}%
        </span>
      </div>

      {row.trigger_reason && (
        <p>
          <span style={muted}>Why that trigger: </span>
          {row.trigger_reason}
        </p>
      )}

      {risks.length > 0 && (
        <div>
          <div style={muted}>Key risks</div>
          <ul className="list-disc pl-5">
            {risks.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {row.pm.what_would_change_my_mind && (
        <p>
          <span style={muted}>What would change its mind: </span>
          {row.pm.what_would_change_my_mind}
        </p>
      )}

      <div>
        <div style={muted}>How each stage leaned</div>
        <div className="flex flex-wrap gap-2 pt-1">
          {STAGES.map(([key, name]) => (
            <span
              key={key}
              className="rounded px-2 py-0.5"
              style={{ border: '1px solid var(--color-border, #cbd5e1)' }}
            >
              {name}: {stanceText[row.stance[key]] ?? '—'}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
