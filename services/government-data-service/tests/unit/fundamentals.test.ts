import { describe, expect, it } from 'vitest';
import { summarizeFundamentals, type CompanyFactsLike, type SubmissionsLike } from '../../src/fundamentals';

const usd = (rows: Array<[string | undefined, string, number, string, number?, string?, string?]>) => ({
  units: { USD: rows.map(([start, end, val, filed, fy, fp, form]) => ({ start, end, val, filed, fy, fp, form })) },
});

const facts: CompanyFactsLike = {
  entityName: 'ACME CORP',
  facts: {
    'us-gaap': {
      // An old tag that stopped being used, and the current one.
      SalesRevenueNet: usd([['2021-01-01', '2021-12-31', 50, '2022-02-01', 2021, 'FY', '10-K']]),
      Revenues: usd([
        ['2022-01-01', '2022-12-31', 100, '2023-02-01', 2022, 'FY', '10-K'],
        ['2023-01-01', '2023-12-31', 120, '2024-02-01', 2023, 'FY', '10-K'],
        // Restated later: an analysis before 2024-06-01 must still see 120.
        ['2023-01-01', '2023-12-31', 118, '2024-06-01', 2024, 'FY', '10-K/A'],
        ['2024-01-01', '2024-03-31', 35, '2024-05-01', 2024, 'Q1', '10-Q'],
        ['2024-04-01', '2024-06-30', 40, '2024-08-01', 2024, 'Q2', '10-Q'],
        // Year-to-date figure (six months): neither a quarter nor a year.
        ['2024-01-01', '2024-06-30', 75, '2024-08-01', 2024, 'Q2', '10-Q'],
      ]),
      NetIncomeLoss: usd([
        ['2022-01-01', '2022-12-31', 10, '2023-02-01', 2022, 'FY', '10-K'],
        ['2023-01-01', '2023-12-31', 15, '2024-02-01', 2023, 'FY', '10-K'],
        ['2024-01-01', '2024-03-31', 5, '2024-05-01', 2024, 'Q1', '10-Q'],
      ]),
      Assets: usd([[undefined, '2023-12-31', 500, '2024-02-01'], [undefined, '2024-03-31', 520, '2024-05-01']]),
      Liabilities: usd([[undefined, '2023-12-31', 300, '2024-02-01'], [undefined, '2024-03-31', 310, '2024-05-01']]),
      StockholdersEquity: usd([[undefined, '2024-03-31', 210, '2024-05-01']]),
      LongTermDebtNoncurrent: usd([[undefined, '2024-03-31', 105, '2024-05-01']]),
    },
    dei: { EntityCommonStockSharesOutstanding: { units: { shares: [{ end: '2024-04-20', val: 1_000_000, filed: '2024-05-01' }] } } },
  },
};

const submissions: SubmissionsLike = {
  name: 'Acme Corp',
  sicDescription: 'Widgets',
  filings: {
    recent: {
      form: ['10-Q', '4', '8-K', '10-K', '10-Q'],
      filingDate: ['2024-08-01', '2024-07-15', '2024-06-10', '2024-02-01', '2023-11-01'],
      reportDate: ['2024-06-30', '', '', '2023-12-31', '2023-09-30'],
    },
  },
};

const summary = (asOf: string) => summarizeFundamentals({ ticker: 'acme', cik: '123', name: 'ACME', asOf, facts, submissions });

