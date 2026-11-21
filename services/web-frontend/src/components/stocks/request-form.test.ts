import { describe, it, expect } from 'vitest'
import { buildAddRequest, describePending, pendingFor, shownCadence } from './request-form'

describe('buildAddRequest', () => {
  it('normalizes a good entry', () => {
    const r = buildAddRequest({ ticker: ' ko ', list: 'brands', cadence: 'weekly', lesson: '  Soft drinks  ' }, [])
    expect(r).toEqual({ ok: true, request: { action: 'add', ticker: 'KO', list: 'brands', cadence: 'weekly', lesson: 'Soft drinks' } })
  })

  it('omits an empty note', () => {
    const r = buildAddRequest({ ticker: 'KO', list: 'core', cadence: 'nightly', lesson: '   ' }, [])
    expect(r.ok && 'lesson' in r.request).toBe(false)
  })

  it('asks for a ticker, and explains a bad one in plain words', () => {
    expect(buildAddRequest({ ticker: '', list: 'core', cadence: 'nightly', lesson: '' }, [])).toMatchObject({ ok: false, error: expect.stringMatching(/ticker/i) })
    expect(buildAddRequest({ ticker: 'NV DA', list: 'core', cadence: 'nightly', lesson: '' }, [])).toMatchObject({ ok: false })
    expect(buildAddRequest({ ticker: 'A/B', list: 'core', cadence: 'nightly', lesson: '' }, [])).toMatchObject({ ok: false })
  })

  it('says so when the stock is already listed or already waiting', () => {
    const existing = ['NVDA']
    expect(buildAddRequest({ ticker: 'nvda', list: 'core', cadence: 'nightly', lesson: '' }, existing)).toMatchObject({ ok: false, error: expect.stringMatching(/already/i) })
  })

  it('stops a note over 200 characters instead of silently cutting it', () => {
    const r = buildAddRequest({ ticker: 'KO', list: 'core', cadence: 'nightly', lesson: 'x'.repeat(201) }, [])
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/200/) })
  })
})

describe('pending helpers', () => {
  const pending = [
    { id: '1', at: '2026-11-21T00:00:00Z', action: 'add' as const, ticker: 'KO', list: 'core' as const, cadence: 'weekly' as const },
    { id: '2', at: '2026-11-21T00:01:00Z', action: 'set_cadence' as const, ticker: 'NVDA', list: null, cadence: 'paused' as const },
  ]

  it('describes each kind of change in plain words', () => {
    expect(describePending(pending[0])).toBe('Add KO to core, analysed once a week')
    expect(describePending(pending[1])).toBe('Change NVDA to skipped for now')
  })

  it('finds the change waiting for a stock, newest last wins', () => {
    expect(pendingFor(pending, 'nvda')?.cadence).toBe('paused')
    expect(pendingFor(pending, 'AAA')).toBeUndefined()
    const two = [...pending, { ...pending[1], id: '3', cadence: 'nightly' as const }]
    expect(pendingFor(two, 'NVDA')?.cadence).toBe('nightly')
  })
})

describe('shownCadence', () => {
  const stock = { cadence: 'nightly' as const, ticker: 'NVDA' }
  it('shows the live schedule when nothing is waiting', () => {
    expect(shownCadence([], stock)).toBe('nightly')
  })
  it('shows the waiting schedule so it can be changed back', () => {
    const p = [{ id: '1', at: 'x', action: 'set_cadence' as const, ticker: 'NVDA', list: null, cadence: 'paused' as const }]
    expect(shownCadence(p, stock)).toBe('paused')
  })
})
