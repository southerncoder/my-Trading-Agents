/**
 * Turn Brave's relative "age" strings ("3 hours ago", "2 days ago", "yesterday") into an ISO date.
 * Returns null when the text is missing or not understood, so an unknown date stays unknown
 * (never "now").
 */
const UNIT_MS = {
  second: 1000,
  minute: 60000,
  hour: 3600000,
  day: 86400000,
  week: 7 * 86400000,
  month: 30 * 86400000,
  year: 365 * 86400000,
};

export function relativeAgeToIso(age, now = Date.now()) {
  if (!age) return null;
  const s = String(age).trim().toLowerCase();
  if (s === 'yesterday') return new Date(now - UNIT_MS.day).toISOString();
  if (s === 'today' || s === 'just now') return new Date(now).toISOString();
  const m = s.match(/^(\d+)\s*(second|minute|hour|day|week|month|year)s?\s+ago$/);
  if (!m) return null;
  return new Date(now - Number(m[1]) * UNIT_MS[m[2]]).toISOString();
}

/** Prefer an explicit ISO date, then the relative age, otherwise null. */
export function braveDate(article, now = Date.now()) {
  const raw = article?.page_age || article?.page_fetched;
  if (raw) {
    // Brave sends UTC timestamps without a zone suffix; without "Z" JS would read them as local time.
    const s = String(raw);
    const iso = /(Z|[+-]\d\d:?\d\d)$/.test(s) ? s : s + 'Z';
    if (Number.isFinite(Date.parse(iso))) return new Date(iso).toISOString();
  }
  return relativeAgeToIso(article?.age, now);
}
