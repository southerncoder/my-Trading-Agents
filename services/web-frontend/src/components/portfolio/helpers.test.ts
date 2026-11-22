import { describe, expect, it } from 'vitest'
import { chartGeometry, groupPicks, mdBlocks, pickAction, SOURCE_LABEL } from './helpers'

describe('mdBlocks (the small Markdown subset reviews use)', () => {
  it('reads headings, paragraphs, bullets and tables; bold is marked for the renderer', () => {
    const b = mdBlocks('## The week\nA **calm** week.\nStill calm.\n\n- one\n- two\n\n| A | B |\n|---|---|\n| 1 | 2 |\n')
    expect(b).toEqual([
      { type: 'h', level: 2, text: 'The week' },
      { type: 'p', text: 'A **calm** week. Still calm.' },
      { type: 'ul', items: ['one', 'two'] },
      { type: 'table', head: ['A', 'B'], rows: [['1', '2']] },
    ])
  })
  it('treats italics-only lines as paragraphs and ignores blank input', () => {
    expect(mdBlocks('_note_')).toEqual([{ type: 'p', text: '_note_' }])
    expect(mdBlocks('')).toEqual([])
  })
})

describe('chartGeometry', () => {
  const series = [
    { date: '2026-11-20', portfolio: 100, spy: 100 },
    { date: '2026-11-23', portfolio: 104, spy: 101 },
    { date: '2026-11-24', portfolio: 98, spy: null },
  ]
  it('maps both lines into the box with a shared y range that includes 100', () => {
    const g = chartGeometry(series, 300, 100, 10)
    expect(g.yMin).toBeLessThanOrEqual(98)
    expect(g.yMax).toBeGreaterThanOrEqual(104)
    expect(g.portfolio).toHaveLength(3)
    expect(g.spy).toHaveLength(2)
    expect(g.portfolio[0].x).toBe(10)
    expect(g.portfolio[2].x).toBe(290)
    expect(g.portfolio[1].y).toBeLessThan(g.portfolio[0].y)
  })
  it('a single point sits in the middle instead of dividing by zero', () => {
    const g = chartGeometry([series[0]], 300, 100, 10)
    expect(g.portfolio[0].x).toBe(150)
  })
})

describe('picks', () => {
  const p = (o: Record<string, unknown>) => ({ ticker: 'X', source: 'watchlist', tradeable: true, kind: 'market', direction: 'long', trigger_price: null, price: 10, ...o })
  it('groups by source in a fixed order, skipping empty groups', () => {
    const g = groupPicks([p({ source: 'news' }), p({ source: 'watchlist' }), p({ source: 'screen' })] as never)
    expect(g.map((x) => x.source)).toEqual(['watchlist', 'screen', 'news'])
    expect(SOURCE_LABEL.screen).toBe('Screen')
  })
  it('says what one click would do', () => {
    expect(pickAction(p({}) as never)).toEqual({ kind: 'market', text: 'Buy now' })
    expect(pickAction(p({ kind: 'trigger', trigger_price: 105.5 }) as never)).toEqual({ kind: 'trigger', text: 'Buy if it reaches $105.50' })
    expect(pickAction(p({ kind: 'trigger', direction: 'short', trigger_price: 9 }) as never)).toEqual({ kind: 'trigger', text: 'Short if it reaches $9.00' })
    expect(pickAction(p({ tradeable: false }) as never)).toBeNull()
    expect(pickAction(p({ kind: 'trigger', trigger_price: null }) as never)).toBeNull()
  })
})
