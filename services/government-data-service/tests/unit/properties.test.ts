import { describe, expect, it } from 'vitest';
import { extractProperties, htmlToText, latestAnnualReport } from '../../src/properties.js';

describe('latestAnnualReport', () => {
  it('picks the newest 10-K filed by asOf', () => {
    const recent = {
      form: ['8-K', '10-K', '10-Q', '10-K'],
      filingDate: ['2026-11-23', '2026-02-20', '2026-10-28', '2025-02-21'],
      accessionNumber: ['a', '0000021344-26-000010', 'c', '0000021344-25-000010'],
      primaryDocument: ['x.htm', 'ko-20251231.htm', 'q.htm', 'ko-20241231.htm'],
    };
    expect(latestAnnualReport('0000021344', recent, '2026-11-23')).toEqual({
      form: '10-K',
      filed: '2026-02-20',
      url: 'https://www.sec.gov/Archives/edgar/data/21344/000002134426000010/ko-20251231.htm',
    });
    expect(latestAnnualReport('21344', recent, '2026-01-01')?.filed).toBe('2025-02-21');
    expect(latestAnnualReport('21344', undefined, '2026-01-01')).toBeNull();
  });
});

describe('extractProperties', () => {
  const html = `
    <div>Table of contents</div>
    <div>Item 2. Properties</div><div>12</div>
    <div>Item 3. Legal Proceedings</div>
    <div><span>ITEM 2. PROPERTIES</span></div>
    <p>Our worldwide headquarters is located on a 35-acre office complex in Atlanta, Georgia.</p>
    <p>We own or lease 23 principal beverage concentrate and syrup plants &amp; 87 bottling plants.</p>
    <div>34</div>
    <div>ITEM 3. LEGAL PROCEEDINGS</div>
    <p>The company is a party to lawsuits.</p>`;

  it('returns the body of Item 2, not the table of contents line', () => {
    const r = extractProperties(htmlToText(html))!;
    expect(r.text).toBe(
      'Our worldwide headquarters is located on a 35-acre office complex in Atlanta, Georgia.\nWe own or lease 23 principal beverage concentrate and syrup plants & 87 bottling plants.',
    );
    expect(r.truncated).toBe(false);
  });

  it('caps long sections at a word boundary', () => {
    const r = extractProperties(htmlToText(html), 60)!;
    expect(r.truncated).toBe(true);
    expect(r.text.endsWith('…')).toBe(true);
  });

  it('is null when there is no Item 2', () => {
    expect(extractProperties('Nothing here')).toBeNull();
  });
});

describe('extractProperties heading variants', () => {
  it('reads a heading split by markup or across two lines', () => {
    const text = ['Item 2.', 'Properties', 'Item 3.', 'Legal Proceedings', 'Item 2, 3, 4', 'ITEM 2. PR OPERTIES', 'Our corporate headquarters are located in Redmond, Washington, on owned land.', 'ITEM 3. LEGAL PROCEEDINGS', 'Refer to Note 14.'].join('\n');
    expect(extractProperties(text)?.text).toBe('Our corporate headquarters are located in Redmond, Washington, on owned land.');
  });
});
