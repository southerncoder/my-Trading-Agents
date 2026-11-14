import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  BarChart3, 
  TrendingUp, 
  History, 
  Settings,
  Activity,
  Search,
  Palette
} from 'lucide-react'
import { clsx } from 'clsx'
import { ThemeSelector } from './ThemeSelector'

interface LayoutProps {
  children: ReactNode
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Analysis', href: '/analysis', icon: TrendingUp },
  { name: 'Backtesting', href: '/backtesting', icon: Activity },
  { name: 'History', href: '/history', icon: History },
]

export function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const [showThemeSelector, setShowThemeSelector] = useState(false)

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="card" style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderTop: 0 }}>
        <div className="container">
          <div className="flex justify-between items-center" style={{ minHeight: 'clamp(3.5rem, 8vw, 4rem)' }}>
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="flex items-center transition-all duration-300 hover:scale-105" style={{ gap: 'clamp(0.5rem, 2vw, 0.75rem)' }}>
                <div 
                  className="rounded-lg flex items-center justify-center" 
                  style={{ 
                    background: 'var(--color-primary)',
                    width: 'clamp(2rem, 6vw, 2.5rem)',
                    height: 'clamp(2rem, 6vw, 2.5rem)'
                  }}
                >
                  <TrendingUp 
                    style={{ 
                      color: 'var(--color-surface)',
                      width: 'clamp(1rem, 3vw, 1.5rem)',
                      height: 'clamp(1rem, 3vw, 1.5rem)'
                    }} 
                  />
                </div>
                <span 
                  className="font-bold" 
                  style={{ 
                    color: 'var(--color-primary)', 
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'clamp(0.875rem, 3vw, 1.125rem)'
                  }}
                >
                  TradingAgents
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex" style={{ gap: 'clamp(0.75rem, 2vw, 1.5rem)' }}>
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || 
                  (item.href !== '/' && location.pathname.startsWith(item.href))
                
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={clsx(
                      'flex items-center transition-all duration-300',
                      isActive ? 'btn-primary' : 'btn-secondary'
                    )}
                    style={{ 
                      fontFamily: 'var(--font-secondary)',
                      borderRadius: 'var(--border-radius-md)',
                      gap: '0.5rem',
                      fontSize: 'clamp(0.75rem, 1.5vw, 0.875rem)',
                      padding: 'clamp(0.5rem, 1.5vw, 0.75rem) clamp(0.75rem, 2vw, 1rem)'
                    }}
                  >
                    <item.icon style={{ width: '1rem', height: '1rem' }} />
                    <span>/{item.name.toLowerCase()}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Actions */}
            <div className="flex items-center" style={{ gap: 'clamp(0.5rem, 1.5vw, 0.75rem)' }}>
              {/* Search - Hidden on mobile */}
              <button 
                className="hidden sm:block p-2 transition-all duration-300 rounded-lg"
                style={{ 
                  color: 'var(--color-text-muted)',
                  borderRadius: 'var(--border-radius-md)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
              >
                <Search style={{ width: 'clamp(1rem, 2.5vw, 1.25rem)', height: 'clamp(1rem, 2.5vw, 1.25rem)' }} />
              </button>
              
              {/* Theme Selector */}
              <div className="relative">
                <button 
                  onClick={() => setShowThemeSelector(!showThemeSelector)}
                  className="p-2 transition-all duration-300 rounded-lg"
                  style={{ 
                    color: showThemeSelector ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    borderRadius: 'var(--border-radius-md)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = showThemeSelector ? 'var(--color-primary)' : 'var(--color-text-muted)'}
                >
                  <Palette style={{ width: 'clamp(1rem, 2.5vw, 1.25rem)', height: 'clamp(1rem, 2.5vw, 1.25rem)' }} />
                </button>
                {showThemeSelector && (
                  <div 
                    className="absolute right-0 z-50 card" 
                    style={{ 
                      top: 'clamp(2.5rem, 6vw, 3rem)',
                      minWidth: 'clamp(180px, 40vw, 220px)',
                      maxWidth: '90vw'
                    }}
                  >
                    <ThemeSelector />
                  </div>
                )}
              </div>
              
              {/* Settings - Hidden on small mobile */}
              <button 
                className="hidden xs:block p-2 transition-all duration-300 rounded-lg"
                style={{ 
                  color: 'var(--color-text-muted)',
                  borderRadius: 'var(--border-radius-md)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted)'}
              >
                <Settings style={{ width: 'clamp(1rem, 2.5vw, 1.25rem)', height: 'clamp(1rem, 2.5vw, 1.25rem)' }} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile/Tablet navigation */}
      <nav className="lg:hidden card" style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderBottom: 0 }}>
        <div style={{ padding: 'clamp(0.75rem, 2vw, 1rem)' }}>
          <div className="flex mobile-nav-scroll" style={{ gap: 'clamp(0.5rem, 1.5vw, 0.75rem)', overflowX: 'auto' }}>
            {navigation.map((item) => {
              const isActive = location.pathname === item.href || 
                (item.href !== '/' && location.pathname.startsWith(item.href))
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'flex items-center font-medium transition-all duration-300 whitespace-nowrap',
                    isActive ? 'btn-primary' : 'btn-secondary'
                  )}
                  style={{ 
                    fontFamily: 'var(--font-secondary)',
                    borderRadius: 'var(--border-radius-md)',
                    gap: 'clamp(0.25rem, 1vw, 0.5rem)',
                    fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                    padding: 'clamp(0.5rem, 1.5vw, 0.75rem) clamp(0.75rem, 2vw, 1rem)',
                    minWidth: 'fit-content'
                  }}
                >
                  <item.icon style={{ width: 'clamp(0.875rem, 2vw, 1rem)', height: 'clamp(0.875rem, 2vw, 1rem)' }} />
                  <span className="hidden xs:inline">/{item.name.toLowerCase()}</span>
                  <span className="xs:hidden">{item.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="container transition-all duration-300" style={{ paddingTop: 'clamp(1rem, 3vw, 2rem)', paddingBottom: 'clamp(1rem, 3vw, 2rem)' }}>
        {children}
      </main>

      {/* Footer */}
      <footer className="card mt-auto" style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderBottom: 0 }}>
        <div className="container" style={{ paddingTop: 'clamp(1rem, 2.5vw, 1.5rem)', paddingBottom: 'clamp(1rem, 2.5vw, 1.5rem)' }}>
          <div className="flex flex-col sm:flex-row justify-between items-center" style={{ gap: 'clamp(0.5rem, 1.5vw, 1rem)' }}>
            <div 
              className="text-center sm:text-left" 
              style={{ 
                fontFamily: 'var(--font-secondary)',
                fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                color: 'var(--color-text-secondary)'
              }}
            >
              © 2024 <span style={{ color: 'var(--color-primary)' }}>TradingAgents</span>. AI-powered trading analysis platform.
            </div>
            <div 
              className="flex items-center text-center" 
              style={{ 
                fontFamily: 'var(--font-secondary)',
                fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                color: 'var(--color-text-secondary)',
                gap: 'clamp(0.5rem, 1.5vw, 1rem)'
              }}
            >
              <span>Status: <span className="bull-text">Online</span></span>
              <span style={{ color: 'var(--color-text-muted)' }}>•</span>
              <span>API: <span style={{ color: 'var(--color-primary)' }}>Connected</span></span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}