import { NightCharts } from '../components/today/NightCharts'
import { useName } from '../components/brandStore'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sun,
  Sparkles,
  Briefcase,
  BookOpen,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Activity,
  Zap,
  Target,
  BarChart3,
} from 'lucide-react'
import { fetchLatestNight, fetchNightDates, type NightlyDay } from '../services/nightly'
import { fetchPortfolios, fetchPicks, type PortfolioSummary, type Pick } from '../services/portfolio'
import { BuyNowList } from '../components/today/BuyNowList'
import { TriggerTable } from '../components/today/TriggerTable'
import { MacroPanel } from '../components/today/MacroPanel'
import { useTheme } from '../contexts/ThemeContext'
import { kindInfo } from '../components/portfolio/helpers'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const cardStyle = {
  background: 'var(--color-surface, #fff)',
  border: '1px solid var(--color-border, #e2e8f0)',
  borderRadius: 'var(--border-radius-lg, 12px)',
  boxShadow: '0 2px 14px rgba(0,0,0,0.06)',
}

const mutedStyle = { color: 'var(--color-text-muted, #64748b)' }

interface DashboardData {
  day: NightlyDay | null
  dates: string[]
  portfolios: PortfolioSummary[]
  picks: Pick[]
  error: string | null
}

type HealthState = 'checking' | 'online' | 'offline'

const QUICK_LINKS = [
  { name: 'Today', href: '/', icon: Sun, description: 'Latest brief' },
  { name: 'Picks', href: '/picks', icon: Sparkles, description: 'All ideas' },
  { name: 'Portfolios', href: '/portfolios', icon: Briefcase, description: 'Portfolios' },
  { name: 'Reviews', href: '/reviews', icon: BookOpen, description: 'Weekly notes' },
]

function rgba(hex: string, alpha: number) {
  try {
    const rgb = parseInt(hex.replace('#', ''), 16)
    const r = (rgb >> 16) & 255
    const g = (rgb >> 8) & 255
    const b = rgb & 255
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  } catch {
    return hex
  }
}

