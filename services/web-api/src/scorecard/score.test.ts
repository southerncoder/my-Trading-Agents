import { describe, it, expect } from 'vitest'
import { parseBars, scoreCall, buildScorecard, isScorable, type Bar, type ScoreInput } from './score.js'

const bar = (date: string, o: number, h: number, l: number, c: number): Bar => ({ date, open: o, high: h, low: l, close: c })
// Fri 2026-11-20 call; next bars Mon 23, Tue 24, Wed 25 (weekend skipped)
const call = (over: Partial<ScoreInput> = {}): ScoreInput => ({
  date: '2026-11-20',
  ticker: 'AAA',
  profile: 'ollama-cloud',
  label: 'Buy now',
  action_now: 'buy_now',
  confidence: 0.65,
  price: 100,
  ...over,
})
const spy: Bar[] = [
  bar('2026-11-20', 500, 500, 500, 500),
  bar('2026-11-23', 500, 500, 500, 505),
  bar('2026-11-24', 505, 505, 505, 510),
  bar('2026-11-25', 510, 510, 510, 495),
]
const flat = (c: number[]): Bar[] =>
  ['2026-11-23', '2026-11-24', '2026-11-25'].slice(0, c.length).map((d, i) => bar(d, c[i], c[i], c[i], c[i]))

describe('parseBars', () => {
  it('skips comments, header, blanks and bad rows, and sorts ascending', () => {
    const csv = '# Stock data\n# Data retrieved\n\nDate,Open,High,Low,Close,Adj Close,Volume\n2026-11-24,2,3,1,2.5,2.5,10\n2026-11-23,1,2,0.5,1.5,1.5,10\n2026-11-25,x,y,z,w,1,1\n'
    expect(parseBars(csv)).toEqual([bar('2026-11-23', 1, 2, 0.5, 1.5), bar('2026-11-24', 2, 3, 1, 2.5)])
  })
})

describe('scoreCall forward returns', () => {
  it('counts bars, not days: horizon 1 from a Friday call uses Monday', () => {
    const r = scoreCall(call(), flat([103, 104, 105]), spy, 1)
    expect(r?.now_ret_pct).toBeCloseTo(3, 5)
    expect(r?.excess_pct).toBeCloseTo(3 - 1, 5) // SPY 500 -> 505 = +1%
  })

  it('uses the horizon-th bar close', () => {
    const r = scoreCall(call(), flat([103, 104, 90]), spy, 3)
    expect(r?.now_ret_pct).toBeCloseTo(-10, 5)
    expect(r?.excess_pct).toBeCloseTo(-10 - -1, 5) // SPY 500 -> 495
  })

  it('returns null when not enough bars, no SPY base bar, or price is 0', () => {
    expect(scoreCall(call(), flat([103]), spy, 3)).toBeNull()
    expect(scoreCall(call(), flat([103, 104, 105]), spy.slice(1), 1)).toBeNull()
    expect(scoreCall(call({ price: 0 }), flat([103, 104, 105]), spy, 1)).toBeNull()
  })

  it('returns null when SPY has fewer bars than the horizon', () => {
    expect(scoreCall(call(), flat([103, 104, 105]), spy.slice(0, 2), 3)).toBeNull()
  })
})

