import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart3, BookOpenText, CalendarRange, Eye, GraduationCap, LineChart, Scale, Sparkles, Trophy } from 'lucide-react'
import { fetchHistory, type HistoryRow } from '../../services/nightly'
import { fetchPerformance, fetchPortfolios, type Performance } from '../../services/portfolio'
import { Card, HBars, SectionTitle, StatTile, muted } from '../viz'
import { FAMILIES, familyOf } from '../scorecard/charts'
import { PortfolioLines } from '../results/charts'
import { Markdown } from '../portfolio/Markdown'
import { fmtPct } from '../today/format'

const DAY = 86_400_000
/** The seven calendar days that end on the review's Friday. */
export function weekRange(weekEnding: string): { from: string; to: string } {
  const to = weekEnding
  const from = new Date(Date.parse(`${weekEnding}T00:00:00Z`) - 6 * DAY).toISOString().slice(0, 10)
  return { from, to }
}

/** The latest scored horizon for a call (5 days, else 3, else 1), with which one it is. */
export function latestResult(r: HistoryRow): { h: number; v: number } | null {
  for (const h of ['5', '3', '1']) if (r.vs_spy[h] !== undefined) return { h: Number(h), v: r.vs_spy[h] }
  return null
}

/** One bar per night: that night's calls split by kind, 2px gaps between parts. */
function NightBars({ rows }: { rows: HistoryRow[] }) {
  const nights = [...new Set(rows.map((r) => r.date))].sort()
  const max = Math.max(1, ...nights.map((d) => rows.filter((r) => r.date === d).length))
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        {FAMILIES.map((f) => (
          <span key={f.key} className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm" style={{ background: f.color }} aria-hidden="true" />{f.name}</span>
        ))}
      </div>
      {nights.map((d) => {
        const day = rows.filter((r) => r.date === d)
        return (
          <div key={d} className="flex items-center gap-3 text-sm">
            <span className="w-20 shrink-0 tabular-nums">{d.slice(5)}</span>
            <div className="flex h-6 gap-[2px]" style={{ width: `${(day.length / max) * 100}%`, minWidth: 8 }} role="img" aria-label={`${d}: ${FAMILIES.map((f) => `${day.filter((r) => familyOf(r.label) === f.key).length} ${f.name}`).join(', ')}`}>
              {FAMILIES.map((f) => {
                const n = day.filter((r) => familyOf(r.label) === f.key).length
                return n ? <div key={f.key} className="h-full first:rounded-l last:rounded-r" style={{ flex: n, background: f.color }} title={`${n} ${f.name}`} /> : null
              })}
            </div>
            <span className="shrink-0 tabular-nums" style={muted}>{day.length}</span>
          </div>
        )
      })}
    </div>
  )
}

