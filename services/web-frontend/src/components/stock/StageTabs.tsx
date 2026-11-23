import { useState, type KeyboardEvent } from 'react'
import { MarkdownView } from './MarkdownView'
import { DecisionCard } from './DecisionCard'
import { extractDecision } from './decision'
import { card, muted } from '../today/format'

const STAGES: Array<{ key: string; name: string; hint: string }> = [
  { key: 'market', name: 'Market', hint: 'Price, trend and how far the stock typically moves in a day.' },
  { key: 'social', name: 'Social', hint: 'What people are saying online.' },
  { key: 'news', name: 'News', hint: 'Recent headlines and what they could mean.' },
  { key: 'fundamentals', name: 'Fundamentals', hint: 'The company’s finances and valuation.' },
  { key: 'bull', name: 'Bull case', hint: 'The strongest argument for buying.' },
  { key: 'bear', name: 'Bear case', hint: 'The strongest argument against.' },
  { key: 'research_manager', name: 'Research mgr', hint: 'Weighs bull against bear and picks a side.' },
  { key: 'trader', name: 'Trader', hint: 'Turns that view into a concrete plan.' },
  { key: 'aggressive', name: 'Risk: bold', hint: 'Risk review arguing to take more risk.' },
  { key: 'conservative', name: 'Risk: careful', hint: 'Risk review arguing to take less.' },
  { key: 'neutral', name: 'Risk: balanced', hint: 'Risk review in the middle.' },
  { key: 'pm', name: 'Final call', hint: 'The portfolio manager’s decision, trigger and walk-away.' },
]

/** A write-up that carries a JSON decision shows it as a card, with any prose around it below. */
function StageBody({ text }: { text: string }) {
  const found = extractDecision(text)
  if (!found) return <MarkdownView text={text} />
  return (
    <div className="space-y-4">
      <DecisionCard d={found.decision} />
      {found.rest && <MarkdownView text={found.rest} />}
    </div>
  )
}

export function StageTabs({ stages }: { stages: Record<string, string> }) {
  const available = STAGES.filter((s) => stages[s.key])
  const [selected, setSelected] = useState<string | null>(null)
  const active = available.find((s) => s.key === selected) ?? available[available.length - 1]

  if (!active) return <p style={muted}>No write-ups were saved for this night.</p>

  const onKey = (e: KeyboardEvent, index: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = available[(index + step + available.length) % available.length]
    setSelected(next.key)
    document.getElementById(`tab-${next.key}`)?.focus()
  }

  return (
    <div>
      <div role="tablist" aria-label="Opinion trail" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:flex-wrap">
        {available.map((s, i) => {
          const on = s.key === active.key
          return (
            <button
              key={s.key}
              id={`tab-${s.key}`}
              role="tab"
              type="button"
              aria-selected={on}
              aria-controls="stage-panel"
              tabIndex={on ? 0 : -1}
              onClick={() => setSelected(s.key)}
              onKeyDown={(e) => onKey(e, i)}
              className="shrink-0 whitespace-nowrap rounded px-3 py-2 text-sm"
              style={{
                border: '1px solid var(--color-border, #cbd5e1)',
                fontWeight: on ? 600 : 400,
                background: on ? 'var(--color-surface, #f1f5f9)' : 'transparent',
              }}
            >
              {s.name}
            </button>
          )
        })}
      </div>
      <div id="stage-panel" role="tabpanel" aria-labelledby={`tab-${active.key}`} className="mt-3 rounded-lg p-4" style={card}>
        <p className="pb-2 text-xs" style={muted}>
          {active.hint}
        </p>
        <StageBody text={stages[active.key]} />
      </div>
    </div>
  )
}
