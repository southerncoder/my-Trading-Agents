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

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const cardStyle = {
  background: 'var(--color-surface, #fff)',
  border: '1px solid var(--color-border, #e2e8f0)',
  borderRadius: 'var(--border-radius-lg, 12px)',
  boxShadow: '0 2px 14px rgba(0,0,0,0.08)',
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
  { name: 'Today', href: '/', icon: Sun, description: 'Latest nightly brief', tint: 'var(--color-primary, #7dd3fc)' },
  { name: 'Picks', href: '/picks', icon: Sparkles, description: 'All buy ideas and triggers', tint: 'var(--color-bull, #00ff88)' },
  { name: 'Portfolios', href: '/portfolios', icon: Briefcase, description: 'Your shadow and owner portfolios', tint: 'var(--color-secondary, #8b5cf6)' },
  { name: 'Reviews', href: '/reviews', icon: BookOpen, description: 'Weekly review notes', tint: 'var(--color-accent, #ff0080)' },
]

function tintHex(tint: string, alpha: number) {
  try {
    const rgb = parseInt(tint.slice(1), 16)
    const r = (rgb >> 16) & 255
    const g = (rgb >> 8) & 255
    const b = rgb & 255
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  } catch {
    return tint
  }
}

function PortfolioCard({ p }: { p: PortfolioSummary }) {
  const isPositive = p.returnPct >= 0
  const tint = isPositive ? 'var(--color-bull, #00ff88)' : 'var(--color-bear, #ff0080)'
  return (
    <div
      className="group relative overflow-hidden rounded-lg p-4 transition-all duration-300 hover:-translate-y-0.5"
      style={{
        ...cardStyle,
        background: `linear-gradient(145deg, color-mix(in srgb, ${tint} 8%, var(--color-surface)) 0%, var(--color-surface) 60%)`,
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-1 opacity-60"
        style={{ background: tint }}
      />
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold">{p.name}</h3>
          <p className="text-xs" style={mutedStyle}>
            {p.kind === 'shadow' ? 'System shadow' : 'Owner portfolio'}
          </p>
        </div>
        <span
          className="text-sm font-bold"
          style={{ color: tint }}
        >
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
  const isBuyNow = pick.label === 'Buy now'
  const tint = isBuyNow ? 'var(--color-bull, #00ff88)' : 'var(--color-primary, #7dd3fc)'
  return (
    <Link
      to="/picks"
      className="group flex items-center justify-between rounded-lg p-3 transition-all duration-200 hover:translate-x-0.5"
      style={cardStyle}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold"
          style={{
            background: tintHex(tint, 0.18),
            color: tint,
            boxShadow: `0 0 12px ${tintHex(tint, 0.25)}`,
          }}
        >
          {pick.ticker.slice(0, 2)}
        </span>
        <div>
          <p className="font-semibold">{pick.ticker}</p>
          <p className="text-xs" style={mutedStyle}>{pick.label}</p>
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

function StatPill({ label, value, hint, color }: { label: string; value: React.ReactNode; hint: string; color: string }) {
  return (
    <div className="relative overflow-hidden rounded-lg p-4" style={cardStyle}>
      <div className="absolute left-0 top-0 h-full w-1" style={{ background: color }} />
      <div className="text-sm" style={mutedStyle}>{label}</div>
      <div className="mt-1 text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-xs" style={mutedStyle}>{hint}</div>
    </div>
  )
}

interface Mover {
  ticker: string
  change_pct: number
}

function MoverTile({ row }: { row: Mover | null }) {
  if (!row) return null
  const color = row.change_pct >= 0 ? 'var(--color-bull, #00ff88)' : 'var(--color-bear, #ff0080)'
  const sign = row.change_pct >= 0 ? '+' : ''
  return (
    <div className="rounded-lg p-4" style={cardStyle}>
      <div className="text-sm" style={mutedStyle}>Biggest overnight mover</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold" style={{ color }}>{row.ticker}</span>
        <span className="text-lg font-semibold" style={{ color }}>
          {sign}{row.change_pct.toFixed(1)}%
        </span>
      </div>
      <div className="text-xs" style={mutedStyle}>since previous close</div>
    </div>
  )
}

export function Dashboard() {
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

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-32 animate-pulse rounded-2xl" style={{ background: 'var(--color-surface)' }} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl" style={{ background: 'var(--color-surface)' }} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-xl" style={{ background: 'var(--color-surface)' }} />
          <div className="h-64 animate-pulse rounded-xl" style={{ background: 'var(--color-surface)' }} />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl p-6" style={{ ...cardStyle, background: 'linear-gradient(135deg, var(--color-surface) 0%, color-mix(in srgb, var(--color-primary, #7dd3fc) 10%, var(--color-surface)) 100%)' }}>
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>
              Dashboard
            </h1>
            <p className="text-lg" style={mutedStyle}>
              At-a-glance view of the latest calls, picks and portfolios
            </p>
          </div>
          <div
            className="flex items-center gap-2 self-start rounded-full px-4 py-2 text-sm font-bold tracking-wide"
            style={{
              borderRadius: '999px',
              border: '1px solid var(--color-border)',
              color:
                health === 'online'
                  ? 'var(--color-bull, #00ff88)'
                  : health === 'offline'
                  ? 'var(--color-bear, #ff0080)'
                  : 'var(--color-text-muted)',
              background:
                health === 'online'
                  ? 'color-mix(in srgb, var(--color-bull, #00ff88) 15%, transparent)'
                  : health === 'offline'
                  ? 'color-mix(in srgb, var(--color-bear, #ff0080) 15%, transparent)'
                  : 'var(--color-surface)',
              boxShadow: health === 'online' ? '0 0 16px color-mix(in srgb, var(--color-bull, #00ff88) 40%, transparent)' : 'none',
            }}
          >
            {health === 'online' ? <CheckCircle2 className="h-4 w-4" /> : health === 'offline' ? <AlertCircle className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
            {health === 'online' ? 'SYSTEM ONLINE' : health === 'offline' ? 'SYSTEM OFFLINE' : 'CHECKING...'}
          </div>
        </div>
      </div>

      {data.error && (
        <div className="rounded-lg border p-4" style={{ borderColor: 'var(--color-bear, #ff0080)', color: 'var(--color-bear, #ff0080)' }}>
          {data.error}
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {QUICK_LINKS.map((item, i) => (
          <Link
            key={item.href}
            to={item.href}
            className="group relative overflow-hidden rounded-xl p-4 transition-all duration-300 hover:-translate-y-1"
            style={{
              ...cardStyle,
              animationDelay: `${i * 80}ms`,
              background: `linear-gradient(145deg, color-mix(in srgb, ${item.tint} 8%, var(--color-surface)) 0%, var(--color-surface) 60%)`,
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-1 opacity-60 transition-all duration-300 group-hover:h-1.5 group-hover:opacity-100"
              style={{ background: item.tint }}
            />
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{item.name}</h3>
                <p className="text-xs" style={mutedStyle}>{item.description}</p>
              </div>
              <div
                className="rounded-full p-2.5 transition-transform duration-300 group-hover:scale-110"
                style={{ background: tintHex(item.tint, 0.15) }}
              >
                <item.icon className="h-5 w-5" style={{ color: item.tint }} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Latest night */}
      {data.day ? (
        <div className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={mutedStyle}>Latest analysis</p>
              <h2 className="text-2xl font-bold">{data.day.date}</h2>
              <p className="text-sm" style={mutedStyle}>
                {data.day.rows.length} stocks · profile: {data.day.profile}
              </p>
            </div>
            <Link
              to="/"
              className="flex items-center gap-1 rounded-full px-4 py-2 text-sm font-semibold transition-all hover:opacity-90"
              style={{ background: 'var(--color-primary)', color: 'var(--color-surface)' }}
            >
              Open full brief <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* Snazzy stat row */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatPill label="Buy now" value={buyNowCount} hint="no trigger needed" color="var(--color-bull, #00ff88)" />
            <StatPill label="Waiting" value={waitingCount} hint="for a price trigger" color="var(--color-primary, #7dd3fc)" />
            <StatPill label="Close to firing" value={data.day.summary.inside_half_day} hint="within half a typical day" color="var(--color-accent, #ff0080)" />
            <MoverTile row={biggestMover} />
          </div>

        </div>
      ) : (
        <div className="rounded-lg p-8 text-center" style={cardStyle}>
          <TrendingUp className="mx-auto mb-3 h-12 w-12" style={mutedStyle} />
          <p className="font-semibold text-lg">No nightly brief yet</p>
          <p className="text-sm" style={mutedStyle}>
            Run <code className="rounded px-1 py-0.5 text-xs" style={{ background: 'var(--color-surface)' }}>tools/nightly-brief.ps1</code> to generate one.
          </p>
        </div>
      )}

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Buy now + waiting */}
        <div className="space-y-8">
          {buyNowRows.length > 0 && (
            <div className="rounded-xl p-4" style={cardStyle}>
              <div className="mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4" style={{ color: 'var(--color-bull, #00ff88)' }} />
                <h2 className="font-bold">Buy now</h2>
              </div>
              <BuyNowList rows={buyNowRows.slice(0, 5)} />
            </div>
          )}
          {waitingRows.length > 0 && (
            <div className="rounded-xl p-4" style={cardStyle}>
              <div className="mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" style={{ color: 'var(--color-primary, #7dd3fc)' }} />
                <h2 className="font-bold">Closest to trigger</h2>
              </div>
              <TriggerTable rows={waitingRows.slice(0, 6)} />
            </div>
          )}
          {buyNowRows.length === 0 && waitingRows.length === 0 && data.day && (
            <div className="rounded-xl p-8 text-center" style={cardStyle}>
              <Sun className="mx-auto mb-3 h-10 w-10" style={mutedStyle} />
              <p className="font-semibold">No trade actions tonight</p>
              <p className="text-sm" style={mutedStyle}>Every stock is on hold. Check the full brief for details.</p>
            </div>
          )}
        </div>

        {/* Portfolios + recent picks */}
        <div className="space-y-8">
          <div className="rounded-xl p-4" style={cardStyle}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" style={{ color: 'var(--color-secondary, #8b5cf6)' }} />
                <h2 className="font-bold">Portfolios</h2>
              </div>
              <Link to="/portfolios" className="flex items-center gap-1 text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                Manage <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            {data.portfolios.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {data.portfolios.map((p) => (
                  <Link key={p.id} to={`/portfolios/${p.id}`}>
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
                  <Activity className="h-4 w-4" style={{ color: 'var(--color-bull, #00ff88)' }} />
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
