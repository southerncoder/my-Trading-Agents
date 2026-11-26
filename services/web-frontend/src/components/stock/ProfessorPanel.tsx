import { useState } from 'react'
import { BarChart3, Clock, GraduationCap, Scale, Shield, Briefcase, TrendingUp } from 'lucide-react'
import type { EducationalReview } from '../../services/portfolio'
import type { HistoryPoint } from '../../services/nightly'
import { card, muted } from '../today/format'
import { trendNotes } from './trend'
import { timingTitle } from '../learn/glossary'

const SECTIONS: Array<{ key: keyof EducationalReview; title: string; icon: React.ElementType }> = [
  { key: 'why_not_before_flag', title: 'Why not buy before the trigger?', icon: Clock },
  { key: 'figures_explained', title: 'The figures, explained', icon: BarChart3 },
  { key: 'buy_low_sell_high', title: 'Buy low, sell high?', icon: Scale },
  { key: 'risk_temperament', title: 'How risky is this?', icon: Shield },
  { key: 'portfolio_fit', title: 'Which portfolio it suits', icon: Briefcase },
]

const accent = 'var(--color-primary, #2563eb)'

/** The Professor's plain-English review of the night's call, plus notes on how the call has trended. */
export function ProfessorPanel({ review, history, date, label }: { review?: EducationalReview | null; history: HistoryPoint[]; date: string; label?: string }) {
  const [open, setOpen] = useState<string | null>('why_not_before_flag')
  const notes = trendNotes(history, date)
  const sections = SECTIONS.filter((s) => review?.[s.key]).map((s) => (s.key === 'why_not_before_flag' ? { ...s, title: timingTitle(label) } : s))

  return (
    <section aria-labelledby="professor-heading" className="space-y-4 rounded-2xl p-5 md:p-6" style={{ ...card, borderLeft: `4px solid ${accent}` }}>
      <div className="flex items-center gap-2">
        <GraduationCap className="h-6 w-6" style={{ color: accent }} aria-hidden="true" />
        <h2 id="professor-heading" className="section-title text-2xl font-bold">Professor&apos;s take</h2>
      </div>

      {review?.summary ? (
        <p className="text-lg leading-relaxed">{review.summary}</p>
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
              <div key={s.key} className="rounded-xl" style={{ border: '1px solid var(--color-border, #e2e8f0)' }}>
                <button
                  type="button"
                  aria-expanded={on}
                  onClick={() => setOpen(on ? null : s.key)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-base font-medium transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary,#2563eb)_6%,transparent)]"
                >
                  <s.icon className="h-4 w-4 shrink-0" style={{ color: accent }} aria-hidden="true" />
                  <span className="flex-1">{s.title}</span>
                  <span className="chevron text-xs" data-open={on} style={muted} aria-hidden="true">▼</span>
                </button>
                {on && <p className="px-4 pb-4 text-base leading-relaxed">{review?.[s.key]}</p>}
              </div>
            )
          })}
        </div>
      )}

      {notes.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide" style={muted}>
            <TrendingUp className="h-4 w-4" aria-hidden="true" /> What the trend says
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {notes.map((n, i) => (
              <div key={n} className="flex gap-3 rounded-xl p-4 text-base leading-snug" style={{ border: '1px solid var(--color-border, #e2e8f0)' }}>
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                  style={{ background: 'color-mix(in srgb, var(--color-primary, #2563eb) 16%, transparent)', color: accent }}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <span>{n}</span>
              </div>
            ))}
          </div>
          <p className="text-xs" style={muted}>Worked out from the history table below, up to the night shown.</p>
        </div>
      )}
    </section>
  )
}
