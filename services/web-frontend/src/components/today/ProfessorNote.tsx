import { useState } from 'react'
import { BarChart3, Briefcase, Clock, GraduationCap, Scale, Shield } from 'lucide-react'
import { muted } from './format'

const PARTS: Array<{ key: string; title: string; icon: React.ElementType }> = [
  { key: 'why_not_before_flag', title: 'Why not buy before the trigger?', icon: Clock },
  { key: 'figures_explained', title: 'The figures, explained', icon: BarChart3 },
  { key: 'buy_low_sell_high', title: 'Buy low, sell high?', icon: Scale },
  { key: 'risk_temperament', title: 'How risky is this?', icon: Shield },
  { key: 'portfolio_fit', title: 'Which portfolio it suits', icon: Briefcase },
]

const accent = 'var(--color-primary, #2563eb)'
const text = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)

/** The Professor's review of one call, compact: the summary, then each part as a tab. Nothing when there is no review. */
export function ProfessorNote({ review }: { review?: Record<string, unknown> | null }) {
  const parts = PARTS.filter((p) => text(review?.[p.key]))
  const [open, setOpen] = useState<string | null>(parts[0]?.key ?? null)
  const summary = text(review?.summary)
  if (!summary && !parts.length) return null
  const shown = parts.find((p) => p.key === open)
  return (
    <div className="space-y-3 rounded-xl p-4" style={{ border: '1px solid var(--color-border, #e2e8f0)', borderLeft: `4px solid ${accent}` }}>
      <div className="flex items-center gap-2 font-semibold">
        <GraduationCap className="h-5 w-5" style={{ color: accent }} aria-hidden="true" />
        Professor&apos;s take
        <span className="text-xs font-normal" style={muted}>explains the call; not advice</span>
      </div>
      {summary && <p className="leading-relaxed">{summary}</p>}
      {parts.length > 0 && (
        <>
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Professor's review">
            {parts.map((p) => (
              <button
                key={p.key}
                type="button"
                role="tab"
                aria-selected={open === p.key}
                onClick={() => setOpen(open === p.key ? null : p.key)}
                className="flex items-center gap-1.5 rounded-full px-3 py-1 text-sm"
                style={{ border: `1px solid ${open === p.key ? accent : 'var(--color-border, #e2e8f0)'}`, fontWeight: open === p.key ? 600 : 400 }}
              >
                <p.icon className="h-3.5 w-3.5" style={{ color: accent }} aria-hidden="true" />
                {p.title}
              </button>
            ))}
          </div>
          {shown && <p role="tabpanel" className="leading-relaxed">{text(review?.[shown.key])}</p>}
        </>
      )}
    </div>
  )
}
