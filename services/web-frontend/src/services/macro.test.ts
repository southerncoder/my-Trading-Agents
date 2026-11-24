import { describe, expect, it } from 'vitest'
import { macroSchema } from './nightly'

describe('macro summary', () => {
  it('parses the service answer and tolerates a missing indicator list', () => {
    const base = { asOf: '2026-11-23', sources: { bls: true, fred: false }, notes: ['no FRED key'] }
    expect(macroSchema.parse(base).indicators).toEqual([])
    const tile = { key: 'vix', source: 'FRED', group: 'Markets', label: 'VIX', value: 35.89, display: '35.89', date: '2026-11-20', dateLabel: '2026-11-20', compare: [{ label: 'a month earlier', value: 19.45, display: '19.45' }], url: 'https://fred.stlouisfed.org/series/VIXCLS', line: 'ignored' }
    expect(macroSchema.parse({ ...base, indicators: [tile] }).indicators[0]).toMatchObject({ key: 'vix', display: '35.89' })
  })
})
