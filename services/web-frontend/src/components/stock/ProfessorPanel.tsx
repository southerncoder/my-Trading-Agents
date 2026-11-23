import { useState } from 'react'
import { BarChart3, Clock, GraduationCap, Scale, Shield, Briefcase, TrendingUp } from 'lucide-react'
import type { EducationalReview } from '../../services/portfolio'
import type { HistoryPoint } from '../../services/nightly'
import { card, muted } from '../today/format'
import { trendNotes } from './trend'

const SECTIONS: Array<{ key: keyof EducationalReview; title: string; icon: React.ElementType }> = [
  { key: 'why_not_before_flag', title: 'Why not buy before the trigger?', icon: Clock },
  { key: 'figures_explained', title: 'The figures, explained', icon: BarChart3 },
  { key: 'buy_low_sell_high', title: 'Buy low, sell high?', icon: Scale },
  { key: 'risk_temperament', title: 'How risky is this?', icon: Shield },
  { key: 'portfolio_fit', title: 'Which portfolio it suits', icon: Briefcase },
]

const accent = 'var(--color-primary, #2563eb)'

/** The Professor's plain-English review of the night's call, plus notes on how the call has trended. */
export function ProfessorPanel({ review, history, date }: { review?: EducationalReview | null; history: HistoryPoint[]; date: string }) {
  const [open, setOpen] = useState<string | null>('why_not_before_flag')
  const notes = trendNotes(history, date)
  const sections = SECTIONS.filter((s) => review?.[s.key])

  return (
    <section aria-labelledby="professor-heading" className="space-y-3 rounded-lg p-4" style={{ ...card, borderLeft: `4px solid ${accent}` }}>
      <div className="flex items-center gap-2">
        <GraduationCap className="h-5 w-5" style={{ color: accent }} aria-hidden="true" />
        <h2 id="professor-heading" className="section-title text-lg font-semibold">Professor&apos;s take</h2>
      </div>

      {review?.summary ? (
        <p className="text-base leading-relaxed">{review.summary}</p>
      ) : (
        <p className="text-sm" style={muted}>
          No Professor review was saved for this night (it is written for runs made after the Professor was added). The trend notes below
          still apply.
        </p>
      )}

      {sections.length > 0 && (
        <div className="space-y-1.5">
          {sections.map((s) => {
            const on = open === s.key
            return (
              <div key={s.key} className="rounded-lg" style={{ border: '1px solid var(--color-border, #e2e8f0)' }}>
                <button
                  type="button"
                  aria-expanded={on}
                  onClick={() => setOpen(on ? null : s.key)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary,#2563eb)_6%,transparent)]"
                >
                  <s.icon className="h-4 w-4 shrink-0" style={{ color: accent }} aria-hidden="true" />
                  <span className="flex-1">{s.title}</span>
                  <span className="chevron text-xs" data-open={on} style={muted} aria-hidden="true">▼</span>
                </button>
                {on && <p className="px-3 pb-3 text-sm leading-relaxed">{review?.[s.key]}</p>}
              </div>
            )
          })}
        </div>
      )}

      {notes.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={muted}>
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> What the trend says
          </div>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
            {notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
          <p className="text-xs" style={muted}>Worked out from the history table below, up to the night shown.</p>
        </div>
      )}
    </section>
  )
}
