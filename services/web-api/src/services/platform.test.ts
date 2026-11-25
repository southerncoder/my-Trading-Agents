import { describe, expect, it } from 'vitest'
import { checkServices, nightStats, parseMinutes } from './platform.js'
import type { LedgerRow } from './nightly-derive.js'

const row = (o: Partial<LedgerRow>) => ({ date: '2026-11-24', ticker: 'KO', group: 'core', profile: 'cloud', stance: {}, pm: { key_risks: [] }, price: 1, confidence: 0.5, label: '', action_now: '', decision: '', ...o }) as LedgerRow

describe('nightStats', () => {
  it('counts calls by source, keeps the models and sums the recorded seconds', () => {
    const by = new Map([
      ['2026-11-24', [row({ seconds: 40, fast_model: 'f', decision_model: 'd' }), row({ ticker: 'MA', group: 'screen', seconds: 60 }), row({ ticker: 'C', group: 'news' })]],
      ['2026-11-23', [row({ date: '2026-11-23' })]],
    ])
    const s = nightStats(by, { '2026-11-24': 27 })
    expect(s.map((n) => n.date)).toEqual(['2026-11-23', '2026-11-24'])
    expect(s[1]).toMatchObject({ calls: 3, bySource: { core: 1, screen: 1, news: 1 }, fast_model: 'f', decision_model: 'd', seconds_total: 100, seconds_median: 50, minutes: 27 })
    expect(s[0]).toMatchObject({ seconds_total: null, seconds_median: null, minutes: null })
  })
})

describe('parseMinutes', () => {
  it('reads the run time from status.txt', () => {
    expect(parseMinutes('Calls: ...\nTook 27 minutes')).toBe(27)
    expect(parseMinutes('Took 1 hour 5 minutes')).toBe(65)
    expect(parseMinutes('no timing here')).toBeNull()
  })
})

describe('checkServices', () => {
  it('reports ok, failing and unreachable services', async () => {
    const fake = (async (url: string) => {
      if (url.includes('down')) throw new Error('refused')
      return new Response('{}', { status: url.includes('bad') ? 503 : 200 })
    }) as typeof fetch
    const r = await checkServices(fake, [
      { name: 'A', role: 'a', url: 'http://ok/health' },
      { name: 'B', role: 'b', url: 'http://bad/health' },
      { name: 'C', role: 'c', url: 'http://down/health' },
    ])
    expect(r.map((x) => [x.name, x.ok, x.status])).toEqual([['A', true, 200], ['B', false, 503], ['C', false, null]])
    expect(r[2].ms).toBeNull()
  })
})
