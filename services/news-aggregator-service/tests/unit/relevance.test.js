import { describe, it, expect } from '@jest/globals';
import { filterRelevant, coreCompanyName } from '../../src/utils/relevance.js';

const NOW = Date.parse('2026-11-16T12:00:00Z');
const day = (n) => new Date(NOW - n * 86400000).toISOString();

describe('coreCompanyName', () => {
  it('strips articles and corporate suffixes', () => {
    expect(coreCompanyName('The Coca-Cola Company')).toBe('Coca-Cola');
    expect(coreCompanyName('Microsoft Corporation')).toBe('Microsoft');
    expect(coreCompanyName('Alphabet Inc.')).toBe('Alphabet');
    expect(coreCompanyName('')).toBe('');
  });
});

describe('filterRelevant', () => {
  const opts = { symbol: 'MSFT', company: 'Microsoft Corporation', lookBackDays: 7, now: NOW };

  it('keeps articles whose title names the ticker or company', () => {
    const { articles } = filterRelevant(
      [
        { title: 'MSFT shares rise on cloud demand', publishedAt: day(1) },
        { title: 'Microsoft unveils new Copilot features', publishedAt: day(2) },
      ],
      opts
    );
    expect(articles).toHaveLength(2);
  });

  it('keeps a company-name mention in the description only', () => {
    const { articles } = filterRelevant(
      [{ title: 'Big tech earnings preview', description: 'Microsoft and Apple report this week', publishedAt: day(1) }],
      opts
    );
    expect(articles).toHaveLength(1);
  });

  it('drops package listings that only mention the ticker in the description', () => {
    const { articles, stats } = filterRelevant(
      [{ title: 'alphadataforge added to PyPI', description: 'tickers like MSFT, AAPL', publishedAt: day(1) }],
      opts
    );
    expect(articles).toHaveLength(0);
    expect(stats.notRelevant).toBe(1);
  });

  it('ticker match is case-sensitive and word-bounded', () => {
    const ko = { symbol: 'KO', lookBackDays: 7, now: NOW };
    const { articles } = filterRelevant(
      [
        { title: 'Tokyo markets close higher', publishedAt: day(1) },
        { title: 'Why KO stock is a dividend favourite', publishedAt: day(1) },
        { title: 'ko is slang', publishedAt: day(1) },
      ],
      ko
    );
    expect(articles.map((a) => a.title)).toEqual(['Why KO stock is a dividend favourite']);
  });

  it('enforces the look-back window and keeps undated items by default', () => {
    const { articles, stats } = filterRelevant(
      [
        { title: 'MSFT old story', publishedAt: day(20) },
        { title: 'MSFT fresh story', publishedAt: day(2) },
        { title: 'MSFT quote page', publishedAt: null },
      ],
      opts
    );
    expect(articles.map((a) => a.title)).toEqual(['MSFT fresh story', 'MSFT quote page']);
    expect(stats.tooOld).toBe(1);
  });

  it('can drop undated items', () => {
    const { articles } = filterRelevant([{ title: 'MSFT quote page', publishedAt: null }], { ...opts, dropUndated: true });
    expect(articles).toHaveLength(0);
  });

  it('falls back to ticker-only matching when the company is unknown', () => {
    const { articles } = filterRelevant(
      [
        { title: 'Microsoft news without ticker', publishedAt: day(1) },
        { title: 'MSFT with ticker', publishedAt: day(1) },
      ],
      { symbol: 'MSFT', lookBackDays: 7, now: NOW }
    );
    expect(articles).toHaveLength(1);
  });
  it('caps the number of undated items kept', () => {
    const { articles, stats } = filterRelevant(
      [
        { title: 'MSFT dated', publishedAt: day(1) },
        { title: 'MSFT page A', publishedAt: null },
        { title: 'MSFT page B', publishedAt: null },
        { title: 'MSFT page C', publishedAt: null },
      ],
      { ...opts, maxUndated: 2 }
    );
    expect(articles.map((a) => a.title)).toEqual(['MSFT dated', 'MSFT page A', 'MSFT page B']);
    expect(stats.undatedDropped).toBe(1);
  });
});
