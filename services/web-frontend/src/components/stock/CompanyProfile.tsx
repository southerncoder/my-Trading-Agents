import { useState } from 'react'
import { Building2, ExternalLink, FileText, Globe, MapPin, Phone, Users, Warehouse } from 'lucide-react'
import type { StockExtras } from '../../services/nightly'
import { card, muted } from '../today/format'
import { compactMoney } from './charts'

const pct = (n?: number | null, digits = 1) => (n == null ? null : `${(n * 100).toFixed(digits)}%`)
const num = (n?: number | null, digits = 1) => (n == null ? null : n.toFixed(digits))

function Stat({ label, value, hint }: { label: string; value: string | null; hint?: string }) {
  if (value === null) return null
  return (
    <div className="min-w-0 rounded-xl p-3" style={{ border: '1px solid var(--color-border, #e2e8f0)' }} title={hint}>
      <div className="text-sm" style={muted}>{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  )
}

function Row({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--color-primary, #2563eb)' }} aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

const host = (url: string) => url.replace(/^https?:\/\//, '').replace(/\/$/, '')

/**
 * Who the company is: headquarters on a map, leadership, size and valuation (Yahoo Finance, today's figures),
 * registration facts and the Properties section of its latest 10-K (SEC, as filed by the night shown).
 */
export function CompanyProfile({ data }: { data: StockExtras }) {
  const p = data.profile
  const sec = data.fundamentals?.company
  const props = data.properties
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [propsOpen, setPropsOpen] = useState(false)
  if (!p && !sec && !props) return null

  const hq = p ? [p.address, p.city, p.state, p.country].filter(Boolean).join(', ') : sec?.businessAddress ?? ''
  const mapQuery = hq || p?.name || data.fundamentals?.name || ''
  const summary = p?.summary ?? ''
  const longSummary = summary.length > 420

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="space-y-5 rounded-2xl p-5 md:p-6" style={card}>
        <div>
          <div className="text-2xl font-bold">{p?.name ?? data.fundamentals?.name}</div>
          <div className="mt-1 flex flex-wrap gap-2 text-sm">
            {[p?.exchange, p?.sector, p?.industry].filter(Boolean).map((t) => (
              <span key={t} className="rounded-full px-3 py-1" style={{ border: '1px solid var(--color-border, #cbd5e1)' }}>{t}</span>
            ))}
          </div>
        </div>

        {summary && (
          <div>
            <p className="text-base leading-relaxed">{longSummary && !summaryOpen ? `${summary.slice(0, 420).replace(/\s+\S*$/, '')}…` : summary}</p>
            {longSummary && (
              <button type="button" className="mt-1 text-sm underline" onClick={() => setSummaryOpen(!summaryOpen)}>
                {summaryOpen ? 'Show less' : 'Read the full description'}
              </button>
            )}
          </div>
        )}

        <div className="grid gap-3 text-base sm:grid-cols-2">
          {hq && (
            <Row icon={MapPin}>
              <div className="text-sm" style={muted}>Headquarters</div>
              {hq}
            </Row>
          )}
          {p?.employees != null && (
            <Row icon={Users}>
              <div className="text-sm" style={muted}>Full-time employees</div>
              {p.employees.toLocaleString('en-US')}
            </Row>
          )}
          {(p?.website || p?.irWebsite) && (
            <Row icon={Globe}>
              <div className="text-sm" style={muted}>Websites</div>
              <div className="flex flex-col">
                {p?.website && <a className="truncate underline" href={p.website} target="_blank" rel="noopener noreferrer">{host(p.website)}</a>}
                {p?.irWebsite && <a className="truncate underline" href={p.irWebsite} target="_blank" rel="noopener noreferrer">Investor relations</a>}
              </div>
            </Row>
          )}
          {p?.phone && (
            <Row icon={Phone}>
              <div className="text-sm" style={muted}>Phone</div>
              {p.phone}
            </Row>
          )}
          {sec && (
            <Row icon={Building2}>
              <div className="text-sm" style={muted}>Registered with the SEC</div>
              {[sec.incorporatedIn && `Incorporated in ${sec.incorporatedIn}`, sec.fiscalYearEnd && `fiscal year ends ${sec.fiscalYearEnd}`, sec.filerCategory]
                .filter(Boolean)
                .join(' · ')}
              {sec.formerNames.length > 0 && (
                <div className="text-sm" style={muted}>Formerly {sec.formerNames.slice(0, 3).map((f) => `${f.name}${f.to ? ` (until ${f.to.slice(0, 4)})` : ''}`).join(', ')}</div>
              )}
            </Row>
          )}
        </div>

        {p && p.officers.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold uppercase tracking-wide" style={muted}>Leadership</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {p.officers.map((o) => (
                <div key={o.name} className="rounded-xl p-3" style={{ border: '1px solid var(--color-border, #e2e8f0)' }}>
                  <div className="font-semibold">{o.name}</div>
                  <div className="text-sm" style={muted}>{o.title}{o.age ? ` · age ${o.age}` : ''}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {p && (
          <div className="space-y-2">
            <div className="text-sm font-semibold uppercase tracking-wide" style={muted}>Size and valuation (today)</div>
            <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2 md:grid-cols-[repeat(4,minmax(0,1fr))]">
              <Stat label="Market value" value={p.marketCap != null ? compactMoney(p.marketCap) : null} hint="Share price times shares outstanding." />
              <Stat label="Price / earnings" value={num(p.trailingPE)} hint="Price divided by the last 12 months' earnings per share. Higher means investors pay more for each dollar of profit." />
              <Stat label="Forward P/E" value={num(p.forwardPE)} hint="Price divided by analysts' expected earnings for the next 12 months." />
              <Stat label="Dividend yield" value={pct(p.dividendYield, 2)} hint="Yearly dividend as a share of the price." />
              <Stat label="Profit margin" value={pct(p.profitMargin)} hint="Share of revenue kept as profit over the last 12 months." />
              <Stat label="Beta" value={num(p.beta, 2)} hint="How much the stock tends to move with the market: 1 moves with it, below 1 moves less." />
              <Stat label="52-week range" value={p.low52 != null && p.high52 != null ? `$${p.low52.toFixed(0)}–$${p.high52.toFixed(0)}` : null} />
              <Stat label="Held by institutions" value={pct(p.institutionsPct, 0)} hint="Share of stock held by funds, banks and other institutions." />
              <Stat label="Held by insiders" value={pct(p.insidersPct, 1)} />
              <Stat label="Sold short" value={pct(p.shortPctFloat, 1)} hint="Share of tradable stock borrowed and sold by people betting the price falls." />
              <Stat label="Next earnings" value={p.nextEarnings ?? null} />
              <Stat label="Ex-dividend" value={p.exDividend ?? null} hint="Buy before this date to receive the next dividend." />
            </div>
            <p className="text-xs" style={muted}>Profile and figures from Yahoo Finance as of today, not as of the night shown.</p>
          </div>
        )}
      </div>

      <div className="space-y-5">
        {mapQuery && (
          <div className="overflow-hidden rounded-2xl" style={card}>
            <iframe
              title={`Map of ${p?.name ?? 'the company'} headquarters`}
              src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=13&output=embed`}
              className="block h-72 w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <div className="flex items-center justify-between gap-2 px-4 py-3 text-sm">
              <span className="truncate" style={muted}>Headquarters</span>
              <a className="inline-flex shrink-0 items-center gap-1 underline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`} target="_blank" rel="noopener noreferrer">
                Open in Google Maps <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        )}

        {props && (
          <div className="space-y-3 rounded-2xl p-5" style={card}>
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Warehouse className="h-5 w-5" style={{ color: 'var(--color-primary, #2563eb)' }} aria-hidden="true" /> Properties and assets
            </div>
            <p className="text-sm" style={muted}>
              Where the company says its offices, plants, data centers, stores and other facilities are: Item 2 of its {props.form} filed {props.filed}, quoted.
            </p>
            <div className={`relative whitespace-pre-line text-base leading-relaxed ${propsOpen ? '' : 'max-h-72 overflow-hidden'}`}>
              {props.text}
              {!propsOpen && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16" style={{ background: 'linear-gradient(transparent, var(--color-surface, #fff))' }} />}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <button type="button" className="underline" onClick={() => setPropsOpen(!propsOpen)}>{propsOpen ? 'Show less' : 'Show all'}</button>
              <a className="inline-flex items-center gap-1 underline" href={props.url} target="_blank" rel="noopener noreferrer">
                <FileText className="h-4 w-4" aria-hidden="true" /> Read the {props.form} on EDGAR
              </a>
              {props.truncated && <span style={muted}>Long section: the rest is in the filing.</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
