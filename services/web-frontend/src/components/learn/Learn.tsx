import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { ENTRY } from './glossary'

const accent = 'var(--color-primary, #2563eb)'
const muted = { color: 'var(--color-text-muted, #64748b)' }

/** A glossary word: dotted underline, its short meaning on hover, a link to the full entry. */
export function Term({ id, children }: { id: string; children?: React.ReactNode }) {
  const e = ENTRY[id]
  if (!e) return <>{children}</>
  return (
    <Link to={`/glossary#${id}`} title={e.short} className="underline decoration-dotted underline-offset-2">
      {children ?? e.term}
    </Link>
  )
}

/**
 * "How to read this chart", folded away under a chart: what it shows, what good looks like, what to watch
 * out for, and the glossary words it uses.
 */
export function ChartGuide({ shows, good, careful, terms = [] }: { shows: string; good?: string; careful?: string; terms?: string[] }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg text-sm" style={{ border: '1px dashed var(--color-border, #cbd5e1)' }}>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-3 py-2 text-left font-medium">
        <GraduationCap className="h-4 w-4" style={{ color: accent }} aria-hidden="true" />
        How to read this chart
        <span className="chevron ml-auto text-xs" data-open={open} style={muted} aria-hidden="true">▼</span>
      </button>
      {open && (
        <div className="space-y-2 px-3 pb-3 leading-relaxed">
          <p><strong>What it shows.</strong> {shows}</p>
          {good && <p><strong>What good looks like.</strong> {good}</p>}
          {careful && <p><strong>Careful.</strong> {careful}</p>}
          {terms.length > 0 && (
            <p style={muted}>
              Words used:{' '}
              {terms.map((t, i) => (
                <span key={t}>
                  {i ? ', ' : ''}
                  <Term id={t} />
                </span>
              ))}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
