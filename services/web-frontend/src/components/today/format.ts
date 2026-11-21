export const UP = '#0A8F80'
export const DOWN = '#D4501A'

export function fmtPct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined) return '—'
  const sign = n > 0 ? '+' : n < 0 ? '−' : ''
  return `${sign}${Math.abs(n).toFixed(digits)}%`
}

export function fmtPrice(n: number | null | undefined): string {
  return n === null || n === undefined ? '—' : `$${n.toFixed(2)}`
}

export function arrow(n: number | null | undefined): string {
  if (n === null || n === undefined || n === 0) return ''
  return n > 0 ? '▲' : '▼'
}

export function moveColor(n: number | null | undefined): string | undefined {
  if (n === null || n === undefined || n === 0) return undefined
  return n > 0 ? UP : DOWN
}

export const muted = { color: 'var(--color-text-muted, #64748b)' }
export const card = {
  background: 'var(--color-surface, #fff)',
  border: '1px solid var(--color-border, #e2e8f0)',
  color: 'var(--color-text-primary, inherit)',
}
