import { Activity, BarChart3, BookOpen, Briefcase, History, List, Server, Sparkles, Sun, Target, TrendingUp, Trophy, type LucideIcon } from 'lucide-react'

export interface NavItem {
  name: string
  href: string
  icon: LucideIcon
}

/** The pages used every day. These get the top bar on desktop and the tab bar on phones. */
export const PRIMARY: NavItem[] = [
  { name: 'Today', href: '/', icon: Sun },
  { name: 'Picks', href: '/picks', icon: Sparkles },
  { name: 'Portfolios', href: '/portfolios', icon: Briefcase },
  { name: 'Stocks', href: '/stocks', icon: List },
]

/** Results, reviews and system pages, then older pages from the original app. Tucked under "More". */
export const MORE: NavItem[] = [
  { name: 'Results by source', href: '/results', icon: Trophy },
  { name: 'Weekly review', href: '/reviews', icon: BookOpen },
  { name: 'Scorecard', href: '/scorecard', icon: Target },
  { name: 'Platform', href: '/platform', icon: Server },
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
