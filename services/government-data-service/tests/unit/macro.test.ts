import { describe, expect, it } from 'vitest';
import { blsAsOf, blsLines, fredLines, macroDigest, type BlsSeriesLike } from '../../src/macro';

const series = (id: string, rows: Array<[string, string, string]>): BlsSeriesLike => ({
  seriesID: id,
  data: rows.map(([year, period, value]) => ({ year, period, value })),
});

describe('blsAsOf', () => {
  const unemployment = series('LNS14000000', [['2026', 'M10', '4.1'], ['2026', 'M09', '4.2'], ['2026', 'M13', '4.0'], ['2025', 'M12', '4.3']]);

  it('counts a month only after its release date (jobs report from the 8th of the next month)', () => {
    expect(blsAsOf(unemployment, 'unemployment', '2026-11-07').map((p) => p.month)).toEqual(['2025-12', '2026-09']);
    expect(blsAsOf(unemployment, 'unemployment', '2026-11-08').map((p) => p.month)).toEqual(['2025-12', '2026-09', '2026-10']);
  });

  it('drops annual averages and handles December releasing in January', () => {
    expect(blsAsOf(unemployment, 'unemployment', '2026-01-07').map((p) => p.month)).toEqual([]);
    expect(blsAsOf(unemployment, 'unemployment', '2026-01-08').map((p) => p.month)).toEqual(['2025-12']);
  });

  it('CPI waits until the 16th of the next month', () => {
    const cpi = series('CUUR0000SA0', [['2026', 'M10', '337.5']]);
    expect(blsAsOf(cpi, 'cpi', '2026-11-15')).toEqual([]);
    expect(blsAsOf(cpi, 'cpi', '2026-11-16')).toEqual([{ month: '2026-10', value: 337.5 }]);
  });
});

describe('blsLines', () => {
  it('reports unemployment, payroll changes and year-over-year inflation', () => {
    const m = (month: string, value: number) => ({ month, value });
    const lines = blsLines({
      unemployment: [m('2026-07', 4.0), m('2026-08', 4.0), m('2026-09', 4.2), m('2026-10', 4.1)],
      payrolls: [m('2026-07', 159000), m('2026-08', 159100), m('2026-09', 159250), m('2026-10', 159310)],
      cpi: [m('2025-10', 324.0), m('2026-10', 333.72)],
      coreCpi: [m('2025-10', 330.0), m('2026-10', 339.24)],
    });
    expect(lines).toEqual([
      '- Unemployment rate 4.1% (Oct 2026), 4.0% three months earlier.',
      '- Nonfarm payrolls +60k jobs in Oct 2026; three-month average +103k.',
      '- Inflation (CPI, year over year) 3.0% in Oct 2026; core (ex food and energy) 2.8%.',
    ]);
  });

  it('uses the latest month with a year-earlier value when BLS skipped one', () => {
    const m = (month: string, value: number) => ({ month, value });
    const lines = blsLines({ unemployment: [], payrolls: [], cpi: [m('2025-09', 300), m('2026-09', 309), m('2026-10', 310)], coreCpi: [] });
    expect(lines).toEqual(['- Inflation (CPI, year over year) 3.0% in Sep 2026.']);
  });

  it('gives the previous inflation reading so the direction is stated', () => {
    const m = (month: string, value: number) => ({ month, value });
    const cpi = [m('2025-08', 300), m('2025-09', 300), m('2026-08', 312), m('2026-09', 309)];
    expect(blsLines({ unemployment: [], payrolls: [], cpi, coreCpi: [] })).toEqual(['- Inflation (CPI, year over year) 3.0% in Sep 2026 (4.0% in Aug 2026).']);
  });

  it('leaves out what it cannot compute', () => {
    expect(blsLines({ unemployment: [], payrolls: [{ month: '2026-10', value: 1 }], cpi: [{ month: '2026-10', value: 300 }], coreCpi: [] })).toEqual([]);
  });
});

describe('fredLines', () => {
  it('gives the latest value with a month and a year earlier, skipping missing days and later data', () => {
    const lines = fredLines({
      t10y: [
        { date: '2025-11-20', value: '4.40' },
        { date: '2026-10-20', value: '4.10' },
        { date: '2026-11-19', value: '4.25' },
        { date: '2026-11-20', value: '.' },
        { date: '2026-11-24', value: '9.99' },
      ],
      oil: [{ date: '2026-11-19', value: '61.5' }],
      gdp: [{ date: '2026-07-01', value: '2.8' }],
    }, '2026-11-20');
    expect(lines).toEqual([
      '- 10-year Treasury yield: 4.25% on 2026-11-19 (4.10% a month earlier, 4.40% a year earlier).',
      '- WTI crude oil: $61.50 on 2026-11-19.',
      '- Real GDP growth (annualized, latest quarter): 2.80% (quarter starting 2026-07-01).',
    ]);
  });
});

describe('macroDigest', () => {
  it('names the sources and states what is missing', () => {
    const d = macroDigest({ asOf: '2026-11-20', bls: ['- a'], fred: [], notes: ['no FRED key'] });
    expect(d).toContain('MACRO BACKDROP as known on 2026-11-20');
    expect(d).toContain('Jobs and inflation (Bureau of Labor Statistics):\n- a');
    expect(d).not.toContain('Federal Reserve Economic Data');
    expect(d).toContain('Note: no FRED key');
    expect(macroDigest({ asOf: 'x', bls: [], fred: [], notes: [] })).toContain('No macro data could be loaded.');
  });
});