/** Numbers and charts for the review's week, built from the ledger and the portfolios, next to the written review. */
export function WeekGlance({ weekEnding }: { weekEnding: string }) {
  const navigate = useNavigate()
  const [hist, setHist] = useState<HistoryRow[] | null>(null)
  const [perf, setPerf] = useState<{ id: number; name: string; points: Performance['series'] }[]>([])
  useEffect(() => {
    fetchHistory().then((h) => setHist(h.rows), () => setHist([]))
    fetchPortfolios()
      .then((ps) => Promise.allSettled(ps.map((p) => fetchPerformance(p.id).then((r) => ({ id: p.id, name: p.name, points: r.series })))))
      .then((rs) => setPerf(rs.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []))))
      .catch(() => undefined)
  }, [])
  const { from, to } = weekRange(weekEnding)
  const rows = useMemo(() => (hist ?? []).filter((r) => r.date >= from && r.date <= to), [hist, from, to])
  const results = rows.map((r) => ({ r, res: latestResult(r) })).filter((e): e is { r: HistoryRow; res: { h: number; v: number } } => e.res !== null)
  const beat = results.filter((e) => e.res.v > 0).length
  const upTo = perf.map((p) => ({ ...p, points: p.points.filter((x) => x.date <= to) })).filter((p) => p.points.length > 0)
  // A line needs two days; a week that ends on a portfolio's first day has only one.
  const lines = new Set(upTo.flatMap((p) => p.points.map((x) => x.date))).size >= 2
  if (!hist) return <p style={muted}>Loading the week's numbers...</p>
  if (!rows.length) return <p style={muted}>No calls on record for {from} to {to}.</p>
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 md:grid-cols-[repeat(4,minmax(0,1fr))]">
        <StatTile icon={CalendarRange} label="Nights" value={new Set(rows.map((r) => r.date)).size} hint={`${from} to ${to}`} />
        <StatTile icon={Sparkles} label="Calls" value={rows.length} hint={`${new Set(rows.map((r) => r.ticker)).size} stocks`} />
        <StatTile icon={BarChart3} label="Buy now" value={rows.filter((r) => familyOf(r.label) === 'buy_now').length} hint={`${rows.filter((r) => familyOf(r.label) === 'trigger').length} waiting for a trigger`} />
        <StatTile icon={Trophy} label="Beat SPY so far" value={results.length ? `${Math.round((beat / results.length) * 100)}%` : '—'} hint={results.length ? `${beat} of ${results.length} scored calls` : 'none scored yet'} to="/scorecard" />
      </div>
      <div className={`grid gap-6 ${lines ? 'lg:grid-cols-2' : ''}`}>
        <Card className="space-y-3">
          <SectionTitle icon={BarChart3} title="Calls each night" sub="What the system said, night by night, that week." />
          <NightBars rows={rows} />
        </Card>
        {lines && (
          <Card className="space-y-3">
            <SectionTitle icon={LineChart} title="Portfolios against SPY" sub={`Up to ${to}. Each portfolio from 100 on its first day.`} />
            <PortfolioLines series={upTo} />
          </Card>
        )}
      </div>
      {results.length > 0 && (
        <Card className="space-y-3">
          <SectionTitle icon={Scale} title="How the week's calls have done" sub="Each call's return minus SPY's, after 5 trading days where that much time has passed (else 3, else 1). Best first; click for the stock." />
          <HBars
            labelWidth={150}
            format={(v) => fmtPct(v, 2)}
            onRow={(k) => navigate(`/stock/${k.split('|')[0]}?date=${k.split('|')[1]}`)}
            rows={[...results].sort((a, b) => b.res.v - a.res.v).map(({ r, res }) => ({ key: `${r.ticker}|${r.date}`, label: r.ticker, ticker: r.ticker, value: res.v, faint: res.h < 5, note: `${r.date.slice(5)} · ${r.label} · after ${res.h}d` }))}
          />
        </Card>
      )}
    </div>
  )
}

const SECTION_ICON: Array<[RegExp, React.ElementType]> = [
  [/brief|summary/i, BookOpenText],
  [/pick/i, Sparkles],
  [/portfolio|shadow|spy/i, Scale],
  [/lesson|learn/i, GraduationCap],
  [/watch|next/i, Eye],
]

/** The written review split at its "##" headings into one card each. */
export function ReviewSections({ text }: { text: string }) {
  const parts = text.split(/^##\s+/m).map((p) => p.trim()).filter(Boolean)
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {parts.map((p, i) => {
        const nl = p.indexOf('\n')
        const title = (nl < 0 ? p : p.slice(0, nl)).trim()
        const body = nl < 0 ? '' : p.slice(nl + 1)
        const Icon = SECTION_ICON.find(([re]) => re.test(title))?.[1] ?? BookOpenText
        const wide = /lesson/i.test(title) || i === 0 || i === parts.length - 1
        return (
          <section key={i} className={`space-y-2 rounded-2xl p-5 ${wide ? 'md:col-span-2' : ''}`} style={{ border: '1px solid var(--color-border, #e2e8f0)', background: /lesson/i.test(title) ? 'color-mix(in srgb, var(--color-primary, #2563eb) 6%, transparent)' : undefined }}>
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <Icon className="h-5 w-5" style={{ color: 'var(--color-primary, #2563eb)' }} aria-hidden="true" />
              {title}
            </h3>
            <div className="text-base"><Markdown text={body} /></div>
          </section>
        )
      })}
    </div>
  )
}
