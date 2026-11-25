/**
 * Keep only articles that are really about a stock, and only recent ones.
 *
 * Provider searches like "MSFT stock OR MSFT trading" also return package
 * listings, quote pages and other companies' stories. An article is relevant when
 * its TITLE names the ticker or the company, or its description names the
 * company. A ticker that only shows up in the description is not enough (that is
 * how "added to PyPI" listings slip through). Undated articles are kept (they
 * sort last in the merge) unless `dropUndated` is set.
 */

const SUFFIXES = /\b(incorporated|inc|corporation|corp|company|co|limited|ltd|plc|holdings|holding|group|n\.?v|s\.?a|ag)\b\.?/gi;

/** "The Coca-Cola Company" -> "Coca-Cola"; "Microsoft Corporation" -> "Microsoft". */
export function coreCompanyName(name) {
  if (!name) return '';
  const core = String(name)
    .replace(/^the\s+/i, '')
    .replace(/[,.]/g, ' ')
    .replace(SUFFIXES, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return core.length >= 3 ? core : '';
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * How a title must name the ticker to count. Case-sensitive on purpose: "KO" must not match "ko".
 * A ticker glued to other letters by "-", "&", "." or "'" is part of another name ("T-Mobile", "L&T",
 * "T. Rowe Price", "F-150"). One- and two-letter tickers are ordinary letters, so for them only an
 * unmistakable form counts: "$T", "(T)" or "NYSE: T".
 */
export function tickerRegex(symbol) {
  const sym = escapeRe(String(symbol).toUpperCase());
  if (String(symbol).length <= 2) {
    return new RegExp(`((^|[^A-Za-z0-9&.'-])${sym}\\s+(stock|shares)\\b|\\$${sym}(?![A-Za-z0-9])|\\(${sym}\\)|\\b(NYSE|NASDAQ|Nasdaq|NYSEARCA|AMEX|NYSE American)\\s*:\\s*${sym}(?![A-Za-z0-9]))`);
  }
  return new RegExp(`(^|[^A-Za-z0-9&.'-])\\$?${sym}(?![A-Za-z0-9&]|[-.'][A-Za-z])`);
}

/** The provider search for a stock: by company name when it is known (always for short tickers), else by ticker. */
export function financialQuery(symbol, company) {
  const sym = String(symbol).toUpperCase();
  const core = coreCompanyName(company);
  if (core) return `"${core}" stock OR "${core}" shares${sym.length >= 3 ? ` OR ${sym} stock` : ''}`;
  return `${sym} stock OR ${sym} shares OR ${sym} market OR ${sym} trading`;
}

// First words too common to stand for one company on their own ("American Airlines", "General Motors").
const GENERIC_FIRST = new Set(['american', 'general', 'united', 'first', 'national', 'international', 'global', 'new', 'bank', 'the', 'royal', 'western', 'eastern', 'southern', 'northern', 'pacific', 'atlantic', 'advanced', 'applied', 'capital', 'citizens', 'community', 'energy', 'health', 'home', 'public', 'standard']);

/** The company's core name, plus its first word when that is distinctive ("Ford" for "Ford Motor"). */
function nameRegex(company) {
  const core = coreCompanyName(company);
  if (!core) return null;
  const first = core.split(/\s+/)[0];
  const alts = [core];
  if (first !== core && first.length >= 4 && !GENERIC_FIRST.has(first.toLowerCase())) alts.push(first);
  return new RegExp(`(^|[^A-Za-z0-9])(${alts.map(escapeRe).join('|')})(?![A-Za-z0-9])`, 'i');
}

/**
 * @param {object[]} articles
 * @param {{symbol: string, company?: string, lookBackDays?: number, now?: number, dropUndated?: boolean}} opts
 */
export function filterRelevant(articles, { symbol, company, lookBackDays, now = Date.now(), dropUndated = false, maxUndated = Infinity }) {
  const tick = tickerRegex(symbol);
  const name = nameRegex(company);
  const cutoff = Number(lookBackDays) > 0 ? now - Number(lookBackDays) * 86400000 : null;
  const stats = { input: 0, notRelevant: 0, tooOld: 0, undatedDropped: 0 };
  let undatedKept = 0;
  const kept = [];

  for (const a of Array.isArray(articles) ? articles : []) {
    stats.input++;
    const title = String(a?.title || '');
    const desc = String(a?.description || '');
    const relevant = tick.test(title) || (name && (name.test(title) || name.test(desc)));
    if (!relevant) {
      stats.notRelevant++;
      continue;
    }
    const t = Date.parse(a?.publishedAt);
    if (!Number.isFinite(t)) {
      if (dropUndated || undatedKept >= maxUndated) {
        stats.undatedDropped++;
        continue;
      }
      undatedKept++;
    } else if (cutoff !== null && t < cutoff) {
      stats.tooOld++;
      continue;
    }
    kept.push(a);
  }
  return { articles: kept, stats };
}

const nameCache = new Map();

/**
 * Best-effort company name from the yahoo-finance service; never throws, caches per symbol.
 * Returns '' when unknown, in which case only the ticker rule applies.
 */
export async function lookupCompanyName(symbol, baseUrl, fetchImpl = globalThis.fetch) {
  const key = String(symbol).toUpperCase();
  if (nameCache.has(key)) return nameCache.get(key);
  let name = '';
  if (baseUrl) {
    try {
      const res = await fetchImpl(`${baseUrl}/api/quote/${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const q = (await res.json())?.data;
        name = String(q?.displayName || q?.shortName || q?.longName || '');
      }
    } catch {
      // service down: fall back to ticker-only matching, and do not cache the miss
      return '';
    }
  }
  nameCache.set(key, name);
  return name;
}
