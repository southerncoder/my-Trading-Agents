/**
 * Market-wide macro backdrop for the analysts, point-in-time to `asOf`:
 * - BLS (no key needed): unemployment, payrolls, CPI and core CPI. BLS keeps no vintages, so a month counts only
 *   once its release date has passed (jobs report: from the 8th of the next month, after the first Friday; CPI: from
 *   the 16th). Later revisions to a month are not undone.
 * - FRED (key needed): rates, the yield curve, volatility, credit spreads, oil and real GDP growth, requested as
 *   the values known on `asOf` (ALFRED real-time period), so revisions and later data never leak in.
 */

export interface BlsPoint { year: string; period: string; value: string }
export interface BlsSeriesLike { seriesID: string; data: BlsPoint[] }
export interface FredObs { date: string; value: string }

export const BLS_SERIES = {
  unemployment: 'LNS14000000', // unemployment rate, seasonally adjusted
  payrolls: 'CES0000000001', // total nonfarm employment (thousands), seasonally adjusted
  cpi: 'CUUR0000SA0', // CPI-U all items, not seasonally adjusted (used for year-over-year)
  coreCpi: 'CUUR0000SA0L1E', // CPI-U less food and energy
} as const;

/** Day of the following month from which a month's figure is treated as published. */
const RELEASE_DAY: Record<keyof typeof BLS_SERIES, number> = { unemployment: 8, payrolls: 8, cpi: 16, coreCpi: 16 };

export const FRED_SERIES = {
  fedFunds: { id: 'DFF', label: 'Effective fed funds rate', unit: '%' },
  t2y: { id: 'DGS2', label: '2-year Treasury yield', unit: '%' },
  t10y: { id: 'DGS10', label: '10-year Treasury yield', unit: '%' },
  curve: { id: 'T10Y2Y', label: '10y minus 2y spread', unit: ' pts' },
  vix: { id: 'VIXCLS', label: 'VIX (expected S&P 500 volatility)', unit: '' },
  hySpread: { id: 'BAMLH0A0HYM2', label: 'High-yield credit spread', unit: ' pts' },
  oil: { id: 'DCOILWTICO', label: 'WTI crude oil', unit: ' $/bbl' },
  gdp: { id: 'A191RL1Q225SBEA', label: 'Real GDP growth (annualized, latest quarter)', unit: '%' },
} as const;

export interface MonthValue { month: string; value: number }

/** A BLS series as it was published by `asOf`, oldest first (annual averages dropped). */
export function blsAsOf(series: BlsSeriesLike | undefined, key: keyof typeof BLS_SERIES, asOf: string): MonthValue[] {
  if (!series) return [];
  const out: MonthValue[] = [];
  for (const p of series.data) {
    const m = /^M(0[1-9]|1[0-2])$/.exec(p.period);
    const v = Number(p.value);
    if (!m || !Number.isFinite(v)) continue;
    const y = Number(p.year);
    const mo = Number(m[1]);
    const release = new Date(Date.UTC(mo === 12 ? y + 1 : y, mo === 12 ? 0 : mo, RELEASE_DAY[key])).toISOString().slice(0, 10);
    if (release > asOf) continue;
    out.push({ month: `${y}-${m[1]}`, value: v });
  }
  return out.sort((a, b) => a.month.localeCompare(b.month));
}

const monthName = (m: string) => new Date(`${m}-01T00:00:00Z`).toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

/**
 * Year-over-year change for the latest month that has a value twelve months earlier. Looks back up to three months
 * because BLS occasionally skips a month (October 2025 CPI was never published after the government shutdown).
 */
function yoy(points: MonthValue[]): { month: string; pct: number } | null {
  for (const last of points.slice(-4).reverse()) {
    const [y, m] = last.month.split('-');
    const prior = points.find((p) => p.month === `${Number(y) - 1}-${m}`);
    if (prior) return { month: last.month, pct: (last.value / prior.value - 1) * 100 };
  }
  return null;
}

export interface BlsDigestInput { unemployment: MonthValue[]; payrolls: MonthValue[]; cpi: MonthValue[]; coreCpi: MonthValue[] }

