import { Gavel, Info, Landmark, Newspaper, Scale } from 'lucide-react'
import type { Matter, StockExtras } from '../../services/nightly'
import { card, fmtPct, muted } from '../today/format'
import { compactMoney } from './charts'

type Exposure = StockExtras['regulatory']['exposure']

const LEVELS: Array<{ key: Exposure; label: string; color: string }> = [
  { key: 'watch', label: 'Watch', color: '#64748b' },
  { key: 'elevated', label: 'Elevated', color: '#B45309' },
  { key: 'high', label: 'High', color: '#C2410C' },
]

const STAGE_NAME: Record<string, string> = {
  news: 'News analyst',
  fundamentals: 'Fundamentals analyst',
  social: 'Social analyst',
  market: 'Market analyst',
  bear: 'Bear case',
  bull: 'Bull case',
  research_manager: 'Research manager',
  trader: 'Trader',
  aggressive: 'Risk: bold',
  conservative: 'Risk: careful',
  neutral: 'Risk: balanced',
}

const USE: Record<string, string> = {
  key_risk: 'Key risk in the final call',
  data_gap: 'Named as a data gap',
  change_mind: 'Could change the call',
  rationale: 'In the final reasoning',
  bear: 'Bear case cites it',
  bull: 'Bull case answers it',
}

const CALL_USE: Record<string, string> = {
  key_risk: 'Key risk',
  data_gap: 'Could not check',
  change_mind: 'Would change its mind',
  rationale: 'Reasoning',
}

function ExposurePill({ exposure }: { exposure: Exposure }) {
  if (exposure === 'none') return null
  const n = LEVELS.findIndex((l) => l.key === exposure)
  const level = LEVELS[n]
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold"
      style={{ border: `1px solid ${level.color}`, color: level.color }}
      title="Watch: only possibilities or debate talk. Elevated: an analyst reported a matter under way. High: a regulator's charges, or a court ruling."
    >
      <span className="inline-flex gap-[3px]" aria-hidden="true">
        {LEVELS.map((l, i) => (
          <span key={l.key} className="h-1.5 w-4 rounded-full" style={{ background: i <= n ? level.color : 'var(--color-border, #cbd5e1)' }} />
        ))}
      </span>
      {level.label}
    </span>
  )
}

