import { Activity, BarChart3, History, List, Server, Sun, Target, TrendingUp, type LucideIcon } from 'lucide-react'

export interface NavItem {
  name: string
  href: string
  icon: LucideIcon
}

/** The pages used every day. These get the top bar on desktop and the tab bar on phones. */
export const PRIMARY: NavItem[] = [
  { name: 'Today', href: '/', icon: Sun },
  { name: 'Stocks', href: '/stocks', icon: List },
  { name: 'Scorecard', href: '/scorecard', icon: Target },
  { name: 'Platform', href: '/platform', icon: Server },
]

/** Older pages from the original app. Still reachable, tucked under "More". */
export const MORE: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Analysis', href: '/analysis', icon: TrendingUp },
  { name: 'Backtesting', href: '/backtesting', icon: Activity },
  { name: 'History', href: '/history', icon: History },
]

export function isActive(pathname: string, href: string): boolean {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  if (href === '/') return path === '/'
  // One stock's page belongs to the Stocks section.
  if (href === '/stocks' && (path === '/stock' || path.startsWith('/stock/'))) return true
  return path === href || path.startsWith(`${href}/`)
}
