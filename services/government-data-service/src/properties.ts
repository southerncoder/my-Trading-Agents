/**
 * Item 2 ("Properties") of a company's latest 10-K: where it says its plants, offices, data centers, stores
 * and other physical assets are. Quoted from the filing, never summarized, so the page can show it as-is.
 */

export interface RecentFilingsLike {
  form?: string[];
  filingDate?: string[];
  accessionNumber?: string[];
  primaryDocument?: string[];
}

export interface PropertiesSection {
  form: string;
  filed: string;
  url: string;
  text: string;
  truncated: boolean;
}

/** URL of a filing's main document on EDGAR. */
export function filingUrl(cik: string, accession: string, doc: string): string {
  return `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accession.replace(/-/g, '')}/${doc}`;
}

/** The newest 10-K (or 20-F/40-F for foreign filers) filed on or before `asOf`. */
export function latestAnnualReport(cik: string, recent: RecentFilingsLike | undefined, asOf: string): { form: string; filed: string; url: string } | null {
  const forms = recent?.form ?? [];
  let best: { form: string; filed: string; url: string } | null = null;
  forms.forEach((form, i) => {
    if (!/^(10-K|20-F|40-F)$/.test(form)) return;
    const filed = recent?.filingDate?.[i];
    const acc = recent?.accessionNumber?.[i];
    const doc = recent?.primaryDocument?.[i];
    if (!filed || !acc || !doc || filed > asOf) return;
    if (!best || filed > best.filed) best = { form, filed, url: filingUrl(cik, acc, doc) };
  });
  return best;
}

const ENTITIES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', mdash: '—', ndash: '–', bull: '•', hellip: '…' };

/** Readable text from filing HTML: paragraphs and table rows become lines, tags and inline XBRL are dropped. */
export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|ix:header)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|tr|li|h\d)>|<br\s*\/?>/gi, '\n')
    .replace(/<\/t[dh]>/gi, ' \t ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
    .split('\n')
    .map((l) => l.replace(/[ \t ]+/g, ' ').trim())
    .filter((l) => l && !/^\d{1,3}$/.test(l)) // page numbers
    .join('\n');
}

// Headings are sometimes split by markup ("PR OPERTIES") or across two lines ("Item 2." then "Properties").
const PROPERTIES = String.raw`p\s*r\s*o\s*p\s*e\s*r\s*t\s*i\s*e\s*s`;
const START = new RegExp(String.raw`^item\s*2\s*[.:\-–—]?\s*${PROPERTIES}\b`, 'i');
const ITEM2_ALONE = /^item\s*2\s*[.:\-–—]?$/i;
const PROPERTIES_ALONE = new RegExp(String.raw`^${PROPERTIES}\b`, 'i');
const END = /^item\s*3\b/i;

/** Index of the first body line when line `i` opens Item 2, else -1. */
function startAt(lines: string[], i: number): number {
  if (START.test(lines[i])) return i;
  if (ITEM2_ALONE.test(lines[i]) && PROPERTIES_ALONE.test(lines[i + 1] ?? '')) return i + 1;
  return -1;
}

/**
 * The Item 2 section of the 10-K text. The table of contents also lists "Item 2. Properties", so the longest
 * stretch between an Item 2 heading and the next Item 3 heading wins.
 */
export function extractProperties(text: string, max = 6000): { text: string; truncated: boolean } | null {
  const lines = text.split('\n');
  let best: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const h = startAt(lines, i);
    if (h < 0) continue;
    const body: string[] = [];
    // The heading line may carry the first sentence after the title.
    const rest = lines[h].replace(START, '').replace(PROPERTIES_ALONE, '').replace(/^[\s.:]+/, '');
    if (rest) body.push(rest);
    for (let j = h + 1; j < lines.length && !END.test(lines[j]) && startAt(lines, j) < 0; j++) body.push(lines[j]);
    if (body.join(' ').length > best.join(' ').length) best = body;
  }
  const out = best.join('\n').trim();
  if (out.length < 40) return null;
  return out.length > max ? { text: `${out.slice(0, max).replace(/\s+\S*$/, '')}…`, truncated: true } : { text: out, truncated: false };
}
