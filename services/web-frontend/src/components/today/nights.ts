/** Night dates (YYYY-MM-DD), newest first, no duplicates. */
export function newestFirst(dates: string[]): string[] {
  return [...new Set(dates)].sort().reverse()
}

/** The night just before and just after `current`, or null at either end or when `current` is unknown. */
export function neighbours(dates: string[], current: string): { older: string | null; newer: string | null } {
  const list = newestFirst(dates)
  const i = list.indexOf(current)
  if (i === -1) return { older: null, newer: null }
  return { older: list[i + 1] ?? null, newer: list[i - 1] ?? null }
}
