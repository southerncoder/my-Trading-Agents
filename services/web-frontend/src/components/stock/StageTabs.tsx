import { useState, type KeyboardEvent } from 'react'
import {
  BarChart3,
  Briefcase,
  ExternalLink,
  Flag,
  Flame,
  Gavel,
  LineChart,
  MessageCircle,
  Newspaper,
  Scale,
  Shield,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react'
import { MarkdownView, SOURCE_COLOR } from './MarkdownView'
import { DecisionCard } from './DecisionCard'
import { extractDecision } from './decision'
import { card, muted } from '../today/format'
import { SOURCES, citations, marketFigures, sentimentScore } from './trail'
import { matching, redditSearches, socialSearches } from './research'
import type { StockExtras, StockMedia } from '../../services/nightly'

const STAGES: Array<{ key: string; name: string; hint: string; icon: React.ElementType; group: string }> = [
  { key: 'market', name: 'Market', hint: 'Price, trend and how far the stock typically moves in a day.', icon: LineChart, group: 'Analysts' },
  { key: 'social', name: 'Social', hint: 'What people are saying online.', icon: MessageCircle, group: 'Analysts' },
  { key: 'news', name: 'News', hint: 'Recent headlines and what they could mean.', icon: Newspaper, group: 'Analysts' },
  { key: 'fundamentals', name: 'Fundamentals', hint: 'The company’s finances and valuation.', icon: BarChart3, group: 'Analysts' },
  { key: 'bull', name: 'Bull case', hint: 'The strongest argument for buying.', icon: ThumbsUp, group: 'Debate' },
  { key: 'bear', name: 'Bear case', hint: 'The strongest argument against.', icon: ThumbsDown, group: 'Debate' },
  { key: 'research_manager', name: 'Research mgr', hint: 'Weighs bull against bear and picks a side.', icon: Scale, group: 'Judge' },
  { key: 'trader', name: 'Trader', hint: 'Turns that view into a concrete plan.', icon: Briefcase, group: 'Plan' },
  { key: 'aggressive', name: 'Risk: bold', hint: 'Risk review arguing to take more risk.', icon: Flame, group: 'Risk team' },
  { key: 'conservative', name: 'Risk: careful', hint: 'Risk review arguing to take less.', icon: Shield, group: 'Risk team' },
  { key: 'neutral', name: 'Risk: balanced', hint: 'Risk review in the middle.', icon: Gavel, group: 'Risk team' },
  { key: 'pm', name: 'Final call', hint: 'The portfolio manager’s decision, trigger and walk-away.', icon: Flag, group: 'Decision' },
]

/** The ledger's per-stage timing lean, keyed by stage tab. */
const STANCE_KEY: Record<string, string> = { market: 'market', research_manager: 'rm', trader: 'trader', pm: 'pm' }
const STANCE_TEXT: Record<string, { text: string; color: string }> = {
  now: { text: 'act now', color: '#0A8F80' },
  wait: { text: 'wait', color: 'var(--viz-1, #2a78d6)' },
  none: { text: 'no trade', color: '#64748b' },
}

interface Context {
  ticker: string
  company: string
  media?: StockMedia
  extras?: StockExtras
}

/** A write-up that carries a JSON decision shows it as a card, with any prose around it below. */
function StageBody({ text, onCite }: { text: string; onCite: (s: string) => void }) {
  const found = extractDecision(text)
  if (!found) return <MarkdownView text={text} onCite={onCite} />
  return (
    <div className="space-y-4">
      <DecisionCard d={found.decision} />
      {found.rest && <MarkdownView text={found.rest} onCite={onCite} />}
    </div>
  )
}

/** A 0–100 (or −100–+100) gauge with its zones, for a figure the write-up states. */
function Gauge({ label, value, min, max, zones, fmt, note }: { label: string; value: number; min: number; max: number; zones: { to: number; color: string; name: string }[]; fmt: (v: number) => string; note: string }) {
  const pos = ((value - min) / (max - min)) * 100
  let from = min
  return (
    <div className="min-w-0 rounded-xl p-3" style={{ border: '1px solid var(--color-border, #e2e8f0)' }}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm" style={muted}>{label}</span>
        <span className="text-xl font-bold tabular-nums">{fmt(value)}</span>
      </div>
      <div className="relative mt-2 h-2.5">
        <div className="flex h-full gap-[2px] overflow-hidden rounded-full">
          {zones.map((z) => {
            const w = ((z.to - from) / (max - min)) * 100
            from = z.to
            return <div key={z.name} style={{ width: `${w}%`, background: z.color, opacity: 0.35 }} title={z.name} />
          })}
        </div>
        <div className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${Math.max(0, Math.min(100, pos))}%`, background: 'var(--color-text-primary, #0f172a)', border: '3px solid var(--color-surface, #fff)' }} />
      </div>
      <div className="mt-1 flex justify-between text-[11px]" style={muted}>
        {zones.map((z) => <span key={z.name}>{z.name}</span>)}
      </div>
      <div className="mt-1 text-xs" style={muted}>{note}</div>
    </div>
  )
}

function MarketGauges({ text }: { text: string }) {
  const f = marketFigures(text)
  const ratio = f.volume && f.avgVolume ? f.volume / f.avgVolume : null
  if (f.rsi === undefined && ratio === null && f.atrPct === undefined) return null
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {f.rsi !== undefined && (
        <Gauge
          label="RSI (14 days)"
          value={f.rsi}
          min={0}
          max={100}
          fmt={(v) => v.toFixed(1)}
          zones={[{ to: 30, color: '#0A8F80', name: 'oversold' }, { to: 70, color: '#94a3b8', name: 'neutral' }, { to: 100, color: '#D4501A', name: 'overbought' }]}
          note="Momentum: below 30 often means sold too hard, above 70 bought too hard."
        />
      )}
      {ratio !== null && (
        <Gauge
          label="Volume vs 3-month average"
          value={Math.min(ratio, 4)}
          min={0}
          max={4}
          fmt={() => `${ratio.toFixed(1)}×`}
          zones={[{ to: 1, color: '#94a3b8', name: 'quiet' }, { to: 2, color: 'var(--viz-1, #2a78d6)', name: 'busy' }, { to: 4, color: '#D4501A', name: 'heavy' }]}
          note="Heavy volume means many traders acted on the day's move."
        />
      )}
      {f.atrPct !== undefined && (
        <Gauge
          label="Typical daily move"
          value={Math.min(f.atrPct, 10)}
          min={0}
          max={10}
          fmt={() => `${f.atrPct!.toFixed(1)}%`}
          zones={[{ to: 2, color: '#0A8F80', name: 'calm' }, { to: 5, color: '#94a3b8', name: 'normal' }, { to: 10, color: '#D4501A', name: 'wild' }]}
          note={`ATR(14) ${f.atr?.toFixed(2)}: one ordinary day's swing.`}
        />
      )}
    </div>
  )
}

