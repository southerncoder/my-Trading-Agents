import { ReactNode, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { MoreHorizontal, Palette, TrendingUp } from 'lucide-react'
import { ThemeSelector } from './ThemeSelector'
import { MORE, PRIMARY, isActive, type NavItem } from './nav'

interface LayoutProps {
  children: ReactNode
}

type ApiState = 'checking' | 'connected' | 'unreachable'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

/** Really asks the API whether it is up, now and once a minute. */
function useApiState(): ApiState {
  const [state, setState] = useState<ApiState>('checking')
  useEffect(() => {
    let stopped = false
    const check = () => {
      fetch(`${API_BASE_URL}/health`)
        .then((r) => !stopped && setState(r.ok ? 'connected' : 'unreachable'))
        .catch(() => !stopped && setState('unreachable'))
    }
    check()
    const timer = window.setInterval(check, 60_000)
    return () => {
      stopped = true
      window.clearInterval(timer)
    }
  }, [])
  return state
}

const border = '1px solid var(--color-border, #e2e8f0)'

function TopLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      to={item.href}
      aria-current={active ? 'page' : undefined}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors"
      style={{
        color: active ? 'var(--color-surface, #0b1220)' : 'var(--color-text-secondary, inherit)',
        background: active ? 'var(--color-primary)' : 'transparent',
      }}
    >
      <item.icon style={{ width: '1rem', height: '1rem' }} aria-hidden="true" />
      {item.name}
    </Link>
  )
}

export function Layout({ children }: LayoutProps) {
  const { pathname } = useLocation()
  const [themeOpen, setThemeOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const api = useApiState()
  const moreActive = MORE.some((m) => isActive(pathname, m.href))

  useEffect(() => {
    setMoreOpen(false)
    setThemeOpen(false)
  }, [pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMoreOpen(false)
        setThemeOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const moreMenu = (
    <ul className="space-y-1" aria-label="More pages">
      {MORE.map((item) => (
        <li key={item.href}>
          <Link
            to={item.href}
            aria-current={isActive(pathname, item.href) ? 'page' : undefined}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm"
            style={{ color: isActive(pathname, item.href) ? 'var(--color-primary)' : 'inherit' }}
          >
            <item.icon style={{ width: '1rem', height: '1rem' }} aria-hidden="true" />
            {item.name}
          </Link>
        </li>
      ))}
    </ul>
  )

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="sticky top-0 z-40"
        style={{ background: 'var(--color-surface, #0b1220)', borderBottom: border }}
      >
        <div className="container flex items-center justify-between gap-4" style={{ minHeight: '3.5rem' }}>
          <Link to="/" className="flex items-center gap-2" aria-label="TradingAgents home">
            <span
              className="flex items-center justify-center rounded-lg"
              style={{ background: 'var(--color-primary)', width: '2rem', height: '2rem' }}
            >
              <TrendingUp style={{ color: 'var(--color-surface)', width: '1.1rem', height: '1.1rem' }} aria-hidden="true" />
            </span>
            <span className="font-bold" style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.95rem' }}>
              TradingAgents
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            {PRIMARY.map((item) => (
              <TopLink key={item.href} item={item} active={isActive(pathname, item.href)} />
            ))}
            <div className="relative">
              <button
                type="button"
                aria-expanded={moreOpen}
                aria-haspopup="true"
                onClick={() => {
                  setMoreOpen(!moreOpen)
                  setThemeOpen(false)
                }}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium"
                style={{ color: moreActive || moreOpen ? 'var(--color-primary)' : 'var(--color-text-secondary, inherit)' }}
              >
                <MoreHorizontal style={{ width: '1rem', height: '1rem' }} aria-hidden="true" />
                More
              </button>
              {moreOpen && (
                <div
                  className="absolute right-0 z-50 mt-2 w-48 rounded-lg p-2"
                  style={{ background: 'var(--color-surface, #0b1220)', border }}
                >
                  {moreMenu}
                </div>
              )}
            </div>
          </nav>

          <div className="relative">
            <button
              type="button"
              aria-label="Change theme"
              aria-expanded={themeOpen}
              onClick={() => {
                setThemeOpen(!themeOpen)
                setMoreOpen(false)
              }}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
              style={{ color: themeOpen ? 'var(--color-primary)' : 'var(--color-text-secondary, inherit)', border }}
            >
              <Palette style={{ width: '1.1rem', height: '1.1rem' }} aria-hidden="true" />
              Theme
            </button>
            {themeOpen && (
              <div className="card absolute right-0 z-50 mt-2" style={{ minWidth: '14rem', maxWidth: '90vw' }}>
                <ThemeSelector />
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container flex-1" style={{ paddingTop: 'clamp(0.75rem, 3vw, 2rem)', paddingBottom: 'clamp(0.75rem, 3vw, 2rem)' }}>
        {children}
      </main>

      <footer style={{ borderTop: border }}>
        <div
          className="container flex flex-wrap items-center justify-between gap-x-6 gap-y-1 pb-24 pt-4 text-xs lg:pb-4"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span>Paper trading only. Not investment advice.</span>
          <span role="status">
            API:{' '}
            <span style={{ color: api === 'connected' ? '#0A8F80' : api === 'unreachable' ? '#D4501A' : undefined }}>
              {api === 'checking' ? 'checking...' : api === 'connected' ? 'connected' : 'not reachable'}
            </span>
          </span>
        </div>
      </footer>

      {/* Phone and tablet: tab bar pinned to the bottom, thumb-reachable. */}
      {moreOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setMoreOpen(false)}
        />
      )}
      <div className="lg:hidden">
        {moreOpen && (
          <div
            className="fixed inset-x-3 z-50 rounded-lg p-2"
            style={{ bottom: 'calc(4.25rem + env(safe-area-inset-bottom))', background: 'var(--color-surface, #0b1220)', border }}
          >
            {moreMenu}
          </div>
        )}
        <nav
          aria-label="Main"
          className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5"
          style={{
            backgroundColor: '#0b1220',
            backgroundImage: 'linear-gradient(var(--color-surface, #0b1220), var(--color-surface, #0b1220))',
            borderTop: border,
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {PRIMARY.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                to={item.href}
                aria-current={active ? 'page' : undefined}
                className="flex flex-col items-center justify-center gap-1 py-2 text-xs"
                style={{ minHeight: '3.5rem', color: active ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: active ? 600 : 400 }}
              >
                <item.icon style={{ width: '1.25rem', height: '1.25rem' }} aria-hidden="true" />
                {item.name}
              </Link>
            )
          })}
          <button
            type="button"
            aria-expanded={moreOpen}
            aria-haspopup="true"
            onClick={() => {
              setMoreOpen(!moreOpen)
              setThemeOpen(false)
            }}
            className="flex flex-col items-center justify-center gap-1 py-2 text-xs"
            style={{ minHeight: '3.5rem', color: moreActive || moreOpen ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: moreActive ? 600 : 400 }}
          >
            <MoreHorizontal style={{ width: '1.25rem', height: '1.25rem' }} aria-hidden="true" />
            More
          </button>
        </nav>
      </div>
    </div>
  )
}
