import { describe, expect, it } from 'vitest'
import { timingReview, type TimingCall } from './timing.js'
import type { Bar } from './types.js'

const bar = (date: string, close: number): Bar => ({ date, open: close, high: close, low: close, close })
const call = (run_date: string, label: string, decision: string, price: number): TimingCall => ({ run_date, label, decision, price, trigger_price: null })

const bars = [
  bar('2026-11-02', 100),
  bar('2026-11-03', 97), // best entry
  bar('2026-11-04', 99), // bought here
  bar('2026-11-05', 110), // best while held
  bar('2026-11-06', 104),
  bar('2026-11-09', 103), // sold here
  ...['10', '11', '12', '13', '16'].map((d, i) => bar(`2026-11-${d}`, 104 + i)), // day 5 after: 108
]

describe('timingReview', () => {
  const calls = [
    call('2026-10-30', 'Exit', 'SELL', 101),
    call('2026-11-02', 'Buy if price reaches trigger', 'HOLD', 100),
    call('2026-11-03', 'Buy now', 'BUY', 97),
    call('2026-11-06', 'Exit', 'SELL', 104),
  ]
  const r = timingReview({
    direction: 'long',
    status: 'closed',
    trades: [
      { action: 'open', quantity: 2, price: 99, traded_on: '2026-11-04' },
      { action: 'close', quantity: 2, price: 103, traded_on: '2026-11-09' },
    ],
    calls,
    bars,
  })!

  it('finds the run of buy calls before the purchase, stopping at an earlier sell call', () => {
    expect(r.firstBuyCall).toEqual({ date: '2026-11-02', price: 100, label: 'Buy if price reaches trigger' })
    expect(r.sellCall).toEqual({ date: '2026-11-06', price: 104, label: 'Exit' })
  })

  it('measures entry, the best close while held, and what happened after the sale', () => {
    expect(r.bestEntry).toEqual({ date: '2026-11-03', price: 97 })
    expect(r.bestWhileHeld).toEqual({ date: '2026-11-05', price: 110 })
    expect(r.worstWhileHeld).toEqual({ date: '2026-11-04', price: 99 })
    expect(r.exit).toEqual({ avgPrice: 103, lastDate: '2026-11-09', shares: 2 })
    expect(r.after).toEqual([{ days: 5, date: '2026-11-16', price: 108, pctFromSale: 4.85 }])
  })

  it('says it in plain sentences', () => {
    const text = r.lines.map((l) => `${l.topic}/${l.tone}: ${l.text}`).join('\n')
    expect(text).toContain('waiting helped')
    expect(text).toContain('Best entry in hindsight: $97.00 close on 2026-11-03, 2.1% cheaper')
    expect(text).toContain('a gain of $8.00 (+4.0%)')
    expect(text).toContain('selling then would have made $14.00 more (6.8%). Selling earlier would have been better.')
    expect(text).toContain('exit/bad')
    expect(text).toContain('after/bad: 5 trading days after the sale (2026-11-16) it closed at $108.00, +4.8%: the sale was early')
  })

  it('reviews an open position so far', () => {
    const open = timingReview({ direction: 'long', status: 'open', trades: [{ action: 'open', quantity: 1, price: 99, traded_on: '2026-11-04' }], calls, bars })!
    expect(open.exit).toBeNull()
    expect(open.lines.find((l) => l.topic === 'held')?.text).toBe('Still held: +9.1% since bought at $99.00. Best close so far $110.00 (2026-11-05), worst $99.00 (2026-11-04).')
  })

  it('needs at least one buy', () => {
    expect(timingReview({ direction: 'long', status: 'open', trades: [], calls, bars })).toBeNull()
  })
})
