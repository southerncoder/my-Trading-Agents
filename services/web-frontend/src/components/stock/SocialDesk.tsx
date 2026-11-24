import { useState } from 'react'
import type { StockMedia } from '../../services/nightly'
import { redditSearches, socialSearches } from './research'
import { scale, useWidth } from './charts'

const fmtDay = (iso?: string | null) => {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const STANCE: Record<string, { mark: string; word: string }> = {
  POSITIVE: { mark: '▲', word: 'upbeat' },
  NEGATIVE: { mark: '▼', word: 'downbeat' },
  NEUTRAL: { mark: '●', word: 'neutral' },
}

/** Plain sentences from the social analyst's markdown, for the lead column. */
function lead(text: string | undefined, max = 4): string[] {
  if (!text) return []
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*+>]|\d+\.|#+)\s*/, '').replace(/\*\*|__|`|\[[a-z_ ]+\]/gi, '').trim())
    .filter((l) => l.length > 40 && !/^\|/.test(l))
    .flatMap((l) => l.split(/(?<=[.!?])\s+(?=[A-Z])/))
    .filter((s) => s.length > 30)
    .slice(0, max)
}

/** SentiSense daily score, −100 (all bearish) to +100 (all bullish), as columns either side of zero. */
function MoodChart({ days }: { days: { date: string; score: number; bull: number; bear: number }[] }) {
  const [box, W] = useWidth<HTMLDivElement>(260, 640, 420)
  const [hover, setHover] = useState<number | null>(null)
  if (!days.length) return null
  const H = 150
  const pad = { t: 14, b: 22, l: 30, r: 6 }
  const max = Math.max(25, ...days.map((d) => Math.abs(d.score)))
  const y = scale(-max, max, H - pad.b, pad.t)
  const band = (W - pad.l - pad.r) / days.length
  const bw = Math.min(24, band - 6)
  const h = hover === null ? null : days[hover]
  return (
    <div ref={box} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Daily social mood over ${days.length} days, latest ${days[days.length - 1].score.toFixed(0)}`}>
        <line x1={pad.l} x2={W - pad.r} y1={y(0)} y2={y(0)} stroke="var(--paper-ink)" strokeOpacity="0.5" />
        <text x={pad.l - 4} y={y(max) + 4} fontSize="11" textAnchor="end" fill="var(--paper-muted)">+{Math.round(max)}</text>
        <text x={pad.l - 4} y={y(0) + 4} fontSize="11" textAnchor="end" fill="var(--paper-muted)">0</text>
        <text x={pad.l - 4} y={y(-max) + 4} fontSize="11" textAnchor="end" fill="var(--paper-muted)">−{Math.round(max)}</text>
        {days.map((d, i) => {
          const cx = pad.l + band * i + band / 2
          const top = Math.min(y(d.score), y(0))
          const hh = Math.max(2, Math.abs(y(d.score) - y(0)))
          const pos = d.score >= 0
          return (
            <g key={d.date} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} tabIndex={0} onFocus={() => setHover(i)} onBlur={() => setHover(null)} aria-label={`${d.date}: mood ${d.score.toFixed(0)}, ${d.bull} bullish and ${d.bear} bearish mentions`}>
              <rect x={cx - band / 2} y={pad.t} width={band} height={H - pad.t - pad.b} fill="transparent" />
              <rect x={cx - bw / 2} y={top} width={bw} height={hh} rx="3" fill={pos ? 'var(--viz-1, #2a78d6)' : '#e34948'} opacity={hover === null || hover === i ? 1 : 0.55} />
              <text x={cx} y={H - 6} fontSize="11" textAnchor="middle" fill="var(--paper-muted)">{d.date.slice(5)}</text>
            </g>
          )
        })}
        <text x={pad.l + band * (days.length - 0.5)} y={days[days.length - 1].score >= 0 ? y(days[days.length - 1].score) - 4 : y(0) - 4} fontSize="12" fontWeight="700" textAnchor="middle" fill="var(--paper-ink)">
          {days[days.length - 1].score > 0 ? '+' : ''}
          {days[days.length - 1].score.toFixed(0)}
        </text>
      </svg>
      {h && (
        <div className="np-sans pointer-events-none absolute right-0 top-0 rounded px-2 py-1 text-xs shadow" style={{ background: 'var(--paper)', border: '1px solid var(--paper-rule)' }}>
          <strong>{h.date}</strong> · mood {h.score > 0 ? '+' : ''}{h.score.toFixed(0)} · {h.bull} bullish / {h.bear} bearish mentions
        </div>
      )}
    </div>
  )
}

/**
 * The stock's social desk, laid out like a newspaper page: the mood chart, the social analyst's read, the top
 * stories with links, everything SentiSense counted, and where to join the conversation.
 */
export function SocialDesk({ media, loading, ticker, company, social, date }: { media?: StockMedia; loading: boolean; ticker: string; company: string; social?: string; date: string }) {
  const [more, setMore] = useState(false)
  const articles = media?.articles ?? []
  const docs = media?.social?.docs ?? []
  const days = media?.social?.days ?? []
  const latest = days[days.length - 1]
  const leadText = lead(social)
  const [top, ...rest] = articles
  const shownRest = more ? rest : rest.slice(0, 6)
  const dateline = new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })

  return (
    <section aria-labelledby="desk-heading" className="newsprint rounded-2xl p-5 shadow-sm md:p-8" style={{ border: '1px solid var(--paper-rule)' }}>
      <header className="np-rule border-b-4 border-double pb-3 text-center">
        <div className="np-sans np-muted text-xs uppercase tracking-[0.3em]">The {ticker} Social Desk</div>
        <h2 id="desk-heading" className="mt-1 text-4xl font-bold tracking-tight md:text-5xl" style={{ fontFamily: 'Georgia, serif' }}>
          Word on the Street
        </h2>
        <div className="np-sans np-muted np-rule mt-2 flex flex-wrap justify-center gap-x-4 border-t pt-2 text-xs uppercase tracking-wider">
          <span>{dateline}</span>
          <span>{company}</span>
          {latest && <span>Mood {latest.score > 0 ? '+' : ''}{latest.score.toFixed(0)} · {latest.bull} bulls / {latest.bear} bears</span>}
          <span>{articles.length + docs.length} links</span>
        </div>
      </header>

      {loading && !media && <p className="np-muted py-8 text-center italic">The presses are running: gathering news and social posts…</p>}

      {media && (
        <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            {top && (
              <article className="np-rule border-b pb-4">
                <a href={top.url} target="_blank" rel="noopener noreferrer" className="block text-2xl font-bold leading-tight md:text-3xl" style={{ textDecoration: 'none' }}>
                  {top.title}
                </a>
                <div className="np-sans np-muted mt-1 text-xs uppercase tracking-wide">{top.source}{top.published ? ` · ${fmtDay(top.published)}` : ''}</div>
                {top.description && <p className="mt-2 text-lg leading-relaxed first-letter:float-left first-letter:mr-2 first-letter:text-5xl first-letter:font-bold first-letter:leading-none">{top.description}</p>}
              </article>
            )}

            {leadText.length > 0 && (
              <div className="np-rule border-b pb-4">
                <div className="np-sans np-muted text-xs font-semibold uppercase tracking-widest">From the social analyst · night of {date}</div>
                <p className="mt-2 text-base italic leading-relaxed">{leadText.join(' ')}</p>
              </div>
            )}

            {rest.length > 0 && (
              <div>
                <div className="np-sans np-muted mb-2 text-xs font-semibold uppercase tracking-widest">More stories</div>
                <div className="gap-6 md:columns-2 [column-rule:1px_solid_var(--paper-rule)]">
                  {shownRest.map((a) => (
                    <article key={a.url} className="np-rule mb-4 break-inside-avoid border-b pb-3">
                      <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-lg font-semibold leading-snug" style={{ textDecoration: 'none' }}>{a.title}</a>
                      <div className="np-sans np-muted mt-0.5 text-xs uppercase tracking-wide">{a.source}{a.published ? ` · ${fmtDay(a.published)}` : ''}</div>
                      {a.description && <p className="mt-1 text-sm leading-relaxed">{a.description.slice(0, 180)}{a.description.length > 180 ? '…' : ''}</p>}
                    </article>
                  ))}
                </div>
                {rest.length > 6 && (
                  <button type="button" className="np-sans text-sm underline" onClick={() => setMore(!more)}>{more ? 'Fewer stories' : `All ${rest.length} stories`}</button>
                )}
              </div>
            )}
            {articles.length === 0 && <p className="np-muted italic">{media.articlesError ?? 'No news articles came back for this stock.'}</p>}
          </div>

          <aside className="np-rule space-y-5 lg:border-l lg:pl-6">
            <div>
              <div className="np-sans np-muted text-xs font-semibold uppercase tracking-widest">The mood, day by day</div>
              {days.length ? <MoodChart days={days} /> : <p className="np-muted italic">{media.socialError ?? 'No mood readings.'}</p>}
              <p className="np-sans np-muted text-xs">SentiSense score: bullish minus bearish mentions, −100 to +100.{media.social?.avg7d != null ? ` 7-day average ${media.social.avg7d.toFixed(1)}.` : ''}</p>
            </div>

            {docs.length > 0 && (
              <div>
                <div className="np-sans np-muted np-rule mb-1 border-b pb-1 text-xs font-semibold uppercase tracking-widest">Around the web ({docs.length})</div>
                <ul className="space-y-2">
                  {docs.map((x) => {
                    const st = STANCE[x.stance ?? ''] ?? STANCE.NEUTRAL
                    return (
                      <li key={x.url} className="text-sm leading-snug">
                        <span aria-label={st.word} title={`Read as ${st.word} for ${ticker}`} className="mr-1">{st.mark}</span>
                        <a href={x.url} target="_blank" rel="noopener noreferrer">{x.title}</a>
                        <span className="np-sans np-muted text-xs"> · {x.domain}{x.published ? ` · ${fmtDay(x.published)}` : ''}</span>
                      </li>
                    )
                  })}
                </ul>
                <p className="np-sans np-muted mt-1 text-xs">▲ upbeat ▼ downbeat ● neutral for {ticker}, as SentiSense read it. Titles come from the link addresses.</p>
              </div>
            )}

            <div>
              <div className="np-sans np-muted np-rule mb-2 border-b pb-1 text-xs font-semibold uppercase tracking-widest">On Reddit (newest first, past month)</div>
              <ul className="space-y-1 text-sm">
                {redditSearches(ticker, company).map((l, i) => (
                  <li key={l.label}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer" className={i === 0 ? 'font-bold' : undefined}>{l.label}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="np-sans np-muted np-rule mb-2 border-b pb-1 text-xs font-semibold uppercase tracking-widest">Join the conversation</div>
              <div className="np-sans flex flex-wrap gap-2">
                {socialSearches(ticker, company).map((l) => (
                  <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" className="rounded-full px-3 py-1 text-sm" style={{ border: '1px solid var(--paper-rule)', textDecoration: 'none' }}>
                    {l.label} ↗
                  </a>
                ))}
              </div>
            </div>
          </aside>
        </div>
      )}
      <p className="np-sans np-muted np-rule mt-5 border-t pt-2 text-xs">
        Stories from the news aggregator (Brave, Google News, NewsAPI, Tavily) and SentiSense, gathered {media ? new Date(media.fetchedAt).toLocaleString() : 'now'}; refreshed every few hours. Links open the original sites.
      </p>
    </section>
  )
}
