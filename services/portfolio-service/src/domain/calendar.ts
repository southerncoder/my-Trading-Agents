// NYSE full-day closures (nyse.com/trade/hours-calendars). Early-close days still trade. Kept identical to
// tools/market-calendar.ps1 (a test checks this). Extend before the end of 2027.
export const MARKET_HOLIDAYS: ReadonlySet<string> = new Set([
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25',
  '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
  '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31',
  '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24',
])

const toDate = (d: string) => new Date(`${d}T00:00:00Z`)
const fmt = (d: Date) => d.toISOString().slice(0, 10)

export function isTradingDay(date: string): boolean {
  const day = toDate(date).getUTCDay()
  return day !== 0 && day !== 6 && !MARKET_HOLIDAYS.has(date)
}

export function addDays(date: string, n: number): string {
  const d = toDate(date)
  d.setUTCDate(d.getUTCDate() + n)
  return fmt(d)
}

/** The date n trading days after `date` (n >= 0; 0 returns the date itself). */
export function addTradingDays(date: string, n: number): string {
  let d = date
  let left = n
  while (left > 0) {
    d = addDays(d, 1)
    if (isTradingDay(d)) left--
  }
  return d
}

/** Trading days after `from` up to and including `to`. */
export function tradingDaysBetween(from: string, to: string): number {
  let n = 0
  for (let d = addDays(from, 1); d <= to; d = addDays(d, 1)) if (isTradingDay(d)) n++
  return n
}

/** The latest trading day on or before `date`. */
export function lastTradingDay(date: string): string {
  let d = date
  while (!isTradingDay(d)) d = addDays(d, -1)
  return d
}
