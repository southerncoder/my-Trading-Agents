import { AgentState } from '../../types/agent-states';

const UNAVAILABLE_PATTERNS = [
  /data acquisition failed/i,
  /data source connection failed/i,
  /not assessable/i,
  /\bUNAVAILABLE\b/,
];

export function isUnavailable(report?: string): boolean {
  const text = (report ?? '').trim();
  if (text.length < 40) return true;
  if (UNAVAILABLE_PATTERNS.some(re => re.test(text))) return true;
  return (text.match(/not available/gi) ?? []).length >= 6;
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