export function blsLines(b: BlsDigestInput): string[] {
  const lines: string[] = [];
  const u = b.unemployment;
  if (u.length) {
    const last = u.at(-1)!;
    const before = u.at(-4);
    lines.push(`- Unemployment rate ${last.value.toFixed(1)}% (${monthName(last.month)})${before ? `, ${before.value.toFixed(1)}% three months earlier` : ''}.`);
  }
  const p = b.payrolls;
  if (p.length >= 2) {
    const changes = p.slice(1).map((x, i) => ({ month: x.month, d: x.value - p[i].value }));
    const last = changes.at(-1)!;
    const avg3 = changes.slice(-3).reduce((t, c) => t + c.d, 0) / Math.min(3, changes.length);
    lines.push(`- Nonfarm payrolls ${last.d >= 0 ? '+' : ''}${Math.round(last.d)}k jobs in ${monthName(last.month)}; three-month average ${avg3 >= 0 ? '+' : ''}${Math.round(avg3)}k.`);
  }
  const c = yoy(b.cpi);
  const core = yoy(b.coreCpi);
  // The reading before, so the direction (rising or easing) is stated as data, not inferred.
  const before = c ? yoy(b.cpi.filter((p) => p.month < c.month)) : null;
  if (c) {
    lines.push(
      `- Inflation (CPI, year over year) ${c.pct.toFixed(1)}% in ${monthName(c.month)}` +
        (before ? ` (${before.pct.toFixed(1)}% in ${monthName(before.month)})` : '') +
        (core ? `; core (ex food and energy) ${core.pct.toFixed(1)}%` : '') + '.',
    );
  }
  return lines;
}

/** Latest valid observation on or before a date ('.' marks a missing day in FRED). */
function obsOnOrBefore(obs: FredObs[], date: string): { date: string; value: number } | null {
  let best: { date: string; value: number } | null = null;
  for (const o of obs) {
    const v = Number(o.value);
    if (o.value === '.' || !Number.isFinite(v) || o.date > date) continue;
    if (!best || o.date > best.date) best = { date: o.date, value: v };
  }
  return best;
}

const minusDays = (d: string, n: number) => new Date(Date.parse(d) - n * 86_400_000).toISOString().slice(0, 10);

export function fredLines(series: Partial<Record<keyof typeof FRED_SERIES, FredObs[]>>, asOf: string): string[] {
  const lines: string[] = [];
  for (const [key, meta] of Object.entries(FRED_SERIES) as [keyof typeof FRED_SERIES, (typeof FRED_SERIES)[keyof typeof FRED_SERIES]][]) {
    const obs = series[key];
    if (!obs?.length) continue;
    const now = obsOnOrBefore(obs, asOf);
    if (!now) continue;
    const fmt = (v: number) => `${meta.unit === ' $/bbl' ? '$' : ''}${v.toFixed(2)}${meta.unit === ' $/bbl' ? '' : meta.unit}`;
    if (key === 'gdp') {
      lines.push(`- ${meta.label}: ${fmt(now.value)} (quarter starting ${now.date}).`);
      continue;
    }
    // "About" a month and a year: the nearest trading day on or before, allowing for weekends and holidays.
    const month = obsOnOrBefore(obs, minusDays(now.date, 28));
    const year = obsOnOrBefore(obs, minusDays(now.date, 360));
    const ago = [month && `${fmt(month.value)} a month earlier`, year && `${fmt(year.value)} a year earlier`].filter(Boolean).join(', ');
    lines.push(`- ${meta.label}: ${fmt(now.value)} on ${now.date}${ago ? ` (${ago})` : ''}.`);
  }
  return lines;
}

export function macroDigest(a: { asOf: string; bls: string[]; fred: string[]; notes: string[] }): string {
  const lines = [`MACRO BACKDROP as known on ${a.asOf} (official US data; market-wide, not specific to this stock):`];
  if (a.bls.length) lines.push('Jobs and inflation (Bureau of Labor Statistics):', ...a.bls);
  if (a.fred.length) lines.push('Rates, markets and growth (Federal Reserve Economic Data):', ...a.fred);
  if (!a.bls.length && !a.fred.length) lines.push('- No macro data could be loaded.');
  for (const n of a.notes) lines.push(`Note: ${n}`);
  return lines.join('\n');
}