function Stepper({ m }: { m: Matter }) {
  const accent = m.active ? '#B45309' : '#64748b'
  return (
    <ol className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${m.stages.length}, minmax(0, 1fr))` }} aria-label={`Stage: ${m.stages[m.stage]}`}>
      {m.stages.map((s, i) => (
        <li key={s} className="flex flex-col gap-1.5" aria-current={i === m.stage ? 'step' : undefined}>
          <span className="h-1.5 rounded-full" style={{ background: i <= m.stage ? accent : 'var(--color-border, #e2e8f0)' }} />
          <span className="text-xs leading-tight sm:text-sm" style={i === m.stage ? { fontWeight: 700 } : muted}>{s}</span>
        </li>
      ))}
    </ol>
  )
}

function Tile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="min-w-0 rounded-xl p-4" style={{ border: '1px solid var(--color-border, #e2e8f0)' }}>
      <div className="text-sm" style={muted}>{label}</div>
      <div className="mt-0.5 text-xl font-semibold">{value}</div>
      <div className="mt-0.5 text-xs" style={muted}>{hint}</div>
    </div>
  )
}

function MatterCard({ m, date, revenue }: { m: Matter; date: string; revenue?: { value: number; year: string } }) {
  const Icon = m.kind === 'policy' ? Landmark : Gavel
  const tiles: React.ReactNode[] = []
  if (m.fineCapPct && revenue) {
    tiles.push(
      <Tile
        key="cap"
        label="Most it could cost"
        value={`Up to ${compactMoney((revenue.value * m.fineCapPct) / 100)}`}
        hint={`Legal cap: ${m.fineCapPct}% of worldwide revenue (${compactMoney(revenue.value)} in FY${revenue.year}). Actual fines are usually far lower.`}
      />,
    )
  }
  if (m.sinceFirst) {
    const s = m.sinceFirst
    tiles.push(
      <Tile
        key="since"
        label={`Stock since first mentioned (${s.from})`}
        value={`${fmtPct(s.stockPct)}${s.spyPct != null ? ` vs ${fmtPct(s.spyPct)} S&P 500` : ''}`}
        hint="How much the market may already have priced in. Other news moves the price too."
      />,
    )
  } else {
    tiles.push(<Tile key="since" label="First mentioned" value={m.firstSeen && m.firstSeen !== date ? m.firstSeen : 'This night'} hint="Earliest night on record whose write-ups mention it." />)
  }
  tiles.push(
    <Tile
      key="who"
      label={m.about.length ? 'Who it is about' : 'Who is involved'}
      value={m.about.length ? m.about.join(', ') : m.agencies.length ? m.agencies.join(', ') : 'Not named'}
      hint={m.about.length ? 'Another company: it reaches this stock only through its sector.' : 'Regulators or courts named in the write-ups.'}
    />,
  )

  return (
    <article className="space-y-5 rounded-2xl p-5 md:p-6" style={card}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider" style={muted}>
            <Icon className="h-4 w-4" aria-hidden="true" /> {m.kind === 'policy' ? 'Rule or policy' : 'Enforcement or legal'}
            {m.agencies.length > 0 && <span>· {m.agencies.join(', ')}</span>}
          </div>
          <h3 className="text-xl font-semibold md:text-2xl">{m.title}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {!m.active && (
            <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ border: '1px dashed #64748b', color: 'var(--color-text-secondary, #334155)' }}>
              {m.about.length ? 'About another company' : 'Only as a possibility'}
            </span>
          )}
          {m.active && !m.reported && (
            <span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ border: '1px dashed #64748b' }}>Debate only</span>
          )}
        </div>
      </header>

      <div className="space-y-2">
        <div className="text-sm" style={muted}>Where it stands, as the write-ups describe it</div>
        <Stepper m={m} />
      </div>

      <div className="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">{tiles}</div>

      {(m.usedBy.length > 0 || m.callText.length > 0) && (
        <div className="space-y-3 rounded-xl p-4" style={{ background: 'color-mix(in srgb, var(--color-primary, #2563eb) 7%, transparent)' }}>
          <div className="flex items-center gap-2 font-semibold"><Scale className="h-4 w-4" aria-hidden="true" /> How the call used it</div>
          <div className="flex flex-wrap gap-2">
            {m.usedBy.map((u) => (
              <span key={u} className="rounded-full px-3 py-1 text-sm" style={{ border: '1px solid var(--color-border, #cbd5e1)', background: 'var(--color-surface, #fff)' }}>{USE[u] ?? u}</span>
            ))}
          </div>
          {m.callText.map((c) => (
            <p key={c.use + c.text} className="text-base">
              <span className="font-semibold">{CALL_USE[c.use] ?? c.use}: </span>
              {c.text}
            </p>
          ))}
        </div>
      )}

      {m.mentions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm" style={muted}><Newspaper className="h-4 w-4" aria-hidden="true" /> What the write-ups say</div>
          <div className="grid gap-2 md:grid-cols-2">
            {m.mentions.map((x) => (
              <blockquote key={x.stage + x.text} className="rounded-xl p-3 text-sm leading-relaxed" style={{ border: '1px solid var(--color-border, #e2e8f0)', borderLeft: `3px solid ${x.hypothetical ? '#94a3b8' : '#B45309'}` }}>
                <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-semibold" style={muted}>
                  {STAGE_NAME[x.stage] ?? x.stage}
                  {x.hypothetical && <span className="rounded-full px-2 py-0.5 font-normal" style={{ border: '1px dashed #94a3b8' }}>possibility</span>}
                </div>
                {x.text}
              </blockquote>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}

/**
 * Regulatory matters for the night shown: each one with its stage, what is at stake and how the call used it.
 * Found by fixed terms in that night's write-ups, with every sentence shown, so nothing here is a hidden score.
 */
export function RegulatoryWatch({ data, date, loading }: { data?: StockExtras; date: string; loading: boolean }) {
  const reg = data?.regulatory
  const annual = data?.fundamentals?.annual.filter((a) => a.revenue).sort((a, b) => b.end.localeCompare(a.end))[0]
  const revenue = annual?.revenue ? { value: annual.revenue, year: annual.end.slice(0, 4) } : undefined
  const main = reg?.matters.filter((m) => m.active) ?? []
  const maybe = reg?.matters.filter((m) => !m.active) ?? []

  return (
    <section aria-labelledby="reg-heading" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 id="reg-heading" className="flex items-center gap-2 text-2xl font-bold">
          <Gavel className="h-6 w-6" style={{ color: '#B45309' }} aria-hidden="true" /> Regulatory watch
        </h2>
        {reg && <ExposurePill exposure={reg.exposure} />}
      </div>
      {loading && !reg && <div className="h-28 animate-pulse rounded-2xl" style={card} />}
      {reg && (
        <p className="text-base" style={muted}>
          {main.length} active matter{main.length === 1 ? '' : 's'}
          {maybe.length ? ` · ${maybe.length} mentioned only as possibilities or about other companies` : ''} · checked {reg.nightsChecked} night
          {reg.nightsChecked === 1 ? '' : 's'} of write-ups
        </p>
      )}
      {reg && reg.matters.length === 0 && (
        <div className="rounded-2xl p-5 text-base" style={card}>No regulatory or legal matters came up in this night&apos;s write-ups.</div>
      )}
      {main.map((m) => <MatterCard key={m.key} m={m} date={date} revenue={revenue} />)}
      {maybe.length > 0 && (
        <details className="rounded-2xl p-4" style={card}>
          <summary className="cursor-pointer text-base font-semibold">Also mentioned, not active ({maybe.length})</summary>
          <div className="mt-4 space-y-4">{maybe.map((m) => <MatterCard key={m.key} m={m} date={date} revenue={revenue} />)}</div>
        </details>
      )}
      {reg && reg.matters.length > 0 && (
        <p className="flex gap-2 text-sm" style={muted}>
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Found by matching fixed terms (probe, antitrust, lawsuit, tariff, FDA and the like) in the analysts&apos; write-ups, which rely on news and SEC
          data. Stages are read from the wording and are not checked against court or agency records. Label: Watch = possibilities or debate only;
          Elevated = an analyst reported a matter under way; High = a regulator&apos;s charges or a court ruling.
        </p>
      )}
    </section>
  )
}
