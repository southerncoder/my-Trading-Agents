import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { applyClose, applyOpen, cashDelta, valuation } from './accounting.js'
import { addTradingDays, isTradingDay, MARKET_HOLIDAYS, tradingDaysBetween } from './calendar.js'
import { quantityFor, triggerFill, triggerWhen } from './fills.js'
import { callSaysExit, checkExit, exitPlan, isBigMove } from './exits.js'
import { DEFAULT_RULES, parseRules, preTradeCheck, riskAlerts } from './risk.js'
import { indexSeries, positionReturn, sourceStats, spyReturn, summarize } from './performance.js'

const bar = (date: string, open: number, high: number, low: number, close: number) => ({ date, open, high, low, close })

describe('accounting', () => {
  it('opening twice averages the cost', () => {
    const p = applyOpen(applyOpen(null, { direction: 'long', quantity: 10, price: 100 }), { direction: 'long', quantity: 10, price: 110 })
    expect(p).toEqual({ direction: 'long', quantity: 20, avgCost: 105 })
  })
  it('refuses to add a short to a long', () => {
    expect(() => applyOpen({ direction: 'long', quantity: 1, avgCost: 1 }, { direction: 'short', quantity: 1, price: 1 })).toThrow('direction')
  })
  it('closing a long realizes (exit - cost) x quantity and keeps the cost of the rest', () => {
    expect(applyClose({ direction: 'long', quantity: 10, avgCost: 100 }, 4, 110)).toEqual({ position: { direction: 'long', quantity: 6, avgCost: 100 }, realized: 40 })
  })
  it('closing a short realizes (cost - exit) x quantity', () => {
    expect(applyClose({ direction: 'short', quantity: 10, avgCost: 100 }, 10, 90).realized).toBe(100)
    expect(applyClose({ direction: 'short', quantity: 10, avgCost: 100 }, 10, 110).realized).toBe(-100)
  })
  it('refuses to sell more than is held', () => {
    expect(() => applyClose({ direction: 'long', quantity: 5, avgCost: 1 }, 6, 1)).toThrow('more than')
  })
  it('cash: buying spends, selling receives, shorting receives, covering spends', () => {
    expect(cashDelta('long', 'open', 2, 50)).toBe(-100)
    expect(cashDelta('long', 'close', 2, 50)).toBe(100)
    expect(cashDelta('short', 'open', 2, 50)).toBe(100)
    expect(cashDelta('short', 'close', 2, 50)).toBe(-100)
  })
  it('equity = cash + long value - short value; a missing mark falls back to cost', () => {
    const v = valuation(1000, [
      { ticker: 'A', direction: 'long', quantity: 10, avgCost: 10 },
      { ticker: 'B', direction: 'short', quantity: 5, avgCost: 20 },
      { ticker: 'C', direction: 'long', quantity: 1, avgCost: 7 },
    ], { A: 12, B: 18 })
    expect(v).toEqual({ longValue: 127, shortValue: 90, equity: 1037 })
  })
})

describe('calendar', () => {
  it('weekends and NYSE holidays are not trading days', () => {
    expect(isTradingDay('2026-11-21')).toBe(false)
    expect(isTradingDay('2026-11-26')).toBe(false)
    expect(isTradingDay('2026-11-27')).toBe(true)
  })
  it('adds trading days across a weekend and Thanksgiving', () => {
    expect(addTradingDays('2026-11-24', 3)).toBe('2026-11-30')
  })
  it('counts trading days between two dates (exclusive start, inclusive end)', () => {
    expect(tradingDaysBetween('2026-11-20', '2026-11-30')).toBe(5)
  })
  it('has the same holidays as tools/market-calendar.ps1', () => {
    const ps = readFileSync(fileURLToPath(new URL('../../../../tools/market-calendar.ps1', import.meta.url)), 'utf8')
    const dates = [...ps.matchAll(/'(\d{4}-\d{2}-\d{2})'/g)].map((m) => m[1]).sort()
    expect([...MARKET_HOLIDAYS].sort()).toEqual(dates)
  })
})

