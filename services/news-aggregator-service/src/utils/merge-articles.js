/**
 * Merge article lists from several news providers into one list.
 * Duplicates (same story from different providers) are collapsed by normalised
 * title or by URL host+path. The first provider to report a story keeps it and
 * later ones are recorded in `alsoReportedBy`. Newest first.
 */

const normTitle = (t) =>
  String(t || '')
    .toLowerCase()
    .replace(/&amp;/g, '&')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90);

function urlKey(u) {
  try {
    const x = new URL(u);
    return (x.hostname.replace(/^www\./, '') + x.pathname).replace(/\/+$/, '').toLowerCase();
  } catch {
    return '';
  }
}

const when = (a) => {
  const t = Date.parse(a?.publishedAt);
  return Number.isFinite(t) ? t : 0;
};

/**
 * @param {Array<{provider: string, articles: object[]}>} results
 * @param {number} limit
 * @returns {object[]}
 */
export function mergeArticles(results, limit = 20) {
  const byTitle = new Map();
  const byUrl = new Map();
  const merged = [];

  for (const { provider, articles } of results) {
    for (const a of Array.isArray(articles) ? articles : []) {
      const tk = normTitle(a?.title);
      const uk = urlKey(a?.url);
      if (!tk && !uk) continue;
      const existing = (tk && byTitle.get(tk)) || (uk && byUrl.get(uk));
      if (existing) {
        if (existing.provider !== provider && !existing.alsoReportedBy.includes(provider)) {
          existing.alsoReportedBy.push(provider);
        }
        continue;
      }
      const item = { ...a, provider, alsoReportedBy: [] };
      merged.push(item);
      if (tk) byTitle.set(tk, item);
      if (uk) byUrl.set(uk, item);
    }
  }

  return merged.sort((x, y) => when(y) - when(x)).slice(0, limit);
}
