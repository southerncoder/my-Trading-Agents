/**
 * Compact, point-in-time fundamentals from SEC EDGAR data (company facts XBRL + submissions).
 * Only facts and filings filed on or before `asOf` are used, so an analysis dated in the past never sees a
 * later filing or a later restatement.
 */

interface Fact {
  start?: string;
  end: string;
  val: number;
  fy?: number;
  fp?: string;
  form?: string;
  filed: string;
}

export interface CompanyFactsLike {
  entityName?: string;
  facts?: Record<string, Record<string, { units?: Record<string, Fact[]> }>>;
}

export interface SubmissionsLike {
  name?: string;
  sicDescription?: string;
  fiscalYearEnd?: string;
  filings?: { recent?: { form?: string[]; filingDate?: string[]; reportDate?: string[] } };
}

export interface PeriodFigures {
  end: string;
  filed: string;
  /** Fourth quarter worked out as the year minus the first three (10-Qs cover only three quarters). */
  derived?: boolean;
  revenue?: number;
  netIncome?: number;
  epsDiluted?: number;
  operatingCashFlow?: number;
}

export interface BalanceFigures {
  end: string;
  filed: string;
  assets?: number;
  liabilities?: number;
  equity?: number;
  cash?: number;
  longTermDebt?: number;
  sharesOutstanding?: number;
}

export interface FundamentalsSummary {
  ticker: string;
  cik: string;
  name: string;
  industry?: string;
  asOf: string;
  recentFilings: { form: string; filed: string; period?: string }[];
  annual: PeriodFigures[];
  quarterly: PeriodFigures[];
  balance: BalanceFigures | null;
  digest: string;
}

const REVENUE = ['Revenues', 'RevenueFromContractWithCustomerExcludingAssessedTax', 'SalesRevenueNet', 'RevenueFromContractWithCustomerIncludingAssessedTax'];
const DAY = 86_400_000;
const days = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / DAY;

function factsOf(cf: CompanyFactsLike, taxonomy: string, concept: string, unit: string, asOf: string): Fact[] {
  const list = cf.facts?.[taxonomy]?.[concept]?.units?.[unit] ?? [];
  return list.filter((f) => typeof f.val === 'number' && Number.isFinite(f.val) && f.filed <= asOf && f.end <= asOf);
}

/** One value per period end: the latest filing made by `asOf` (picks up restatements, never later ones). */
function byPeriod(facts: Fact[], kind: 'annual' | 'quarter' | 'instant'): Map<string, Fact> {
  const out = new Map<string, Fact>();
  for (const f of facts) {
    if (kind !== 'instant') {
      if (!f.start) continue;
      const len = days(f.start, f.end);
      if (kind === 'annual' ? len < 350 || len > 380 : len < 80 || len > 100) continue;
    } else if (f.start) continue;
    const prev = out.get(f.end);
    if (!prev || f.filed > prev.filed) out.set(f.end, f);
  }
  return out;
}

/** The revenue concept with the most recent year or quarter (companies switch tags over the years). */
function revenueFacts(cf: CompanyFactsLike, asOf: string): Fact[] {
  let best: Fact[] = [];
  let bestEnd = '';
  for (const c of REVENUE) {
    const f = factsOf(cf, 'us-gaap', c, 'USD', asOf);
    const end = [...byPeriod(f, 'annual').keys(), ...byPeriod(f, 'quarter').keys()].sort().at(-1) ?? '';
    if (end > bestEnd) {
      best = f;
      bestEnd = end;
    }
  }
  return best;
}

const nextDay = (d: string) => new Date(Date.parse(d) + DAY).toISOString().slice(0, 10);

/** Adds each year's fourth quarter as the year minus its first three quarters, when all three are known. */
function withDerivedQ4(quarters: Map<string, Fact>, years: Map<string, Fact>): Map<string, Fact> {
  const out = new Map(quarters);
  for (const [end, y] of years) {
    if (out.has(end) || !y.start) continue;
    const inside = [...quarters.values()].filter((q) => q.start! >= y.start! && q.end < end);
    if (inside.length !== 3) continue;
    const last = inside.map((q) => q.end).sort()[2];
    out.set(end, { start: nextDay(last), end, val: y.val - inside.reduce((t, q) => t + q.val, 0), filed: y.filed, form: y.form, fp: 'Q4*' });
  }
  return out;
}

