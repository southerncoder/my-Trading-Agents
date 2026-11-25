import { describe, expect, it } from 'vitest'
import { loadSparks } from './sparks.js'

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
    const a = await loadSparks(deps, ['SPK1', 'BADX'], 1000)
    expect(a.SPK1).toHaveLength(90)
    expect(a.SPK1[89].close).toBe(109)
    expect(a.BADX).toEqual([])
    await loadSparks(deps, ['SPK1'], 2000)
    expect(calls).toBe(2)
  })
})
