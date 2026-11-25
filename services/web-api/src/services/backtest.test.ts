import { describe, expect, it } from 'vitest'
import { DEFAULT_RULES, runBacktest, type BacktestCall } from './backtest.js'
import type { Bar } from '../scorecard/score.js'

const b = (date: string, open: number, high: number, low: number, close: number): Bar => ({ date, open, high, low, close })
const days = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12']
const flat = (p: number) => days.map((d) => b(d, p, p, p, p))
const spy = days.map((d, i) => b(d, 100 + i, 100 + i, 100 + i, 100 + i))

const call = (o: Partial<BacktestCall>): BacktestCall => ({ date: '2026-11-02', ticker: 'AAA', group: 'core', label: 'Buy now', confidence: 0.6, price: 10, ...o })

describe('runBacktest', () => {
  it('buys a "buy now" call at the next open and sells at the close after the holding days', () => {
    const bars = new Map([['AAA', days.map((d, i) => b(d, 10 + i, 10 + i, 10 + i, 10 + i))]])
    const r = runBacktest([call({})], bars, spy, { ...DEFAULT_RULES, hold: 2 })
    expect(r.trades[0]).toMatchObject({ outcome: 'closed', entryDate: '2026-11-03', entry: 11, exitDate: '2026-11-05', exit: 13, exitReason: 'hold', retPct: 18.18, pnl: 181.82 })
    expect(r.trades[0].spyRetPct).toBeCloseTo(((103 / 101) - 1) * 100, 1)
    expect(r.stats).toMatchObject({ taken: 1, wins: 1, winRatePct: 100 })
    expect(r.equity.find((e) => e.date === '2026-11-09')?.strategy).toBe(181.82)
  })

  it('waits for a trigger, is cancelled by the walk-away, and expires after the trigger days', () => {
    const bars = new Map([
      ['FILL', [b('2026-11-03', 10, 10.2, 9.8, 10), b('2026-11-04', 10, 10, 9.4, 9.6), ...days.slice(3).map((d) => b(d, 9.6, 9.8, 9.5, 9.7))]],
      ['CANC', [b('2026-11-03', 10, 10, 8.5, 9), ...days.slice(2).map((d) => b(d, 9, 9, 9, 9))]],
      ['EXPR', flat(10).slice(1)],
    ])
    const trig = { label: 'Buy if price reaches trigger', trigger_price: 9.5, walk_away: 9 }
    const r = runBacktest([call({ ticker: 'FILL', ...trig }), call({ ticker: 'CANC', ...trig }), call({ ticker: 'EXPR', ...trig })], bars, spy, { ...DEFAULT_RULES, hold: 3 })
    const by = Object.fromEntries(r.trades.map((t) => [t.ticker, t]))
    expect(by.FILL).toMatchObject({ outcome: 'closed', entryDate: '2026-11-04', entry: 9.5 })
    expect(by.CANC.outcome).toBe('cancelled')
    expect(by.EXPR.outcome).toBe('expired')
  })

  it('sells at the walk-away when the stop is on, holds one position per stock, and filters by rule', () => {
    const bars = new Map([['AAA', [b('2026-11-03', 10, 10, 10, 10), b('2026-11-04', 9.5, 9.6, 8, 8.5), ...days.slice(3).map((d) => b(d, 9, 9, 9, 9))]]])
    const calls = [call({ walk_away: 9 }), call({ date: '2026-11-03' }), call({ ticker: 'BBB', label: 'Wait' })]
    const r = runBacktest(calls, bars, spy, { ...DEFAULT_RULES, hold: 5 })
    expect(r.trades[0]).toMatchObject({ exitDate: '2026-11-04', exit: 9, exitReason: 'stop', pnl: -100 })
    expect(r.trades[1].outcome).toBe('held') // still held on the day the second call would buy
    expect(r.trades).toHaveLength(2) // "Wait" is not a buy
    expect(runBacktest(calls, bars, spy, { ...DEFAULT_RULES, minConfidence: 0.7 }).trades).toHaveLength(0)
    expect(runBacktest(calls, bars, spy, { ...DEFAULT_RULES, calls: 'trigger' }).trades).toHaveLength(0)
  })

  it('marks a trade still inside its holding days at the last close', () => {
    const bars = new Map([['AAA', flat(10).slice(0, 3)]])
    const r = runBacktest([call({})], bars, spy, { ...DEFAULT_RULES, hold: 5 })
    expect(r.trades[0]).toMatchObject({ outcome: 'open', exitReason: 'marked', exitDate: '2026-11-04' })
  })
})