function periods(cf: CompanyFactsLike, asOf: string, kind: 'annual' | 'quarter', count: number): PeriodFigures[] {
  const flow = (facts: Fact[], deriveQ4: boolean) =>
    kind === 'quarter' && deriveQ4 ? withDerivedQ4(byPeriod(facts, 'quarter'), byPeriod(facts, 'annual')) : byPeriod(facts, kind);
  const series = {
    revenue: flow(revenueFacts(cf, asOf), true),
    netIncome: flow(factsOf(cf, 'us-gaap', 'NetIncomeLoss', 'USD', asOf), true),
    // Per-share figures do not add up across quarters, and 10-Q cash flows are year-to-date: no derived Q4 for them.
    epsDiluted: flow(factsOf(cf, 'us-gaap', 'EarningsPerShareDiluted', 'USD/shares', asOf), false),
    operatingCashFlow: flow(factsOf(cf, 'us-gaap', 'NetCashProvidedByUsedInOperatingActivities', 'USD', asOf), false),
  };
  // Periods are anchored on revenue or net income, the two figures every filer reports.
  const ends = [...new Set([...series.revenue.keys(), ...series.netIncome.keys()])].sort().reverse().slice(0, count);
  return ends.map((end) => {
    const anchor = series.revenue.get(end) ?? series.netIncome.get(end)!;
    const p: PeriodFigures = { end, filed: anchor.filed };
    if (anchor.fp === 'Q4*') p.derived = true;
    for (const k of Object.keys(series) as (keyof typeof series)[]) {
      const v = series[k].get(end)?.val;
      if (v !== undefined) p[k] = v;
    }
    return p;
  });
}

function latestInstant(cf: CompanyFactsLike, taxonomy: string, concept: string, unit: string, asOf: string): Fact | undefined {
  return [...byPeriod(factsOf(cf, taxonomy, concept, unit, asOf), 'instant').values()].sort((a, b) => a.end.localeCompare(b.end)).at(-1);
}

function balance(cf: CompanyFactsLike, asOf: string): BalanceFigures | null {
  const assets = latestInstant(cf, 'us-gaap', 'Assets', 'USD', asOf);
  if (!assets) return null;
  // Every balance figure must come from the same balance-sheet date as total assets.
  const at = (concept: string, taxonomy = 'us-gaap', unit = 'USD') => {
    const f = byPeriod(factsOf(cf, taxonomy, concept, unit, asOf), 'instant').get(assets.end);
    return f?.val;
  };
  const b: BalanceFigures = { end: assets.end, filed: assets.filed, assets: assets.val };
  const set = (k: keyof BalanceFigures, v: number | undefined) => {
    if (v !== undefined) (b as unknown as Record<string, number>)[k] = v;
  };
  const equity = at('StockholdersEquity') ?? at('StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest');
  // Some filers (Coca-Cola, for one) never tag total liabilities: it is total liabilities-and-equity minus all equity.
  const totalEquity = at('StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest') ?? equity;
  const both = at('LiabilitiesAndStockholdersEquity');
  set('liabilities', at('Liabilities') ?? (both !== undefined && totalEquity !== undefined ? both - totalEquity : undefined));
  set('equity', equity);
  set('cash', at('CashAndCashEquivalentsAtCarryingValue'));
  set('longTermDebt', at('LongTermDebtNoncurrent') ?? at('LongTermDebt') ?? at('LongTermDebtAndCapitalLeaseObligations'));
  // Share count is reported on the cover page, usually a few weeks after the balance-sheet date.
  set('sharesOutstanding', latestInstant(cf, 'dei', 'EntityCommonStockSharesOutstanding', 'shares', asOf)?.val);
  return b;
}

const KEY_FORMS = new Set(['10-K', '10-Q', '8-K', '10-K/A', '10-Q/A', '20-F', '6-K', '40-F']);

function filings(sub: SubmissionsLike | null, asOf: string, count: number): FundamentalsSummary['recentFilings'] {
  const r = sub?.filings?.recent;
  if (!r?.form || !r.filingDate) return [];
  const out: FundamentalsSummary['recentFilings'] = [];
  for (let i = 0; i < r.form.length && out.length < count; i++) {
    const filed = r.filingDate[i];
    if (!KEY_FORMS.has(r.form[i]) || !filed || filed > asOf) continue;
    out.push({ form: r.form[i], filed, period: r.reportDate?.[i] || undefined });
  }
  return out;
}