describe('summarizeFundamentals', () => {
  it('uses only what was filed by the analysis date (no look-ahead, no later restatement)', () => {
    const s = summary('2024-05-15');
    expect(s.annual.map((p) => [p.end, p.revenue, p.netIncome])).toEqual([['2023-12-31', 120, 15], ['2022-12-31', 100, 10]]);
    expect(s.quarterly.map((p) => [p.end, p.revenue])).toEqual([['2024-03-31', 35]]);
    expect(s.recentFilings).toEqual([{ form: '10-K', filed: '2024-02-01', period: '2023-12-31' }, { form: '10-Q', filed: '2023-11-01', period: '2023-09-30' }]);
  });

  it('later, picks up the newer quarter and the restatement, and skips year-to-date figures', () => {
    const s = summary('2024-09-01');
    expect(s.annual[0]).toMatchObject({ end: '2023-12-31', revenue: 118 });
    expect(s.quarterly.map((p) => [p.end, p.revenue])).toEqual([['2024-06-30', 40], ['2024-03-31', 35]]);
    expect(s.recentFilings.map((f) => f.form)).toEqual(['10-Q', '8-K', '10-K', '10-Q']);
  });

  it('reads the balance sheet from one date and the share count from the cover page', () => {
    expect(summary('2024-05-15').balance).toEqual({ end: '2024-03-31', filed: '2024-05-01', assets: 520, liabilities: 310, equity: 210, longTermDebt: 105, sharesOutstanding: 1_000_000 });
  });

  it('writes a digest an analyst can read, with growth and margins', () => {
    const d = summary('2024-05-15').digest;
    expect(d).toContain('SEC EDGAR FILINGS for ACME (Acme Corp, Widgets)');
    expect(d).toContain('filings made on or before 2024-05-15');
    expect(d).toContain('- Fiscal year ended 2023-12-31, filed 2024-02-01: revenue $120 (+20.0% vs prior); net income $15, margin 12.5%');
    expect(d).toContain('shares outstanding 1.0M.');
    expect(d).toContain('long-term debt / equity 0.50');
  });

  it('derives the fourth quarter as the year minus the first three', () => {
    const cf: CompanyFactsLike = {
      facts: {
        'us-gaap': {
          Revenues: usd([
            ['2023-01-01', '2023-12-31', 100, '2024-02-01'],
            ['2023-01-01', '2023-03-31', 20, '2023-05-01'],
            ['2023-04-01', '2023-06-30', 25, '2023-08-01'],
            ['2023-07-01', '2023-09-30', 30, '2023-11-01'],
            ['2024-01-01', '2024-03-31', 28, '2024-05-01'],
          ]),
        },
      },
    };
    const s = summarizeFundamentals({ ticker: 'X', cik: '1', name: 'X', asOf: '2024-05-15', facts: cf, submissions: null });
    expect(s.quarterly.map((p) => [p.end, p.revenue, !!p.derived])).toEqual([
      ['2024-03-31', 28, false], ['2023-12-31', 25, true], ['2023-09-30', 30, false], ['2023-06-30', 25, false],
    ]);
    expect(s.digest).toContain('Quarter ended 2023-12-31 (Q4: year minus Q1-Q3), filed 2024-02-01: revenue $25 (-16.7% vs prior)');
    // Before the annual report is filed, the fourth quarter cannot be known.
    const early = summarizeFundamentals({ ticker: 'X', cik: '1', name: 'X', asOf: '2024-01-15', facts: cf, submissions: null });
    expect(early.quarterly.map((p) => p.end)).toEqual(['2023-09-30', '2023-06-30', '2023-03-31']);
  });

  it('works out total liabilities when the filer tags only liabilities-and-equity', () => {
    const cf: CompanyFactsLike = {
      facts: {
        'us-gaap': {
          Assets: usd([[undefined, '2024-03-31', 100, '2024-05-01']]),
          LiabilitiesAndStockholdersEquity: usd([[undefined, '2024-03-31', 100, '2024-05-01']]),
          StockholdersEquity: usd([[undefined, '2024-03-31', 35, '2024-05-01']]),
          StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest: usd([[undefined, '2024-03-31', 37, '2024-05-01']]),
          LongTermDebtAndCapitalLeaseObligations: usd([[undefined, '2024-03-31', 40, '2024-05-01']]),
        },
      },
    };
    const b = summarizeFundamentals({ ticker: 'X', cik: '1', name: 'X', asOf: '2024-05-15', facts: cf, submissions: null }).balance;
    expect(b).toMatchObject({ liabilities: 63, equity: 35, longTermDebt: 40 });
  });

  it('says what is missing for a filer without XBRL data', () => {
    const s = summarizeFundamentals({ ticker: 'NEW', cik: '9', name: 'New Co', asOf: '2024-05-15', facts: null, submissions: null });
    expect(s.annual).toEqual([]);
    expect(s.balance).toBeNull();
    expect(s.digest).toContain('Annual figures: none in XBRL filings.');
    expect(s.digest).toContain('Balance sheet: not available');
  });
});
