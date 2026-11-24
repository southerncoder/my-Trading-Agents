/**
 * Regulatory matters a night's write-ups mention for one stock, found by fixed patterns (no model call), so every
 * matter shown can be traced to the sentences it came from.
 *
 * Two kinds of matter:
 * - enforcement (antitrust, lawsuits, securities, safety, health regulators): Reported -> Investigation ->
 *   Formal charges -> Decision or settlement -> Appeal;
 * - policy (tariffs and export rules, bank rules, environment, privacy and digital rules): Talked about -> Proposed
 *   -> Adopted -> In force.
 *
 * A sentence written as a possibility ("could", "may", "potential", "if") is kept as a mention but never moves a
 * matter's stage and never makes it active on its own.
 */

export type MatterKind = 'enforcement' | 'policy'

export const ENFORCEMENT_STAGES = ['Reported', 'Investigation', 'Charges or suit filed', 'Decision or settlement', 'Appeal'] as const
export const POLICY_STAGES = ['Talked about', 'Proposed', 'Adopted', 'In force'] as const

interface Theme {
  key: string
  title: string
  kind: MatterKind
  pattern: RegExp
}

const THEMES: Theme[] = [
  {
    key: 'competition',
    title: 'Antitrust and competition',
    kind: 'enforcement',
    pattern: /\b(antitrust|anti-?competitive|competition (?:authorit\w+|regulators?|law|probe|case|concerns?)|monopol\w+|abuse of (?:a )?dominan\w+)\b/i,
  },
  {
    key: 'securities',
    title: 'Securities and accounting',
    kind: 'enforcement',
    pattern: /\b(SEC (?:probe|investigation|inquiry|charges?|subpoena|settlement|enforcement)|accounting (?:probe|investigation|irregularit\w+)|insider trading (?:probe|charges?|investigation))\b/i,
  },
  {
    key: 'health',
    title: 'Health regulators (FDA, CMS)',
    kind: 'policy',
    pattern: /\b(FDA|CMS|Medicare (?:negotiation|pricing|price|rates?|cuts?|advantage rates?)|drug[- ]pricing|Medicaid (?:cuts?|rules?)|clinical hold|warning letter)\b/,
  },
  {
    key: 'safety',
    title: 'Product safety and recalls',
    kind: 'enforcement',
    pattern: /\b(recalls?|recalled|NHTSA|safety (?:probe|investigation|regulators?))\b/i,
  },
  {
    key: 'litigation',
    title: 'Lawsuits',
    kind: 'enforcement',
    pattern: /\b(lawsuits?|class[- ]action|litigation|sued|jury verdict)\b/i,
  },
  {
    key: 'trade',
    title: 'Tariffs and export rules',
    kind: 'policy',
    pattern: /\b(tariffs?|export (?:controls?|restrictions?|bans?|licen[cs]es?|curbs?|rules?)|sanctions|import dut(?:y|ies)|trade war|entity list)\b/i,
  },
  {
    key: 'banking',
    title: 'Bank capital and lending rules',
    kind: 'policy',
    pattern: /\b(capital requirements?|Basel(?: III| endgame)?|(?:bank|Fed) stress tests?|CFPB|supplementary leverage ratio)\b/i,
  },
  {
    key: 'privacy',
    title: 'Privacy and digital-market rules',
    kind: 'policy',
    pattern: /\b(GDPR|data[- ]protection (?:rules?|law|regulators?)|privacy (?:rules?|law|regulators?|fines?)|Digital Markets Act|Digital Services Act|AI Act)\b/i,
  },
  {
    key: 'environment',
    title: 'Environmental rules',
    kind: 'policy',
    pattern: /\b(EPA|emissions? (?:rules?|standards?|limits?)|climate disclosure)\b/i,
  },
]