describe('scoreCall trigger fills', () => {
  const trig = (over: Partial<ScoreInput>) =>
    call({ label: 'Buy if price reaches trigger', action_now: 'wait_for_trigger', ...over })

  it('breakout fills at the trigger when the bar opens below it', () => {
    const bars = [bar('2026-11-23', 100, 112, 99, 110), bar('2026-11-24', 110, 111, 109, 110)]
    const r = scoreCall(trig({ trigger_price: 105, walk_away: 90 }), bars, spy, 2)
    expect(r?.trigger?.status).toBe('filled')
    expect(r?.trigger?.wait_ret_pct).toBeCloseTo((110 / 105 - 1) * 100, 5)
  })

  it('breakout that gaps above the trigger fills at the open', () => {
    const bars = [bar('2026-11-23', 108, 112, 107, 110), bar('2026-11-24', 110, 111, 109, 110)]
    const r = scoreCall(trig({ trigger_price: 105, walk_away: 90 }), bars, spy, 2)
    expect(r?.trigger?.wait_ret_pct).toBeCloseTo((110 / 108 - 1) * 100, 5)
  })

  it('pullback fills at the trigger, or at the open when it gaps below', () => {
    const touch = [bar('2026-11-23', 99, 99, 94, 97), bar('2026-11-24', 97, 98, 96, 97)]
    expect(scoreCall(trig({ trigger_price: 95, walk_away: 80 }), touch, spy, 2)?.trigger?.wait_ret_pct).toBeCloseTo((97 / 95 - 1) * 100, 5)
    const gap = [bar('2026-11-23', 92, 96, 91, 94), bar('2026-11-24', 94, 95, 93, 94)]
    expect(scoreCall(trig({ trigger_price: 95, walk_away: 80 }), gap, spy, 2)?.trigger?.wait_ret_pct).toBeCloseTo((94 / 92 - 1) * 100, 5)
  })

  it('not filled by the horizon end -> not_filled with wait return 0', () => {
    const bars = [bar('2026-11-23', 100, 101, 99, 100), bar('2026-11-24', 100, 101, 99, 100)]
    const r = scoreCall(trig({ trigger_price: 120, walk_away: 90 }), bars, spy, 2)
    expect(r?.trigger).toEqual({ status: 'not_filled', wait_ret_pct: 0 })
  })

  it('a fill on a bar after the horizon does not count', () => {
    const bars = [bar('2026-11-23', 100, 101, 99, 100), bar('2026-11-24', 100, 130, 99, 125)]
    expect(scoreCall(trig({ trigger_price: 120, walk_away: 90 }), bars, spy, 1)?.trigger?.status).toBe('not_filled')
  })

  it('walk-away touched before any fill cancels the call', () => {
    const bars = [bar('2026-11-23', 100, 101, 85, 88), bar('2026-11-24', 88, 130, 88, 125)]
    const r = scoreCall(trig({ trigger_price: 120, walk_away: 90 }), bars, spy, 2)
    expect(r?.trigger).toEqual({ status: 'cancelled', wait_ret_pct: 0 })
  })

  it('a bar that both fills and touches walk-away cancels', () => {
    const bars = [bar('2026-11-23', 100, 125, 85, 110)]
    expect(scoreCall(trig({ trigger_price: 120, walk_away: 90 }), bars, spy, 1)?.trigger?.status).toBe('cancelled')
  })

  it('missing walk_away never cancels; trigger equal to price does not break', () => {
    const bars = [bar('2026-11-23', 100, 101, 50, 60)]
    expect(scoreCall(trig({ trigger_price: 120 }), bars, spy, 1)?.trigger?.status).toBe('not_filled')
    const eq = scoreCall(trig({ trigger_price: 100 }), bars, spy, 1)
    expect(eq?.trigger?.status).toBe('filled') // equal counts as a pullback: low <= price
    expect(eq?.trigger?.wait_ret_pct).toBeCloseTo((60 / 100 - 1) * 100, 5)
  })

  it('a buy-now call has no trigger part', () => {
    expect(scoreCall(call(), flat([103]), spy, 1)?.trigger).toBeUndefined()
  })
})

