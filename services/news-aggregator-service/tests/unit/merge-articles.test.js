import { describe, it, expect } from '@jest/globals';
import { mergeArticles } from '../../src/utils/merge-articles.js';

const a = (title, url, publishedAt) => ({ title, url, publishedAt });

describe('mergeArticles', () => {
  it('collapses the same story reported by two providers and records both', () => {
    const out = mergeArticles([
      { provider: 'brave-news', articles: [a('Coca-Cola beats estimates', 'https://www.reuters.com/x/1', '2026-11-14T10:00:00Z')] },
      { provider: 'google-news', articles: [a('Coca-Cola beats estimates!', 'https://reuters.com/x/1/', '2026-11-14T10:05:00Z')] },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].provider).toBe('brave-news');
    expect(out[0].alsoReportedBy).toEqual(['google-news']);
  });

  it('dedupes by URL when titles differ', () => {
    const out = mergeArticles([
      { provider: 'a', articles: [a('Headline one', 'https://site.com/story?id=1', '2026-11-14T10:00:00Z')] },
      { provider: 'b', articles: [a('A different headline', 'https://www.site.com/story', '2026-11-14T11:00:00Z')] },
    ]);
    expect(out).toHaveLength(1);
  });

  it('sorts newest first, puts undated last, and respects the limit', () => {
    const out = mergeArticles(
      [
        { provider: 'a', articles: [a('old', 'https://x.com/1', '2026-11-10T00:00:00Z'), a('undated', 'https://x.com/2')] },
        { provider: 'b', articles: [a('new', 'https://y.com/1', '2026-11-14T00:00:00Z')] },
      ],
      2
    );
    expect(out.map((x) => x.title)).toEqual(['new', 'old']);
  });

  it('ignores empty or malformed input', () => {
    expect(mergeArticles([{ provider: 'a', articles: null }, { provider: 'b', articles: [{}] }])).toEqual([]);
  });
});
