export type Inline = { text: string; bold: boolean }

export type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; inline: Inline[] }
  | { kind: 'bullets'; ordered: boolean; items: Inline[][] }
  | { kind: 'paragraph'; inline: Inline[] }
  | { kind: 'code'; text: string }

/** `**bold**` only. An unbalanced marker leaves the whole line as plain text. */
function parseInline(text: string): Inline[] {
  const parts = text.split('**')
  if (parts.length % 2 === 0) return [{ text, bold: false }]
  return parts.map((t, i) => ({ text: t, bold: i % 2 === 1 })).filter((p) => p.text !== '')
}

const HEADING = /^(#{1,6})\s+(.*)$/
const BULLET = /^\s*[-*•]\s+(.*)$/
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/
const RULE = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/
const FENCE = '```'

/**
 * Tiny, safe subset of markdown for the model write-ups: headings, bullets, numbered lists, bold,
 * code fences and paragraphs. Output is data for React to render as text, never HTML.
 */
export function parseMarkdown(text: string): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  let items: Inline[][] = []
  let ordered = false
  let code: string[] | null = null

  const flushPara = () => {
    if (para.length) blocks.push({ kind: 'paragraph', inline: parseInline(para.join(' ')) })
    para = []
  }
  const flushList = () => {
    if (items.length) blocks.push({ kind: 'bullets', ordered, items })
    items = []
  }
  const addItem = (isOrdered: boolean, body: string) => {
    flushPara()
    if (items.length && ordered !== isOrdered) flushList()
    ordered = isOrdered
    items.push(parseInline(body.trim()))
  }

  for (const raw of text.split(/\r?\n/)) {
    if (code !== null) {
      if (raw.trim().startsWith(FENCE)) {
        blocks.push({ kind: 'code', text: code.join('\n') })
        code = null
      } else code.push(raw)
      continue
    }
    if (raw.trim().startsWith(FENCE)) {
      flushPara()
      flushList()
      code = []
      continue
    }
    const line = raw.trimEnd()
    if (!line.trim() || RULE.test(line)) {
      flushPara()
      flushList()
      continue
    }
    const h = HEADING.exec(line)
    if (h) {
      flushPara()
      flushList()
      blocks.push({ kind: 'heading', level: Math.min(h[1].length, 3) as 1 | 2 | 3, inline: parseInline(h[2].trim()) })
      continue
    }
    const b = BULLET.exec(line)
    if (b) {
      addItem(false, b[1])
      continue
    }
    const n = NUMBERED.exec(line)
    if (n) {
      addItem(true, n[1])
      continue
    }
    flushList()
    para.push(line.trim())
  }
  if (code !== null) blocks.push({ kind: 'code', text: code.join('\n') })
  flushPara()
  flushList()
  return blocks
}
