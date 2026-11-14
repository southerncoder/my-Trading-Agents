export type Action = 'BUY' | 'HOLD' | 'SELL';
export type ActionNow = 'enter_now' | 'wait_for_trigger' | 'hold_existing' | 'reduce' | 'exit';

export interface ParsedDecision {
  decision: Action;
  confidence: number;
  source: 'json' | 'lines' | 'default';
  actionNow?: ActionNow | undefined;
  rationale?: string | undefined;
  keyRisks?: string[] | undefined;
  dataGaps?: string[] | undefined;
  changeMyMind?: string | undefined;
  /** Set when the consistency check overrode the model's stated decision. */
  downgradeReason?: string | undefined;
}

const ACTIONS: Action[] = ['BUY', 'HOLD', 'SELL'];
const ACTION_NOW: ActionNow[] = ['enter_now', 'wait_for_trigger', 'hold_existing', 'reduce', 'exit'];
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const strList = (v: unknown): string[] | undefined =>
  Array.isArray(v) ? v.map(x => String(x)).filter(Boolean).slice(0, 8) : undefined;

function lastJsonBlock(text: string): any | undefined {
  const fenced = [...text.matchAll(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/gi)].pop();
  const candidates = fenced ? [fenced[1]] : [];
  // Fallback: last top-level {...} that mentions "decision".
  const raw = [...text.matchAll(/\{[^{}]*"decision"[^{}]*\}/g)].pop();
  if (raw) candidates.push(raw[0]);
  for (const c of candidates.reverse()) {
    if (!c) continue;
    try {
      return JSON.parse(c);
    } catch {
      /* try next */
    }
  }
  return undefined;
}

function parseLines(text: string): { decision?: Action | undefined; confidence?: number | undefined } {
  const last = (re: RegExp) => [...text.matchAll(re)].pop();
  // Line-anchored so an echoed template ("BUY, HOLD or SELL") is rejected rather than read as BUY.
  const d = last(/^[\s*_`#>-]*FINAL DECISION:\s*[*_`\s]*(BUY|HOLD|SELL)[\s*_`.]*$/gim);
  const c = last(/^[\s*_`#>-]*CONFIDENCE:\s*[*_`\s]*(0(?:\.\d+)?|1(?:\.0+)?)[\s*_`.]*$/gim);
  return {
    decision: d?.[1] ? (d[1].toUpperCase() as Action) : undefined,
    confidence: c?.[1] ? Number(c[1]) : undefined,
  };
}

/** Parse the Portfolio Manager output: JSON block first, explicit lines second, HOLD 0.3 default. */
export function parseDecision(text: string): ParsedDecision {
  const json = lastJsonBlock(text);
  const lines = parseLines(text);

  let out: ParsedDecision;
  const jd = typeof json?.decision === 'string' ? (json.decision.toUpperCase() as Action) : undefined;
  if (jd && ACTIONS.includes(jd)) {
    const jc = Number(json.confidence);
    const an = typeof json.action_now === 'string' ? (json.action_now as ActionNow) : undefined;
    out = {
      decision: jd,
      confidence: Number.isFinite(jc) ? clamp01(jc) : lines.confidence ?? 0.5,
      source: 'json',
      actionNow: an && ACTION_NOW.includes(an) ? an : undefined,
      rationale: typeof json.rationale === 'string' ? json.rationale : undefined,
      keyRisks: strList(json.key_risks),
      dataGaps: strList(json.data_gaps),
      changeMyMind: typeof json.what_would_change_my_mind === 'string' ? json.what_would_change_my_mind : undefined,
    };
  } else if (lines.decision) {
    out = { decision: lines.decision, confidence: lines.confidence ?? 0.5, source: 'lines' };
  } else {
    return { decision: 'HOLD', confidence: 0.3, source: 'default' };
  }

  // Consistency check: the decision must agree with what the model says it will do now.
  if (out.decision === 'BUY' && (out.actionNow === 'wait_for_trigger' || out.actionNow === 'hold_existing')) {
    out.downgradeReason = `Stated BUY but action_now=${out.actionNow}; downgraded to HOLD.`;
    out.decision = 'HOLD';
  } else if (out.decision === 'SELL' && (out.actionNow === 'enter_now' || out.actionNow === 'wait_for_trigger')) {
    out.downgradeReason = `Stated SELL but action_now=${out.actionNow}; downgraded to HOLD.`;
    out.decision = 'HOLD';
  } else if (out.decision === 'HOLD' && out.actionNow === 'enter_now') {
    out.downgradeReason = 'Stated HOLD but action_now=enter_now; kept HOLD (conservative).';
  }
  return out;
}
