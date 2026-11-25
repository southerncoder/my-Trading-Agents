import { describe, expect, it } from 'vitest'
import { lastCloseBefore, loadSparks } from './sparks.js'

const csv = (n: number) =>
  `Date,Open,High,Low,Close,Adj Close,Volume\n${Array.from({ length: n }, (_, i) => `2026-0${1 + Math.floor(i / 28)}-${String((i % 28) + 1).padStart(2, '0')},1,1,1,${10 + i},1,1`).join('\n')}`

describe('loadSparks', () => {
  it('keeps the last 90 closes and caches them', async () => {
    let calls = 0
    const deps = {
      yahooUrl: 'http://y',
      fetchText: async (u: string) => {
        calls++
        if (u.includes('/BADX')) throw new Error('down')
        return csv(100)
      },
    }
    const a = await loadSparks(deps, ['SPK1', 'BADX'], Date.parse('2026-11-24T22:00:00Z'))
    expect(a.SPK1).toHaveLength(90)
    expect(a.SPK1[89].close).toBe(109)
    expect(a.BADX).toEqual([])
    await loadSparks(deps, ['SPK1'], Date.parse('2026-11-24T23:00:00Z'))
    expect(calls).toBe(2)
    // The next day's close has passed: fetch again even though six hours have not.
    await loadSparks(deps, ['SPK1'], Date.parse('2026-11-25T21:20:00Z'))
    expect(calls).toBe(3)
  })
})

describe('lastCloseBefore', () => {
  it('is the latest weekday 21:15 UTC at or before now', () => {
    const at = (s: string) => new Date(lastCloseBefore(Date.parse(s))).toISOString()
    expect(at('2026-11-24T22:00:00Z')).toBe('2026-11-24T21:15:00.000Z')
    expect(at('2026-11-24T20:00:00Z')).toBe('2026-11-23T21:15:00.000Z')
    expect(at('2026-11-23T10:00:00Z')).toBe('2026-11-20T21:15:00.000Z') // Monday morning: Friday's close
    expect(at('2026-11-22T12:00:00Z')).toBe('2026-11-20T21:15:00.000Z') // Sunday
  })
})
