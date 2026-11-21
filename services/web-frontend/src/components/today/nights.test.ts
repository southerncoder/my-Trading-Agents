import { describe, it, expect } from 'vitest'
import { newestFirst, neighbours } from './nights'

describe('newestFirst', () => {
  it('sorts dates newest first without changing the input', () => {
    const input = ['2026-11-18', '2026-11-20', '2026-11-19']
    expect(newestFirst(input)).toEqual(['2026-11-20', '2026-11-19', '2026-11-18'])
    expect(input[0]).toBe('2026-11-18')
  })
  it('drops duplicates', () => {
    expect(newestFirst(['2026-11-19', '2026-11-19'])).toEqual(['2026-11-19'])
  })
})

describe('neighbours', () => {
  const dates = ['2026-11-18', '2026-11-20', '2026-11-19']
  it('gives the next older and next newer night', () => {
    expect(neighbours(dates, '2026-11-19')).toEqual({ older: '2026-11-18', newer: '2026-11-20' })
  })
  it('has nothing older than the oldest or newer than the newest', () => {
    expect(neighbours(dates, '2026-11-18')).toEqual({ older: null, newer: '2026-11-19' })
    expect(neighbours(dates, '2026-11-20')).toEqual({ older: '2026-11-19', newer: null })
  })
  it('has no neighbours for an unknown night or an empty list', () => {
    expect(neighbours(dates, '2026-01-01')).toEqual({ older: null, newer: null })
    expect(neighbours([], '2026-11-19')).toEqual({ older: null, newer: null })
  })
})