describe('buildScorecard', () => {
  const bars = new Map<string, Bar[]>([['AAA', flat([103, 104, 90])]])
  const calls: ScoreInput[] = [
    call(),
    call({ profile: 'hybrid', confidence: 0.75 }),
    call({ label: 'Buy if price reaches trigger', action_now: 'wait_for_trigger', trigger_price: 120, walk_away: 80, confidence: 0.5 }),
    call({ ticker: 'NOHIST' }),
  ]
  const sc = buildScorecard(calls, bars, spy, new Date('2026-11-26T00:00:00Z'))

  it('counts calls, unscored (no history) and matured calls per horizon', () => {
    expect(sc.calls).toBe(4)
    expect(sc.unscored).toBe(1)
    expect(sc.matured).toEqual({ '1': 3, '3': 3, '5': 0 })
    expect(sc.benchmark).toBe('SPY')
    expect(sc.horizons).toEqual([1, 3, 5])
  })

  it('groups by label, confidence band and profile with the sample-size flag', () => {
    const cell = (g: 'label' | 'band' | 'profile', key: string, h: number) => sc.groups[g].find((c) => c.key === key && c.horizon === h)
    expect(cell('label', 'Buy now', 1)?.n).toBe(2)
    expect(cell('band', '0.70+', 1)?.n).toBe(1)
    expect(cell('band', '<0.60', 1)?.n).toBe(1)
    expect(cell('profile', 'hybrid', 1)?.n).toBe(1)
    expect(cell('label', 'Buy now', 1)?.enough).toBe(false)
    expect(cell('label', 'Buy now', 5)).toBeUndefined()
  })

  it('averages excess return and reports trigger stats on trigger cells only', () => {
    const buyNow = sc.groups.label.find((c) => c.key === 'Buy now' && c.horizon === 1)
    expect(buyNow?.avg_excess_pct).toBeCloseTo(2, 2) // +3% stock - +1% SPY
    expect(buyNow?.up_share).toBe(1)
    expect(buyNow?.trigger).toBeUndefined()
    const trig = sc.groups.label.find((c) => c.key === 'Buy if price reaches trigger' && c.horizon === 1)
    expect(trig?.trigger).toEqual({ n: 1, fill_rate: 0, cancelled_rate: 0, wait_minus_now_pct: -3 })
  })

  it('flags a cell with 10 or more calls as enough', () => {
    const many = Array.from({ length: 10 }, () => call())
    const big = buildScorecard(many, bars, spy, new Date('2026-11-26T00:00:00Z'))
    expect(big.groups.label.find((c) => c.horizon === 1)?.enough).toBe(true)
  })
})

describe('holidays, gaps and unscorable calls', () => {
  it('a call dated on a market holiday uses the last SPY close before it as the base', () => {
    // Thanksgiving 2026-11-26: no SPY bar that day; ledger price is the 11-25 close
    const spyH: Bar[] = [bar('2026-11-25', 600, 600, 600, 600), bar('2026-11-27', 600, 600, 600, 612)]
    const bars = [bar('2026-11-27', 100, 105, 99, 104)]
    const r = scoreCall(call({ date: '2026-11-26' }), bars, spyH, 1)
    expect(r?.now_ret_pct).toBeCloseTo(4, 5)
    expect(r?.excess_pct).toBeCloseTo(4 - 2, 5)
  })

  it('matches the SPY window by date when the stock is missing a day SPY has', () => {
    // stock has no 11-24 bar; horizon 2 ends on 11-25, so SPY must be measured to 11-25 (495), not 11-24 (510)
    const bars = [bar('2026-11-23', 100, 100, 100, 101), bar('2026-11-25', 100, 100, 100, 110)]
    const r = scoreCall(call(), bars, spy, 2)
    expect(r?.excess_pct).toBeCloseTo(10 - -1, 5)
  })

  it('returns null when SPY has no bar on the stock window end date', () => {
    const bars = [bar('2026-11-23', 100, 100, 100, 101), bar('2026-11-26', 100, 100, 100, 110)]
    expect(scoreCall(call(), bars, spy, 2)).toBeNull()
  })

  it('isScorable is false for price 0 or no SPY bar on or before the call date', () => {
    expect(isScorable(call(), spy)).toBe(true)
    expect(isScorable(call({ price: 0 }), spy)).toBe(false)
    expect(isScorable(call({ date: '2026-11-01' }), spy)).toBe(false)
  })

  it('buildScorecard counts never-scorable calls as unscored, not as not-yet-matured', () => {
    const bars = new Map<string, Bar[]>([['AAA', flat([103])]])
    const sc = buildScorecard([call(), call({ price: 0 }), call({ date: '2026-11-01' })], bars, spy, new Date('2026-11-26T00:00:00Z'))
    expect(sc.calls).toBe(3)
    expect(sc.unscored).toBe(2)
  })
})