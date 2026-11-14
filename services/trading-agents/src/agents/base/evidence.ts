import { AgentState } from '../../types/agent-states';

const UNAVAILABLE_PATTERNS = [
  /data acquisition failed/i,
  /data source connection failed/i,
  /not assessable/i,
  /\b(news|social|market|fundamentals?) data unavailable\b/i,
];

export function isUnavailable(report?: string): boolean {
  const text = (report ?? '').trim();
  if (text.length < 40) return true;
  if (UNAVAILABLE_PATTERNS.some(re => re.test(text))) return true;
  // Many "not available" mentions only mean a failed report when the report is also short;
  // a long report with some missing indicators (IV, MACD, ...) is still usable.
  return text.length < 1500 && (text.match(/not available/gi) ?? []).length >= 6;
}

export interface DataQuality {
  market: boolean;
  news: boolean;
  fundamentals: boolean;
  social: boolean;
  /** true when any of market/news/fundamentals is unavailable */
  criticalMissing: boolean;
  missing: string[];
}

export function assessDataQuality(state: Partial<AgentState>): DataQuality {
  const market = !isUnavailable(state.market_report);
  const news = !isUnavailable(state.news_report);
  const fundamentals = !isUnavailable(state.fundamentals_report);
  const social = !isUnavailable(state.sentiment_report);
  const missing = [
    !market && 'market',
    !news && 'news',
    !fundamentals && 'fundamentals',
    !social && 'social',
  ].filter(Boolean) as string[];
  return { market, news, fundamentals, social, criticalMissing: !(market && news && fundamentals), missing };
}

/** Evidence appended to risk / PM / trader prompts. Kept short for the 16k context. */
export function buildEvidenceBlock(state: Partial<AgentState>, maxPerReport = 1800): string {
  const q = assessDataQuality(state);
  const section = (title: string, text?: string) =>
    `### ${title}\n${(text ?? 'not available').slice(0, maxPerReport)}`;
  return (
    '\n\n---\nANALYST EVIDENCE (use only this; do not invent figures):\n' +
    section('Market report', state.market_report) + '\n' +
    section('News report', state.news_report) + '\n' +
    section('Fundamentals report', state.fundamentals_report) + '\n' +
    section('Social sentiment report', state.sentiment_report) + '\n' +
    `DATA QUALITY: ${q.missing.length ? 'UNAVAILABLE -> ' + q.missing.join(', ') + '. Do not claim conclusions that depend on missing data; lower confidence accordingly.' : 'all reports available'}\n`
  );
}

/** Shared output rules appended to debate / planning prompts: short, sourced, honest about unverified claims. */
export function outputDiscipline(maxWords: number): string {
  return (
    '\n\nOUTPUT RULES:\n' +
    `- Maximum ${maxWords} words. Use short bullet points; no preamble and no repeated restatement of the inputs.\n` +
    '- Tag every figure with its source in brackets: [market], [news], [fundamentals] or [social]. Do not use figures that are not in the supplied reports.\n' +
    '- Label any news item you rely on as confirmed (primary source or several outlets) or unconfirmed. Never present an unconfirmed item as fact.\n' +
    '- If a report is marked UNAVAILABLE or a figure is missing, say so plainly instead of guessing.\n' +
    '- Address the opposing arguments directly by naming the specific point you are answering.'
  );
}