const money = (n?: number) => {
  if (n === undefined) return 'n/a';
  const a = Math.abs(n);
  const s = a >= 1e9 ? `${(a / 1e9).toFixed(2)}B` : a >= 1e6 ? `${(a / 1e6).toFixed(1)}M` : a.toFixed(0);
  return `${n < 0 ? '-' : ''}$${s}`;
};
const pct = (a?: number, b?: number) => (a === undefined || b === undefined || b === 0 ? '' : ` (${a >= b ? '+' : ''}${(((a - b) / Math.abs(b)) * 100).toFixed(1)}% vs prior)`);
const margin = (n?: number, rev?: number) => (n === undefined || !rev ? '' : `, margin ${((n / rev) * 100).toFixed(1)}%`);

function periodLine(kind: 'year' | 'quarter', p: PeriodFigures, prior?: PeriodFigures): string {
  // Labelled by end date: the fiscal-year tags in XBRL belong to the filing, not to the period it reports.
  const label = `${kind === 'year' ? 'Fiscal year' : 'Quarter'} ended ${p.end}${p.derived ? ' (Q4: year minus Q1-Q3)' : ''}, filed ${p.filed}`;
  const parts = [
    `revenue ${money(p.revenue)}${pct(p.revenue, prior?.revenue)}`,
    `net income ${money(p.netIncome)}${margin(p.netIncome, p.revenue)}`,
    p.epsDiluted !== undefined ? `diluted EPS $${p.epsDiluted.toFixed(2)}` : '',
    p.operatingCashFlow !== undefined ? `operating cash flow ${money(p.operatingCashFlow)}` : '',
  ].filter(Boolean);
  return `- ${label}: ${parts.join('; ')}`;
}

const count = (n: number) => (n >= 1e9 ? `${(n / 1e9).toFixed(2)}B` : `${(n / 1e6).toFixed(1)}M`);

/** Plain text for an analyst prompt. States what is missing instead of leaving gaps unexplained. */
export function digest(s: Omit<FundamentalsSummary, 'digest'>): string {
  const lines = [
    `SEC EDGAR FILINGS for ${s.ticker} (${s.name}${s.industry ? `, ${s.industry}` : ''}), official figures from 10-K/10-Q filings made on or before ${s.asOf}:`,
  ];
  if (s.annual.length) {
    lines.push('Annual (fiscal years):');
    s.annual.forEach((p, i) => lines.push(periodLine('year', p, s.annual[i + 1])));
  } else lines.push('Annual figures: none in XBRL filings.');
  if (s.quarterly.length) {
    lines.push('Latest quarters (three months each, change vs the quarter before):');
    s.quarterly.forEach((p, i) => lines.push(periodLine('quarter', p, s.quarterly[i + 1])));
  }
  const b = s.balance;
  if (b) {
    const de = b.longTermDebt !== undefined && b.equity ? `, long-term debt / equity ${(b.longTermDebt / b.equity).toFixed(2)}` : '';
    lines.push(
      `Balance sheet at ${b.end} (filed ${b.filed}): total assets ${money(b.assets)}, liabilities ${money(b.liabilities)}, equity ${money(b.equity)}, ` +
        `cash ${money(b.cash)}, long-term debt ${money(b.longTermDebt)}${de}` +
        (b.sharesOutstanding !== undefined ? `; shares outstanding ${count(b.sharesOutstanding)}.` : '.'),
    );
  } else lines.push('Balance sheet: not available in XBRL filings.');
  if (s.recentFilings.length) {
    lines.push(`Recent filings: ${s.recentFilings.map((f) => `${f.form} ${f.filed}`).join(', ')}.`);
  }
  return lines.join('\n');
}

export function summarizeFundamentals(a: {
  ticker: string;
  cik: string;
  name: string;
  asOf: string;
  facts: CompanyFactsLike | null;
  submissions: SubmissionsLike | null;
}): FundamentalsSummary {
  const cf = a.facts ?? {};
  const base = {
    ticker: a.ticker.toUpperCase(),
    cik: a.cik,
    name: a.submissions?.name || cf.entityName || a.name,
    industry: a.submissions?.sicDescription || undefined,
    asOf: a.asOf,
    recentFilings: filings(a.submissions, a.asOf, 8),
    annual: periods(cf, a.asOf, 'annual', 3),
    quarterly: periods(cf, a.asOf, 'quarter', 4),
    balance: balance(cf, a.asOf),
  };
  return { ...base, digest: digest(base) };
}