const AGENCIES: Array<[RegExp, string]> = [
  [/\bEuropean Commission\b/i, 'European Commission'],
  [/\b(?:EU|European Union)\b/, 'EU'],
  [/\bFTC\b|Federal Trade Commission/, 'FTC'],
  [/\bDOJ\b|Justice Department|Department of Justice/, 'US Justice Dept.'],
  [/\bSEC\b(?! filing)/, 'SEC'],
  [/\bFDA\b/, 'FDA'],
  [/\bCMS\b/, 'CMS'],
  [/\bNHTSA\b/, 'NHTSA'],
  [/\bEPA\b/, 'EPA'],
  [/\bCFPB\b/, 'CFPB'],
  [/\bCMA\b|Competition and Markets Authority/, 'UK CMA'],
  [/Commerce Department|Department of Commerce|\bBIS\b/, 'US Commerce Dept.'],
  [/\bFederal Reserve\b|\bthe Fed\b/, 'Federal Reserve'],
  [/\bSAMR\b|China'?s? (?:regulators?|market regulator)/, 'China regulators'],
]

const HYPOTHETICAL = /\b(could|may|might|would|potential(?:ly)?|possible|possibly|if|risk of|threat of|any|should|whether)\b/i

const ENFORCEMENT_EVIDENCE: Array<[number, RegExp]> = [
  [4, /\bappeal(?:ed|ing|s)?\b/i],
  [3, /\b(fined|settled|ruled|ruling (?:against|in favou?r)|penalty of|imposed a (?:fine|penalty)|verdict|cleared by)\b/i],
  [2, /\b(charged|charges were|statement of objections|filed (?:a |an )?(?:suit|lawsuit|complaint)|sued|indicted|(?:lawsuit|suit|class action) (?:is|was|has been) (?:currently )?(?:filed|active|pending)|pending (?:lawsuit|litigation)|ongoing (?:[\w-]+ ){0,3}(?:litigation|lawsuit))\b/i],
  [1, /\b(probes?|investigat\w*|inquiry|subpoena\w*|under review|opened a case)\b/i],
]

const POLICY_EVIDENCE: Array<[number, RegExp]> = [
  [3, /\b(in (?:effect|force)|took effect|takes effect|effective (?:from|on|since))\b/i],
  [2, /\b(finali[sz]ed|imposed|adopted|enacted|signed into law|approved)\b/i],
  [1, /\b(propos\w+|draft (?:rule|law|regulation)|considering|plans? to)\b/i],
]

/** Where a sentence came from, data stages first: those report the facts, the debate stages argue over them. */
export const STAGE_ORDER = ['news', 'fundamentals', 'social', 'market', 'bear', 'bull', 'research_manager', 'trader', 'aggressive', 'conservative', 'neutral', 'pm'] as const
const DATA_STAGES = new Set(['news', 'fundamentals', 'social', 'market'])

export interface Mention {
  stage: string
  text: string
  hypothetical: boolean
}

export type Use = 'key_risk' | 'data_gap' | 'change_mind' | 'rationale' | 'bear' | 'bull'

export interface Matter {
  key: string
  title: string
  kind: MatterKind
  stages: readonly string[]
  stage: number
  /** True when at least one sentence states it as happening, not as a possibility. */
  active: boolean
  /** True when a data analyst (news, fundamentals, social, market) reported it, not only the debate. */
  reported: boolean
  agencies: string[]
  mentions: Mention[]
  usedBy: Use[]
  /** The Portfolio Manager's own sentences about this matter (key risks, gaps, what would change its mind). */
  callText: { use: Use; text: string }[]
  /** Companies a probe or suit is said to be into or against, when that is not this company (sector spillover). */
  about: string[]
  /** EU and UK competition fines are capped at 10% of worldwide yearly revenue. */
  fineCapPct?: number
}

export type Exposure = 'none' | 'watch' | 'elevated' | 'high'

/** Plain sentences from markdown: list markers, emphasis and table pipes removed. */
export function sentences(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*+>]|\d+\.|#+)\s*/, '').replace(/\*\*|__|`/g, '').replace(/\|/g, ' ').trim())
    .filter(Boolean)
    .flatMap((l) => l.split(/(?<=[.!?])\s+(?=[A-Z"(])/))
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length >= 20)
}

const clip = (s: string, n = 320) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

/** The Portfolio Manager's JSON decision inside its write-up, or null. */
export function pmDecision(text: string | undefined): Record<string, unknown> | null {
  if (!text) return null
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const v: unknown = JSON.parse(text.slice(start, end + 1))
    return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null
  } catch {
    return null
  }
}

const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : typeof v === 'string' ? [v] : [])

/** Every theme any of the night's write-ups mention, with its stage, sources and how the final call used it. */
const TARGET = /\b(?:probes?|investigations?|inquiry|lawsuits?|suit|case|charges) (?:into|against|of|over) ([A-Z][\w&.-]*(?: [A-Z][\w&.-]*)?)/g
/** "the Nvidia SEC probe", "Nvidia's antitrust case". */
const OWNER = /\b([A-Z][a-z][\w&.-]*)(?:['’]s)? (?:SEC|FTC|DOJ|EU|antitrust|accounting|securities|fraud) (?:probe|investigation|inquiry|lawsuit|case)\b/g
const NOT_A_COMPANY =
  /^(the|its|their|this|our|a|an|any|further|formal|key|legal|regulatory|reported|recent|new|ongoing|unconfirmed|potential|possible|european|commission|federal|us|u\.s\.|eu|sec|ftc|doj|global|sector|market|class|securities)$/i
const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Names a sentence says a probe or suit targets, other than this company (a match on any alias counts as this one). */
export function otherTargets(text: string, aliases: string[]): string[] {
  const mine = aliases.map(squash).filter((a) => a.length >= 2)
  const out: string[] = []
  for (const m of [...text.matchAll(TARGET), ...text.matchAll(OWNER)]) {
    const name = m[1].replace(/['’]s$/, '')
    if (NOT_A_COMPANY.test(name.split(' ')[0])) continue
    const n = squash(name)
    // Same company when one name starts the other or they share a 5-letter start ("cocacolaco" / "cocacolaeuropacific").
    if (mine.some((a) => n.startsWith(a) || a.startsWith(n) || (a.length >= 5 && n.length >= 5 && a.slice(0, 5) === n.slice(0, 5)))) continue
    out.push(name.split(' ')[0])
  }
  return out
}

/**
 * `aliases` are names for this company (ticker, SEC name): a probe "into Nvidia" on MSFT's page is marked as being
 * about another company and does not raise MSFT's exposure.
 */
export function findMatters(stages: Record<string, string>, aliases: string[] = []): Matter[] {
  const pm = pmDecision(stages.pm)
  const pmFields: Array<[Use, string[]]> = [
    ['key_risk', strings(pm?.key_risks)],
    ['data_gap', strings(pm?.data_gaps)],
    ['change_mind', strings(pm?.what_would_change_my_mind)],
    ['rationale', strings(pm?.rationale)],
  ]
  const out: Matter[] = []

  for (const theme of THEMES) {
    const mentions: Mention[] = []
    const seen = new Set<string>()
    for (const stage of STAGE_ORDER) {
      // The pm write-up is mostly the JSON decision: its fields are read below, not as prose.
      if (stage === 'pm' || !stages[stage]) continue
      for (const s of sentences(stages[stage])) {
        if (!theme.pattern.test(s)) continue
        const norm = s.toLowerCase().replace(/\W+/g, ' ')
        if (seen.has(norm)) continue
        seen.add(norm)
        mentions.push({ stage, text: clip(s), hypothetical: HYPOTHETICAL.test(s) })
      }
    }
    const callText = pmFields.flatMap(([use, list]) => list.filter((t) => theme.pattern.test(t)).map((text) => ({ use, text: clip(text) })))
    if (mentions.length === 0 && callText.length === 0) continue

    const about = [...new Set(mentions.flatMap((m) => otherTargets(m.text, aliases)))]
    // A sentence naming another company as the target is spillover talk: kept, but it never makes the matter this company's.
    const factual = mentions.filter((m) => !m.hypothetical && otherTargets(m.text, aliases).length === 0)
    const evidence = theme.kind === 'enforcement' ? ENFORCEMENT_EVIDENCE : POLICY_EVIDENCE
    let stage = 0
    for (const m of factual) for (const [n, re] of evidence) if (n > stage && re.test(m.text)) stage = n

    const all = [...mentions.map((m) => m.text), ...callText.map((c) => c.text)].join(' ')
    const agencies = AGENCIES.filter(([re]) => re.test(all)).map(([, name]) => name)
    // "EU" adds nothing next to "European Commission".
    const named = agencies.includes('European Commission') ? agencies.filter((a) => a !== 'EU') : agencies

    const usedBy = new Set<Use>(callText.map((c) => c.use))
    if (mentions.some((m) => m.stage === 'bear')) usedBy.add('bear')
    if (mentions.some((m) => m.stage === 'bull')) usedBy.add('bull')

    out.push({
      key: theme.key,
      title: theme.title,
      kind: theme.kind,
      stages: theme.kind === 'enforcement' ? ENFORCEMENT_STAGES : POLICY_STAGES,
      stage,
      active: factual.length > 0,
      reported: factual.some((m) => DATA_STAGES.has(m.stage)),
      agencies: named,
      about,
      mentions: mentions.sort((a, b) => Number(a.hypothetical) - Number(b.hypothetical)).slice(0, 6),
      usedBy: [...usedBy],
      callText,
      fineCapPct: theme.key === 'competition' && named.some((a) => a === 'European Commission' || a === 'EU' || a === 'UK CMA') ? 10 : undefined,
    })
  }

  // Matters the final call leans on first, then the ones a data analyst reported, then the rest.
  const weight = (m: Matter) => (m.callText.length ? 4 : 0) + (m.reported ? 2 : 0) + (m.active ? 1 : 0)
  return out.sort((a, b) => weight(b) - weight(a) || b.stage - a.stage)
}

/**
 * One label for the stock, defined by stage so it can be checked: high = a regulator's charges (or, for a lawsuit,
 * a ruling) reported by an analyst; elevated = any reported matter under way; watch = only possibilities or
 * debate talk; none = nothing found.
 */
export function exposureOf(matters: Matter[]): Exposure {
  if (matters.length === 0) return 'none'
  // Large companies nearly always have a filed lawsuit somewhere; for lawsuits only a ruling counts as high.
  if (matters.some((m) => m.reported && m.kind === 'enforcement' && m.stage >= (m.key === 'litigation' ? 3 : 2))) return 'high'
  if (matters.some((m) => m.reported && m.active && (m.stage >= 1 || m.callText.length > 0))) return 'elevated'
  return 'watch'
}

/** Keys of the themes a night's write-ups mention anywhere. */
export function themesIn(stages: Record<string, string> | null): string[] {
  if (!stages) return []
  const text = Object.values(stages).join('\n')
  return THEMES.filter((t) => t.pattern.test(text)).map((t) => t.key)
}
