import { describe, expect, it } from 'vitest'
import { trendNotes } from './trend'
import type { HistoryPoint } from '../../services/nightly'

const pt = (date: string, price: number, label: string, extra: Partial<HistoryPoint> = {}): HistoryPoint => ({
  date, profile: 'p', price, label, decision: 'HOLD', confidence: 0.5, ...extra,
})

describe('trendNotes', () => {
  it('says there is no trend on the first night', () => {
    expect(trendNotes([pt('2026-11-18', 10, 'Buy now')], '2026-11-18')[0]).toMatch(/first night/)
  })

  it('describes price, call changes, trigger and averages up to the chosen night', () => {
    const h = [
      pt('2026-11-18', 100, 'Waiting', { trigger_price: 105 }),
      pt('2026-11-19', 110, 'Buy now', { trigger_price: 115, ma50: 100, ma200: 90, walk_away: 99 }),
      pt('2026-11-20', 50, 'Exit'),
    ]
    const notes = trendNotes(h, '2026-11-19').join(' ')
    expect(notes).toContain('$100.00 to $110.00, up (+10.0%)')
    expect(notes).toContain('from "Waiting" to "Buy now" on 2026-11-19')
    expect(notes).toContain('trigger moved from $105.00')
    expect(notes).toContain('above its 50-day average')
    expect(notes).toContain('uptrend')
    expect(notes).toContain('above the walk-away level of $99.00')
    expect(notes).not.toContain('Exit')
  })

  it('notes a call that never changed', () => {
    const notes = trendNotes([pt('2026-11-18', 10, 'Waiting'), pt('2026-11-19', 10.05, 'Waiting')], '2026-11-19')
    expect(notes.join(' ')).toContain('roughly flat')
    expect(notes.join(' ')).toContain('stayed "Waiting"')
  })
})
