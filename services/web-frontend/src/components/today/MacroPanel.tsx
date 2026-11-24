import { useEffect, useState } from 'react'
import { ExternalLink, Globe2 } from 'lucide-react'
import { fetchMacro, type Macro, type MacroIndicator } from '../../services/nightly'
import { card, muted } from './format'

/** What each figure means, in one line, for someone new to markets. */
const HELP: Record<string, string> = {
  unemployment: 'Share of people looking for work who have none. Rising unemployment usually means a slowing economy.',
  payrolls: 'Jobs the economy added last month. Steady gains mean companies are hiring; a drop can signal a slowdown.',
  cpi: 'How much prices rose over the past year. High inflation makes the Fed keep interest rates up.',
  coreCpi: 'Inflation without food and energy, which jump around. The Fed watches this one closely.',
  fedFunds: 'The rate banks charge each other overnight, set by the Fed. Higher rates make borrowing and stocks less attractive.',
  t2y: 'What the US government pays to borrow for 2 years. Moves with what traders expect the Fed to do.',
  t10y: 'What the US government pays to borrow for 10 years. Higher yields put pressure on stock valuations, growth stocks most.',
  curve: '10-year minus 2-year yield. Below zero (inverted) has often come before recessions.',
  vix: 'How much the market expects stocks to swing over the next month. Around 15 is calm; above 30 is stress.',
  hySpread: 'Extra interest risky companies pay over the government. Widening means lenders are getting nervous.',
  oil: 'Price of a barrel of US crude. Feeds into inflation and into energy, airline and shipping profits.',
  gdp: 'How fast the US economy grew in the latest quarter, at a yearly pace.',
}

const GROUPS = ['Jobs', 'Inflation', 'Rates', 'Markets', 'Growth'] as const

function Tile({ i }: { i: MacroIndicator }) {
  const ref = i.compare[0]
  const dir = ref ? (i.value > ref.value ? '▲' : i.value < ref.value ? '▼' : '=') : ''
  return (
    <a
      href={i.url}
      target="_blank"
      rel="noopener noreferrer"
      className="clickable group block min-w-0 rounded-lg p-3"
      style={card}
      title={`${HELP[i.key] ?? i.label}\n\nSource: ${i.source}. Opens the official series page.`}
    >
      <div className="flex items-start justify-between gap-2 text-xs" style={muted}>
        <span className="leading-snug">{i.label}</span>
        <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums">
        {i.display}
        {dir && <span className="ml-1.5 text-xs font-normal" style={muted}>{dir}</span>}
      </div>
      <div className="text-xs" style={muted}>{i.dateLabel}</div>
      {i.compare.length > 0 && (
        <div className="mt-1 text-xs" style={muted}>
          {i.compare.map((c) => `${c.display} ${c.label}`).join(' · ')}
        </div>
      )}
    </a>
  )
}

/**
 * The market-wide backdrop for a night: the official BLS and FRED figures the market analyst was given.
 * Every tile opens the official series page.
 */
export function MacroPanel({ date }: { date?: string }) {
  const [data, setData] = useState<Macro | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(true)

  useEffect(() => {
    let live = true
    fetchMacro(date)
      .then((d) => {
        if (!live) return
        setData(d)
        setError(null)
      })
      .catch((e: unknown) => live && setError(e instanceof Error ? e.message : 'Could not load the macro data'))
    return () => {
      live = false
    }
  }, [date])

  return (
    <section aria-labelledby="macro-heading" className="space-y-2">
      <button type="button" className="flex w-full items-baseline justify-between gap-2 text-left" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <h2 id="macro-heading" className="flex items-center gap-2 text-lg font-semibold">
          <Globe2 className="h-4 w-4" style={{ color: 'var(--color-primary, #2563eb)' }} aria-hidden="true" />
          Macro backdrop
        </h2>
        <span className="text-xs" style={muted}>
          {data ? `as known on ${data.asOf}` : ''} <span className="chevron inline-block" data-open={open} aria-hidden="true">▾</span>
        </span>
      </button>
      {open && (
        <>
          <p className="text-sm" style={muted}>
            The economy-wide figures the analysis was given that night (official BLS and Federal Reserve data). Hover a tile for what it
            means; click it for the official source.
          </p>
          {error && <p role="alert" className="text-sm" style={muted}>Macro data is not available right now: {error}</p>}
          {!data && !error && <div className="h-24 animate-pulse rounded-lg" style={card} />}
          {data &&
            GROUPS.map((g) => {
              const items = data.indicators.filter((i) => i.group === g)
              if (!items.length) return null
              return (
                <div key={g} className="space-y-1.5">
                  <div className="text-xs font-semibold uppercase tracking-wide" style={muted}>{g}</div>
                  <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2 md:grid-cols-[repeat(4,minmax(0,1fr))]">
                    {items.map((i) => <Tile key={i.key} i={i} />)}
                  </div>
                </div>
              )
            })}
          {data?.notes.map((n) => (
            <p key={n} className="text-xs" style={muted}>Note: {n}</p>
          ))}
        </>
      )}
    </section>
  )
}