function SocialGauge({ text }: { text: string }) {
  const s = sentimentScore(text)
  if (s === undefined) return null
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Gauge
        label="Sentiment score"
        value={s}
        min={-100}
        max={100}
        fmt={(v) => `${v > 0 ? '+' : ''}${v.toFixed(0)}`}
        zones={[{ to: -20, color: '#D4501A', name: 'bearish' }, { to: 20, color: '#94a3b8', name: 'mixed' }, { to: 100, color: '#0A8F80', name: 'bullish' }]}
        note="Bullish minus bearish mentions, as the social report states it."
      />
    </div>
  )
}

function SourceLinks({ stage, text, ctx }: { stage: string; text: string; ctx: Context }) {
  const t = encodeURIComponent(ctx.ticker)
  const links: { label: string; url: string }[] = []
  let articles: { title: string; url: string; source: string }[] = []
  if (stage === 'market') {
    links.push(
      { label: 'Yahoo Finance chart', url: `https://finance.yahoo.com/quote/${t}/chart/` },
      { label: 'TradingView', url: `https://www.tradingview.com/symbols/${t}/` },
      { label: 'StockCharts', url: `https://stockcharts.com/sc3/ui/?s=${t}` },
    )
  } else if (stage === 'fundamentals') {
    const cik = ctx.extras?.fundamentals?.cik
    if (cik) links.push({ label: 'SEC filings (EDGAR)', url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(cik)}&type=&dateb=&owner=include&count=40` })
    if (ctx.extras?.properties?.url) links.push({ label: `Latest ${ctx.extras.properties.form}`, url: ctx.extras.properties.url })
    links.push(
      { label: 'Yahoo financials', url: `https://finance.yahoo.com/quote/${t}/financials/` },
      { label: 'Key statistics', url: `https://finance.yahoo.com/quote/${t}/key-statistics/` },
    )
  } else if (stage === 'news') {
    const items = [...(ctx.media?.articles ?? []), ...(ctx.media?.social?.docs ?? []).map((d) => ({ title: d.title, url: d.url, source: d.domain }))]
    articles = matching(text, items, 6)
    if (articles.length < 3) articles = [...articles, ...(ctx.media?.articles ?? []).filter((a) => !articles.includes(a))].slice(0, 5)
    links.push({ label: 'Google News', url: `https://news.google.com/search?q=${encodeURIComponent(`"${ctx.company}" ${ctx.ticker}`)}` })
  } else if (stage === 'social') {
    links.push(...socialSearches(ctx.ticker, ctx.company).filter((l) => /StockTwits|X \(/.test(l.label)), ...redditSearches(ctx.ticker, ctx.company).slice(0, 4))
  } else {
    return null
  }
  return (
    <div className="space-y-2 rounded-xl p-4" style={{ background: 'color-mix(in srgb, var(--color-primary, #2563eb) 6%, transparent)' }}>
      <div className="text-sm font-semibold">Go to the source</div>
      {articles.length > 0 && (
        <ul className="space-y-1 text-sm">
          {articles.map((a) => (
            <li key={a.url} className="flex gap-2">
              <Newspaper className="mt-0.5 h-4 w-4 shrink-0" style={muted} aria-hidden="true" />
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="underline">{a.title}</a>
              <span className="shrink-0" style={muted}>· {a.source}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" className="clickable inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm" style={card}>
            {l.label} <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        ))}
      </div>
    </div>
  )
}

/** Stacked bars: how often each debate, judge, plan and risk voice cites each analyst report. */
function EvidenceChart({ stages, onPick, active }: { stages: Record<string, string>; onPick: (k: string) => void; active: string }) {
  const rows = STAGES.filter((s) => s.group !== 'Analysts' && stages[s.key])
    .map((s) => ({ s, c: citations(stages[s.key]) }))
    .map((r) => ({ ...r, total: SOURCES.reduce((a, k) => a + r.c[k], 0) }))
    .filter((r) => r.total > 0)
  if (!rows.length) return null
  const max = Math.max(...rows.map((r) => r.total))
  return (
    <div className="space-y-3 rounded-2xl p-4 md:p-5" style={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="text-lg font-semibold">What each voice leaned on</div>
          <div className="text-sm" style={muted}>Times each one cites an analyst report. Click a row to read it.</div>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {SOURCES.map((k) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: SOURCE_COLOR[k] }} aria-hidden="true" />
              {k}
            </span>
          ))}
        </div>
      </div>
      <div className="space-y-1.5">
        {rows.map(({ s, c, total }) => (
          <button
            key={s.key}
            type="button"
            onClick={() => onPick(s.key)}
            className="grid w-full grid-cols-[7.5rem_minmax(0,1fr)_2rem] items-center gap-3 rounded-lg px-2 py-1 text-left text-sm transition-colors hover:bg-[color-mix(in_srgb,var(--color-primary,#2563eb)_7%,transparent)]"
            style={s.key === active ? { background: 'color-mix(in srgb, var(--color-primary, #2563eb) 12%, transparent)', fontWeight: 600 } : undefined}
            title={SOURCES.map((k) => `${k} ${c[k]}`).join(', ')}
          >
            <span className="flex items-center gap-1.5 truncate"><s.icon className="h-4 w-4 shrink-0" style={muted} aria-hidden="true" />{s.name}</span>
            <span className="flex h-5 gap-[2px]" style={{ width: `${(total / max) * 100}%` }} aria-label={SOURCES.map((k) => `${k} ${c[k]}`).join(', ')}>
              {SOURCES.filter((k) => c[k]).map((k, i, arr) => (
                <span
                  key={k}
                  className="flex items-center justify-center text-[11px] font-semibold text-white"
                  style={{ width: `${(c[k] / total) * 100}%`, background: SOURCE_COLOR[k], borderRadius: `${i === 0 ? 4 : 0}px ${i === arr.length - 1 ? 4 : 0}px ${i === arr.length - 1 ? 4 : 0}px ${i === 0 ? 4 : 0}px` }}
                >
                  {(c[k] / max) * 100 > 7 ? c[k] : ''}
                </span>
              ))}
            </span>
            <span className="text-right tabular-nums" style={muted}>{total}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * The opinion trail: the pipeline of voices as a clickable map, what each leaned on, and the selected
 * write-up with its figures, gauges and links to the original sources.
 */
export function StageTabs({ stages, stance = {}, ctx }: { stages: Record<string, string>; stance?: Record<string, string>; ctx?: Context }) {
  const available = STAGES.filter((s) => stages[s.key])
  const [selected, setSelected] = useState<string | null>(null)
  const active = available.find((s) => s.key === selected) ?? available[available.length - 1]

  if (!active) return <p style={muted}>No write-ups were saved for this night.</p>

  const pick = (key: string) => {
    if (!stages[key]) return
    setSelected(key)
    document.getElementById('stage-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const onKey = (e: KeyboardEvent, index: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = available[(index + step + available.length) % available.length]
    setSelected(next.key)
    document.getElementById(`tab-${next.key}`)?.focus()
  }

  const groups = [...new Set(available.map((s) => s.group))]
  const lean = (key: string) => STANCE_TEXT[stance[STANCE_KEY[key] ?? ''] ?? '']

  return (
    <div className="space-y-4">
      {/* The pipeline: each group of voices feeds the next. */}
      <div role="tablist" aria-label="Opinion trail" className="-mx-1 flex items-stretch gap-1.5 overflow-x-auto px-1 pb-2">
        {groups.map((g, gi) => (
          <div key={g} className="flex shrink-0 items-stretch gap-1.5">
            <div className="flex flex-col gap-1.5 rounded-2xl p-2" style={{ border: '1px dashed var(--color-border, #cbd5e1)' }}>
              <div className="px-1 text-[11px] font-semibold uppercase tracking-wider" style={muted}>{g}</div>
              <div className="flex flex-col gap-1.5">
                {available.filter((s) => s.group === g).map((s) => {
                  const on = s.key === active.key
                  const l = lean(s.key)
                  const i = available.indexOf(s)
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
                      className="flex min-w-[7.5rem] items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-colors"
                      style={{
                        border: `1px solid ${on ? 'var(--color-primary, #2563eb)' : 'var(--color-border, #cbd5e1)'}`,
                        background: on ? 'color-mix(in srgb, var(--color-primary, #2563eb) 14%, var(--color-surface, #fff))' : 'var(--color-surface, #fff)',
                        fontWeight: on ? 700 : 500,
                      }}
                    >
                      <s.icon className="h-4 w-4 shrink-0" style={{ color: 'var(--color-primary, #2563eb)' }} aria-hidden="true" />
                      <span className="flex flex-col leading-tight">
                        {s.name}
                        {l && <span className="text-[11px] font-semibold" style={{ color: l.color }}>{l.text}</span>}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            {gi < groups.length - 1 && <div className="flex items-center text-base" style={muted} aria-hidden="true">→</div>}
          </div>
        ))}
      </div>

      <EvidenceChart stages={stages} onPick={pick} active={active.key} />

      <div id="stage-panel" role="tabpanel" aria-labelledby={`tab-${active.key}`} className="scroll-mt-20 space-y-4 rounded-2xl p-5 md:p-6" style={card}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: 'color-mix(in srgb, var(--color-primary, #2563eb) 14%, transparent)' }}>
            <active.icon className="h-5 w-5" style={{ color: 'var(--color-primary, #2563eb)' }} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xl font-bold">{active.name}</div>
            <div className="text-sm" style={muted}>{active.hint}</div>
          </div>
          {lean(active.key) && (
            <span className="rounded-full px-3 py-1 text-sm font-semibold" style={{ border: `1px solid ${lean(active.key)!.color}`, color: lean(active.key)!.color }}>
              Timing: {lean(active.key)!.text}
            </span>
          )}
        </div>
        {active.key === 'market' && <MarketGauges text={stages.market} />}
        {active.key === 'social' && <SocialGauge text={stages.social} />}
        <StageBody text={stages[active.key]} onCite={pick} />
        {ctx && <SourceLinks stage={active.key} text={stages[active.key]} ctx={ctx} />}
      </div>
    </div>
  )
}
