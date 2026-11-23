/** The structured decision the Portfolio Manager (and sometimes the Trader) writes as JSON inside its write-up. */
export interface StageDecision {
  decision?: string
  confidence?: number
  action_now?: string
  trigger_price?: number | null
  trigger_type?: string | null
  trigger_reason?: string
  walk_away_price?: number | null
  rationale?: string
  key_risks?: string[]
  data_gaps?: string[]
  what_would_change_my_mind?: string
}

/** Index just past the `}` closing the object that opens at `start`, skipping braces inside strings. */
function objectEnd(text: string, start: number): number {
  let depth = 0
  let inString = false
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (inString) {
      if (c === '\\') i++
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') inString = true
    else if (c === '{') depth++
    else if (c === '}' && --depth === 0) return i + 1
  }
  return -1
}

const strings = (v: unknown): string[] | undefined =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : undefined

/**
 * Finds the first JSON object in a write-up that looks like a decision. Returns it with the text around it
 * (fences and a redundant "FINAL DECISION: X" line removed), or null when there is none.
 */
export function extractDecision(text: string): { decision: StageDecision; rest: string } | null {
  for (let start = text.indexOf('{'); start !== -1; start = text.indexOf('{', start + 1)) {
    const end = objectEnd(text, start)
    if (end === -1) return null
    let parsed: unknown
    try {
      parsed = JSON.parse(text.slice(start, end))
    } catch {
      continue
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) continue
    const o = parsed as Record<string, unknown>
    if (!('decision' in o) && !('action_now' in o)) continue

    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
    const str = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined)
    const decision: StageDecision = {
      decision: str(o.decision)?.toUpperCase(),
      confidence: num(o.confidence) ?? undefined,
      action_now: str(o.action_now),
      trigger_price: num(o.trigger_price),
      trigger_type: str(o.trigger_type) ?? null,
      trigger_reason: str(o.trigger_reason),
      walk_away_price: num(o.walk_away_price),
      rationale: str(o.rationale),
      key_risks: strings(o.key_risks),
      data_gaps: strings(o.data_gaps),
      what_would_change_my_mind: str(o.what_would_change_my_mind),
    }

    const rest = (text.slice(0, start) + '\n' + text.slice(end))
      .split(/\r?\n/)
      .filter((line) => {
        const t = line.trim()
        if (/^`{3}\w*$/.test(t)) return false
        const fd = /^\**\s*FINAL (?:TRANSACTION )?DECISION\s*:?\s*\**\s*([A-Z]+)\**\s*$/i.exec(t)
        return !(fd && decision.decision && fd[1].toUpperCase() === decision.decision)
      })
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    return { decision, rest }
  }
  return null
}
