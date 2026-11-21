import { describe, it, expect } from 'vitest'
import { parseMarkdown } from './markdown'

describe('parseMarkdown', () => {
  it('## heading is level 2', () => {
    expect(parseMarkdown('## Bull Thesis')).toEqual([{ kind: 'heading', level: 2, inline: [{ text: 'Bull Thesis', bold: false }] }])
  })

  it('- and * bullets group into one list', () => {
    const b = parseMarkdown('- one\n* two\n- three')
    expect(b).toHaveLength(1)
    expect(b[0]).toMatchObject({ kind: 'bullets' })
    expect((b[0] as { items: unknown[] }).items).toHaveLength(3)
  })

  it('**bold** splits inline', () => {
    const [p] = parseMarkdown('a **b** c')
    expect(p).toEqual({
      kind: 'paragraph',
      inline: [{ text: 'a ', bold: false }, { text: 'b', bold: true }, { text: ' c', bold: false }],
    })
  })

  it('unbalanced ** stays text', () => {
    const [p] = parseMarkdown('a **b c')
    expect(p).toEqual({ kind: 'paragraph', inline: [{ text: 'a **b c', bold: false }] })
  })

  it('<script> stays literal text', () => {
    const [p] = parseMarkdown('<script>alert(1)</script>')
    expect(p).toEqual({ kind: 'paragraph', inline: [{ text: '<script>alert(1)</script>', bold: false }] })
  })

  it('blank lines separate paragraphs; consecutive lines join', () => {
    const b = parseMarkdown('one\ntwo\n\nthree')
    expect(b).toHaveLength(2)
    expect(b[0]).toEqual({ kind: 'paragraph', inline: [{ text: 'one two', bold: false }] })
  })

  it('horizontal rules are dropped and empty input gives no blocks', () => {
    expect(parseMarkdown('---')).toEqual([])
    expect(parseMarkdown('')).toEqual([])
  })

  it('fenced code stays verbatim as a code block, even unclosed', () => {
    const closed = parseMarkdown('FINAL: HOLD\n```json\n{ "a": 1,\n  "b": 2 }\n```\nafter')
    expect(closed).toEqual([
      { kind: 'paragraph', inline: [{ text: 'FINAL: HOLD', bold: false }] },
      { kind: 'code', text: '{ "a": 1,\n  "b": 2 }' },
      { kind: 'paragraph', inline: [{ text: 'after', bold: false }] },
    ])
    expect(parseMarkdown('```\nx = 1')).toEqual([{ kind: 'code', text: 'x = 1' }])
  })
})