describe('fills', () => {
  it('a trigger above the reference price is a breakout, below is a pullback', () => {
    expect(triggerWhen(105, 100)).toBe('above')
    expect(triggerWhen(95, 100)).toBe('below')
  })
  it('breakout fills when the high reaches the trigger, at the trigger', () => {
    expect(triggerFill('above', 105, bar('d', 101, 106, 100, 104))).toBe(105)
    expect(triggerFill('above', 105, bar('d', 101, 104.99, 100, 104))).toBeNull()
  })
  it('a gap through the trigger fills at the open, not the trigger', () => {
    expect(triggerFill('above', 105, bar('d', 108, 110, 107, 109))).toBe(108)
    expect(triggerFill('below', 95, bar('d', 92, 93, 90, 91))).toBe(92)
  })
  it('pullback fills when the low reaches the trigger', () => {
    expect(triggerFill('below', 95, bar('d', 99, 100, 94, 96))).toBe(95)
  })
  it('quantity is dollars / price to 4 places and must be positive', () => {
    expect(quantityFor(1000, 333)).toBe(3.003)
    expect(() => quantityFor(0, 10)).toThrow()
  })
})

describe('exits', () => {
  const rules = DEFAULT_RULES
  it('long: walk-away below entry becomes the stop; otherwise stop_pct', () => {
    expect(exitPlan({ direction: 'long', entry: 100, walkAway: 92, rules, openedOn: '2026-11-20' })).toEqual({ stop: 92, target: 115, holdUntil: addTradingDays('2026-11-20', 60) })
    expect(exitPlan({ direction: 'long', entry: 100, walkAway: 104, rules, openedOn: '2026-11-20' }).stop).toBe(92)
    expect(exitPlan({ direction: 'long', entry: 100, walkAway: null, rules, openedOn: '2026-11-20' }).stop).toBe(92)
  })
  it('short: stop above entry, target below', () => {
    const p = exitPlan({ direction: 'short', entry: 100, walkAway: 107, rules, openedOn: '2026-11-20' })
    expect([p.stop, p.target]).toEqual([107, 85])
  })
  const long = { direction: 'long' as const, stop: 92, target: 115, holdUntil: '2027-01-01' }
  it('long stop hits on the low, at the stop or a lower open', () => {
    expect(checkExit(long, bar('2026-11-23', 95, 96, 91, 93))).toEqual({ kind: 'stop_hit', price: 92 })
    expect(checkExit(long, bar('2026-11-23', 90, 91, 88, 89))).toEqual({ kind: 'stop_hit', price: 90 })
  })
  it('when stop and target are both inside one bar, the stop wins (conservative)', () => {
    expect(checkExit(long, bar('2026-11-23', 100, 116, 91, 100))?.kind).toBe('stop_hit')
  })
  it('target hits on the high; max hold on or after the hold date at the close', () => {
    expect(checkExit(long, bar('2026-11-23', 110, 117, 109, 116))).toEqual({ kind: 'target_hit', price: 115 })
    expect(checkExit(long, bar('2027-01-04', 100, 101, 99, 100.5))).toEqual({ kind: 'max_hold', price: 100.5 })
    expect(checkExit(long, bar('2026-11-23', 100, 101, 99, 100))).toBeNull()
  })
  it('short stop hits on the high', () => {
    const short = { direction: 'short' as const, stop: 107, target: 85, holdUntil: '2027-01-01' }
    expect(checkExit(short, bar('2026-11-23', 101, 108, 100, 104))).toEqual({ kind: 'stop_hit', price: 107 })
    expect(checkExit(short, bar('2026-11-23', 90, 91, 84, 86))).toEqual({ kind: 'target_hit', price: 85 })
  })
  it('big adverse move: 2 ATR against the position, or 7% without an ATR', () => {
    expect(isBigMove('long', 100, 94, 2.5)).toBe(true)
    expect(isBigMove('long', 100, 96, 2.5)).toBe(false)
    expect(isBigMove('short', 100, 106, 2.5)).toBe(true)
    expect(isBigMove('long', 100, 92.9, null)).toBe(true)
    expect(isBigMove('long', 100, 110, 2)).toBe(false)
  })
  it('a SELL call says exit a long; a BUY call says cover a short', () => {
    expect(callSaysExit('long', 'SELL')).toBe(true)
    expect(callSaysExit('long', 'HOLD')).toBe(false)
    expect(callSaysExit('short', 'BUY')).toBe(true)
  })
})