function PortfolioCard({ p }: { p: PortfolioSummary }) {
  const { theme } = useTheme()
  const isPositive = p.returnPct >= 0
  const tint = isPositive ? theme.colors.bull : theme.colors.bear
  return (
    <div
      className="clickable group relative overflow-hidden rounded-xl p-4"
      style={{
        ...cardStyle,
        background: `linear-gradient(145deg, ${rgba(tint, 0.08)} 0%, var(--color-surface) 55%)`,
      }}
    >
      <div className="absolute inset-x-0 top-0 h-1" style={{ background: tint }} />
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold">{p.name}</h3>
          <p className="text-xs" style={mutedStyle}>
            {kindInfo(p.kind).label}
          </p>
        </div>
        <span className="text-sm font-bold" style={{ color: tint }}>
          {isPositive ? '+' : ''}
          {p.returnPct.toFixed(2)}%
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs" style={mutedStyle}>Equity</p>
          <p className="font-semibold">${p.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div>
          <p className="text-xs" style={mutedStyle}>Open</p>
          <p className="font-semibold">{p.openPositions}</p>
        </div>
        <div>
          <p className="text-xs" style={mutedStyle}>Cash</p>
          <p className="font-semibold">${p.cash.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div>
          <p className="text-xs" style={mutedStyle}>Pending</p>
          <p className="font-semibold">{p.pendingOrders}</p>
        </div>
      </div>
    </div>
  )
}

function RecentPickRow({ pick }: { pick: Pick }) {
  const { theme } = useTheme()
  const isBuyNow = pick.label === 'Buy now'
  const tint = isBuyNow ? theme.colors.bull : theme.colors.primary
  return (
    <Link
      to={`/stock/${encodeURIComponent(pick.ticker)}`}
      title={`Open ${pick.ticker}`}
      className="clickable group flex items-center justify-between rounded-xl p-3"
      style={cardStyle}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
          style={{
            background: rgba(tint, 0.15),
            color: tint,
          }}
        >
          {pick.ticker.slice(0, 2)}
        </span>
        <div>
          <p className="font-semibold">{pick.ticker}</p>
          <p className="text-xs" style={mutedStyle}>{pick.label}{pick.company ? ` · ${pick.company}` : ''}</p>
        </div>
      </div>
      <div className="text-right">
        <span className="block text-sm font-semibold" style={{ color: tint }}>
          {pick.confidence != null ? `${(pick.confidence * 100).toFixed(0)}%` : ''}
        </span>
        <span className="text-xs" style={mutedStyle}>confidence</span>
      </div>
    </Link>
  )
}

function StatPill({ label, value, hint, color, to }: { label: string; value: React.ReactNode; hint: string; color: string; to: string }) {
  return (
    <Link to={to} className="clickable group relative block overflow-hidden rounded-xl p-4" style={cardStyle}>
      <div className="absolute left-0 top-0 h-full w-1" style={{ background: color }} />
      <div className="flex items-center justify-between text-sm" style={mutedStyle}>
        {label}
        <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
      </div>
      <div className="mt-1 text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs" style={mutedStyle}>{hint}</div>
    </Link>
  )
}

interface Mover {
  ticker: string
  change_pct: number
}

function MoverTile({ row }: { row: Mover | null }) {
  const { theme } = useTheme()
  if (!row) return null
  const color = row.change_pct >= 0 ? theme.colors.bull : theme.colors.bear
  const sign = row.change_pct >= 0 ? '+' : ''
  return (
    <Link
      to={`/stock/${encodeURIComponent(row.ticker)}`}
      title={`Open ${row.ticker}`}
      className="clickable group block rounded-xl p-4"
      style={cardStyle}
    >
      <div className="flex items-center justify-between text-sm" style={mutedStyle}>
        Biggest overnight mover
        <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold" style={{ color }}>{row.ticker}</span>
        <CompanyName ticker={row.ticker} />
        <span className="text-lg font-semibold" style={{ color }}>
          {sign}{row.change_pct.toFixed(1)}%
        </span>
      </div>
      <div className="text-xs" style={mutedStyle}>since previous close</div>
    </Link>
  )
}

function EmptyState({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl p-8 text-center" style={cardStyle}>
      <Icon className="mx-auto mb-3 h-10 w-10" style={mutedStyle} />
      <p className="font-semibold">{title}</p>
      <p className="text-sm" style={mutedStyle}>{children}</p>
    </div>
  )
}

export function Dashboard() {
  const { theme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [health, setHealth] = useState<HealthState>('checking')
  const [data, setData] = useState<DashboardData>({
    day: null,
    dates: [],
    portfolios: [],
    picks: [],
    error: null,
  })

  useEffect(() => {
    let cancelled = false
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/health`)
        const body = await res.json()
        const online =
          res.ok &&
          (body?.success === true || body?.status === 'healthy' || body?.data?.status === 'online')
        setHealth(online ? 'online' : 'offline')
      } catch {
        setHealth('offline')
      }
    }
    checkHealth()
    const timer = window.setInterval(checkHealth, 60_000)

    const load = async () => {
      try {
        const [day, dates, portfolios, picksData] = await Promise.allSettled([
          fetchLatestNight(),
          fetchNightDates(),
          fetchPortfolios(),
          fetchPicks(),
        ])
        if (cancelled) return
        setData({
          day: day.status === 'fulfilled' ? day.value : null,
          dates: dates.status === 'fulfilled' ? dates.value : [],
          portfolios: portfolios.status === 'fulfilled' ? portfolios.value : [],
          picks: picksData.status === 'fulfilled' ? picksData.value.picks : [],
          error: day.status === 'rejected' ? 'Could not load the latest nightly brief.' : null,
        })
      } catch (_err) {
        if (!cancelled) setData((d) => ({ ...d, error: 'Failed to load dashboard data.' }))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()

    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [])

  const buyNowRows = useMemo(() => data.day?.rows.filter((r) => r.label === 'Buy now') ?? [], [data.day])
  const waitingRows = useMemo(() => data.day?.rows.filter((r) => r.label !== 'Buy now') ?? [], [data.day])
  const recentPicks = useMemo(() => data.picks.slice(0, 5), [data.picks])
  const biggestMover = useMemo(() => data.day?.summary.biggest_mover ?? null, [data.day])
  const buyNowCount = buyNowRows.length
  const waitingCount = waitingRows.length

  const mood = useMemo(() => {
    if (!data.day) return ''
    if (buyNowCount >= 5) return 'The model is active tonight — several stocks look ready to buy.'
    if (buyNowCount > 0) return 'A few stocks are clear enough to buy now; most are waiting for proof.'
    if (waitingCount > 0) return 'The model is cautious: no immediate buys, but several are close to their triggers.'
    return 'The model is sitting on its hands tonight.'
  }, [data.day, buyNowCount, waitingCount])

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-32 animate-pulse rounded-2xl" style={{ background: 'var(--color-surface)' }} />
        <div className="h-12 animate-pulse rounded-xl" style={{ background: 'var(--color-surface)' }} />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-xl" style={{ background: 'var(--color-surface)' }} />
          <div className="h-64 animate-pulse rounded-xl" style={{ background: 'var(--color-surface)' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="app-page mx-auto max-w-6xl space-y-8 p-3 sm:p-4 md:p-8">
      {/* Header */}
      <div
        className="relative overflow-hidden rounded-2xl p-6"
        style={{
          ...cardStyle,
          background: `linear-gradient(135deg, var(--color-surface) 0%, ${rgba(theme.colors.primary, 0.1)} 100%)`,
        }}
      >
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
              Dashboard
            </h1>
            <p className="text-lg" style={mutedStyle}>
              At-a-glance view of the latest calls, picks and portfolios
            </p>
          </div>
          <Link
            to="/platform"
            title="Service status"
            className="clickable flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-bold tracking-wide"
            style={{
              border: '1px solid var(--color-border)',
              color: health === 'online' ? theme.colors.bull : health === 'offline' ? theme.colors.bear : 'var(--color-text-muted)',
              background: health === 'online' ? rgba(theme.colors.bull, 0.12) : health === 'offline' ? rgba(theme.colors.bear, 0.12) : 'var(--color-surface)',
              boxShadow: health === 'online' ? `0 0 14px ${rgba(theme.colors.bull, 0.35)}` : 'none',
            }}
          >
            {health === 'online' ? <CheckCircle2 className="h-4 w-4" /> : health === 'offline' ? <AlertCircle className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
            {health === 'online' ? 'SYSTEM ONLINE' : health === 'offline' ? 'SYSTEM OFFLINE' : 'CHECKING...'}
          </Link>
        </div>
      </div>

      {data.error && (
        <div className="rounded-lg border p-4" style={{ borderColor: theme.colors.bear, color: theme.colors.bear }}>
          {data.error}
        </div>
      )}

      {/* Quick links toolbar */}
      <div className="flex flex-wrap gap-3">
        {QUICK_LINKS.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="group flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200 hover:scale-105"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
          >
            <item.icon className="h-4 w-4" style={{ color: theme.colors.primary }} />
            <span>{item.name}</span>
            <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" style={{ color: theme.colors.primary }} />
          </Link>
        ))}
      </div>

      {/* Latest night */}
      {data.day ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={mutedStyle}>Latest analysis</p>
              <h2 className="text-2xl font-bold">
                <Link to="/" className="hover:underline">{data.day.date}</Link>
              </h2>
              <p className="text-sm" style={mutedStyle}>
                <Link to="/stocks" className="underline decoration-dotted underline-offset-2 hover:decoration-solid">
                  {data.day.rows.length} stocks analyzed
                </Link>{' '}
                · profile: {data.day.profile}
              </p>
              <p className="mt-1 max-w-2xl text-sm" style={{ color: 'var(--color-text-secondary)' }}>{mood}</p>
            </div>
            <Link
              to="/"
              className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: 'var(--color-primary)', color: 'var(--color-surface)' }}
            >
              Open full brief <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Stat row */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatPill label="Buy now" value={buyNowCount} hint="no trigger needed" color={theme.colors.bull} to={buyNowCount ? '/#buy-now' : '/picks'} />
            <StatPill label="Waiting" value={waitingCount} hint="for a price trigger" color={theme.colors.primary} to="/#waiting" />
            <StatPill label="Close to firing" value={data.day.summary.inside_half_day} hint="within half a typical day" color={theme.colors.accent} to="/#waiting" />
            <MoverTile row={biggestMover} />
          </div>
          <NightCharts day={data.day} />
          <MacroPanel date={data.day.date} />
        </div>
      ) : (
        <EmptyState icon={TrendingUp} title="No nightly brief yet">
          Run <code className="rounded px-1 py-0.5 text-xs" style={{ background: 'var(--color-surface)' }}>tools/nightly-brief.ps1</code> to generate one.
        </EmptyState>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Buy now + waiting */}
        <div className="space-y-8">
          {buyNowRows.length > 0 && (
            <div className="rounded-xl p-4" style={cardStyle}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4" style={{ color: theme.colors.bull }} />
                  <h2 className="font-bold">Buy now</h2>
                </div>
                <Link to="/#buy-now" className="flex items-center gap-1 text-sm font-semibold hover:underline" style={{ color: 'var(--color-primary)' }}>
                  All {buyNowCount} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <BuyNowList rows={buyNowRows.slice(0, 5)} compact />
            </div>
          )}
          {waitingRows.length > 0 && (
            <div className="rounded-xl p-4" style={cardStyle}>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" style={{ color: theme.colors.primary }} />
                  <h2 className="font-bold">Closest to trigger</h2>
                </div>
                <Link to="/#waiting" className="flex items-center gap-1 text-sm font-semibold hover:underline" style={{ color: 'var(--color-primary)' }}>
                  All {waitingCount} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <TriggerTable rows={waitingRows.slice(0, 6)} compact />
            </div>
          )}
          {buyNowRows.length === 0 && waitingRows.length === 0 && data.day && (
            <EmptyState icon={Sun} title="No trade actions tonight">
              Every stock is on hold. Check the full brief for details.
            </EmptyState>
          )}
        </div>

        {/* Portfolios + recent picks */}
        <div className="space-y-8">
          <div className="rounded-xl p-4" style={cardStyle}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" style={{ color: theme.colors.secondary }} />
                <h2 className="font-bold">Portfolios</h2>
              </div>
              <Link to="/portfolios" className="flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                Manage <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {data.portfolios.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {data.portfolios.map((p) => (
                  <Link key={p.id} to={`/portfolios/${p.id}`} className="block rounded-xl" title={`Open ${p.name}`}>
                    <PortfolioCard p={p} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={mutedStyle}>No portfolios found.</p>
            )}
          </div>

          {recentPicks.length > 0 && (
            <div className="rounded-xl p-4" style={cardStyle}>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" style={{ color: theme.colors.bull }} />
                  <h2 className="font-bold">Recent picks</h2>
                </div>
                <Link to="/picks" className="flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                  All picks <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="space-y-2">
                {recentPicks.map((pick) => (
                  <RecentPickRow key={pick.id} pick={pick} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function CompanyName({ ticker }: { ticker: string }) {
  const name = useName(ticker)
  return name ? <span className="truncate text-sm" style={{ color: 'var(--color-text-muted, #64748b)' }}>{name}</span> : null
}
