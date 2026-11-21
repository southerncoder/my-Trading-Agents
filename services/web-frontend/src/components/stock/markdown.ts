export type Inline = { text: string; bold: boolean }

export type Block =
  | { kind: 'heading'; level: 1 | 2 | 3; inline: Inline[] }
  | { kind: 'bullets'; items: Inline[][] }
  | { kind: 'paragraph'; inline: Inline[] }

/** `**bold**` only. An unbalanced marker leaves the whole line as plain text. */
function parseInline(text: string): Inline[] {
  const parts = text.split('**')
  if (parts.length % 2 === 0) return [{ text, bold: false }]
  return parts.map((t, i) => ({ text: t, bold: i % 2 === 1 })).filter((p) => p.text !== '')
}

const HEADING = /^(#{1,6})\s+(.*)$/
const BULLET = /^\s*[-*•]\s+(.*)$/
const RULE = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/

/**
 * Tiny, safe subset of markdown for the model write-ups: headings, bullets, bold, paragraphs.
 * Output is data for React to render as text, never HTML.
 */
export function parseMarkdown(text: string): Block[] {
  const blocks: Block[] = []
  let para: string[] = []
  let bullets: Inline[][] = []

  const flushPara = () => {
    if (para.length) blocks.push({ kind: 'paragraph', inline: parseInline(para.join(' ')) })
    para = []
  }
  const flushBullets = () => {
    if (bullets.length) blocks.push({ kind: 'bullets', items: bullets })
    bullets = []
  }

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trimEnd()
    if (!line.trim()) {
      flushPara()
      flushBullets()
      continue
    }
    if (RULE.test(line)) {
      flushPara()
      flushBullets()
      continue
    }
    const h = HEADING.exec(line)
    if (h) {
      flushPara()
      flushBullets()
      blocks.push({ kind: 'heading', level: Math.min(h[1].length, 3) as 1 | 2 | 3, inline: parseInline(h[2].trim()) })
      continue
    }
    const b = BULLET.exec(line)
    if (b) {
      flushPara()
      bullets.push(parseInline(b[1].trim()))
      continue
    }
    flushBullets()
    para.push(line.trim())
  }
  flushPara()
  flushBullets()
  return blocks
}