describe('risk', () => {
  it('parseRules fills defaults and rejects nonsense', () => {
    expect(parseRules({ position_size: 500 })).toEqual({ ...DEFAULT_RULES, position_size: 500 })
    expect(() => parseRules({ max_position_pct: -1 })).toThrow()
  })
  const base = { cash: 1000, equity: 10000, rules: DEFAULT_RULES, openTickers: ['A'], tickerValue: 0, sectorValue: 0 }
  it('a buy larger than cash is refused', () => {
    expect(preTradeCheck({ ...base, ticker: 'B', amount: 1500 })).toMatchObject({ ok: false, error: expect.stringContaining('cash') })
  })
  it('too many open positions is refused for a new ticker but adding to a held one is fine', () => {
    const r = { ...DEFAULT_RULES, max_open_positions: 1 }
    expect(preTradeCheck({ ...base, rules: r, ticker: 'B', amount: 100 }).ok).toBe(false)
    expect(preTradeCheck({ ...base, rules: r, ticker: 'A', amount: 100 }).ok).toBe(true)
  })
  it('position and sector limits warn but do not block', () => {
    const c = preTradeCheck({ ...base, ticker: 'A', amount: 900, tickerValue: 1000, sector: 'Tech', sectorValue: 3000 })
    expect(c.ok).toBe(true)
    expect(c.warnings.join(' ')).toMatch(/19% of the portfolio/)
    expect(c.warnings.join(' ')).toMatch(/Tech would be 39%/)
  })
  it('nightly risk alerts: position size, sector exposure and drawdown', () => {
    const alerts = riskAlerts({
      rules: DEFAULT_RULES, equity: 9000, peakEquity: 10000,
      positions: [
        { ticker: 'A', value: 1900, sector: 'Tech' },
        { ticker: 'B', value: 1300, sector: 'Tech' },
        { ticker: 'C', value: 300, sector: null },
      ],
    })
    expect(alerts.map((a) => `${a.kind}:${a.ticker}`).sort()).toEqual(['risk_drawdown:', 'risk_position:A', 'risk_sector:sector:Tech'])
  })
})

describe('performance', () => {
  const snaps = [
    { date: '2026-11-20', equity: 10000, spy_close: 500 },
    { date: '2026-11-23', equity: 10500, spy_close: null },
    { date: '2026-11-24', equity: 9900, spy_close: 510 },
  ]
  it('index series start at 100 and carry SPY forward over a gap', () => {
    expect(indexSeries(snaps, 10000)).toEqual([
      { date: '2026-11-20', portfolio: 100, spy: 100 },
      { date: '2026-11-23', portfolio: 105, spy: 100 },
      { date: '2026-11-24', portfolio: 99, spy: 102 },
    ])
  })
  it('summary: total return, SPY return, difference and worst drop from a peak', () => {
    expect(summarize(snaps, 10000)).toEqual({ returnPct: -1, spyReturnPct: 2, excessPct: -3, maxDrawdownPct: 5.71 })
  })
  it('position return is signed by direction', () => {
    expect(positionReturn('long', 100, 110)).toBeCloseTo(10)
    expect(positionReturn('short', 100, 90)).toBeCloseTo(10)
  })
  it('SPY return over a holding window uses the nearest close on or before each date', () => {
    expect(spyReturn({ '2026-11-20': 500, '2026-11-24': 510 }, '2026-11-21', '2026-11-24')).toBeCloseTo(2)
    expect(spyReturn({}, '2026-11-21', '2026-11-24')).toBeNull()
  })
  it('per-source stats: count, win rate, average return and return over SPY', () => {
    const s = sourceStats([
      { source: 'screen', returnPct: 10, spyReturnPct: 2, closed: true },
      { source: 'screen', returnPct: -4, spyReturnPct: 1, closed: false },
      { source: 'news', returnPct: 3, spyReturnPct: null, closed: true },
    ])
    expect(s).toEqual([
      { source: 'news', positions: 1, closed: 1, winRatePct: 100, avgReturnPct: 3, avgExcessPct: null },
      { source: 'screen', positions: 2, closed: 1, winRatePct: 50, avgReturnPct: 3, avgExcessPct: 1.5 },
    ])
  })
})
