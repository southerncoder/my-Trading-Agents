export interface LedgerRow {
  date: string
  ticker: string
  group: string
  profile: string
  label: string
  action_now: string
  decision: string
  confidence: number
  price: number
  trigger_price?: number
  trigger_type?: string
  trigger_reason?: string
  walk_away?: number
  atr?: number
  ma50?: number
  ma200?: number
  educational_review?: unknown
  fast_model?: string
  decision_model?: string
  /** Wall-clock seconds the analysis of this stock took. */
  seconds?: number
  stance: Record<string, string>
  pm: {
    rationale?: string
    key_risks?: string[]
    what_would_change_my_mind?: string
  }
}

export interface NightlyRow extends LedgerRow {
  change_pct: number | null
  distance_to_trigger_pct: number | null
  inside_half_day: boolean
}

export interface NightlySummary {
  by_label: Record<string, number>
  inside_half_day: number
  biggest_mover: { ticker: string; change_pct: number } | null
}

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)

export function deriveRows(rows: LedgerRow[], previous?: LedgerRow[]): NightlyRow[] {
  const prevPrice = new Map<string, number>()
  for (const p of previous ?? []) if (finite(p.price) && p.price !== 0) prevPrice.set(p.ticker, p.price)

  return rows.map((r) => {
    const prev = prevPrice.get(r.ticker)
    const change_pct = prev !== undefined && finite(r.price) ? (r.price / prev - 1) * 100 : null

    const hasTrigger = finite(r.trigger_price) && finite(r.price) && r.price !== 0
    const distance_to_trigger_pct = hasTrigger ? ((r.trigger_price as number) - r.price) / r.price * 100 : null

    // Same rule as tools/nightly-run.ps1 (trigger_days): round(|trigger - price| / ATR, 1) < 0.5
    const inside_half_day =
      hasTrigger && finite(r.atr) && r.atr > 0 && Math.round((Math.abs((r.trigger_price as number) - r.price) / r.atr) * 10) / 10 < 0.5

    return { ...r, change_pct, distance_to_trigger_pct, inside_half_day }
  })
}

export function summarize(rows: NightlyRow[]): NightlySummary {
  const by_label: Record<string, number> = {}
  let inside = 0
  let biggest: { ticker: string; change_pct: number } | null = null
  for (const r of rows) {
    by_label[r.label] = (by_label[r.label] ?? 0) + 1
    if (r.inside_half_day) inside++
    if (r.change_pct !== null && (biggest === null || Math.abs(r.change_pct) > Math.abs(biggest.change_pct))) {
      biggest = { ticker: r.ticker, change_pct: r.change_pct }
    }
  }
  return { by_label, inside_half_day: inside, biggest_mover: biggest }
}

const TZ = 'America/Chicago'
const CUTOFF_HOUR = 18

// NYSE full-day closures (source: nyse.com/trade/hours-calendars). Early-close days still trade, so they
// are not listed. Keep in step with tools/nightly-run.ps1. Extend before the end of 2027.
const MARKET_HOLIDAYS = new Set([
  '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25',
  '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
  '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31',
  '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24',
])

/** Most recent night the nightly run should have produced, as YYYY-MM-DD (Chicago time). */
export function expectedNightDate(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const day = new Date(Date.UTC(get('year'), get('month') - 1, get('day')))
  const isClosed = (d: Date) => d.getUTCDay() === 0 || d.getUTCDay() === 6 || MARKET_HOLIDAYS.has(d.toISOString().slice(0, 10))

  if (get('hour') < CUTOFF_HOUR || isClosed(day)) day.setUTCDate(day.getUTCDate() - 1)
  while (isClosed(day)) day.setUTCDate(day.getUTCDate() - 1)
  return day.toISOString().slice(0, 10)
}
