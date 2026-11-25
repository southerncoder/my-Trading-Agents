import { describe, expect, it } from 'vitest'
import { sourcesIn } from './charts'

const night = (bySource: Record<string, number>) => ({ date: '2026-11-24', calls: 1, bySource, profile: '', seconds_total: null, seconds_median: null, minutes: null })

describe('sourcesIn', () => {
  it('keeps the fixed source order and adds "other" only when needed', () => {
    expect(sourcesIn([night({ news: 1, core: 2 })]).map((s) => s.key)).toEqual(['core', 'news'])
    expect(sourcesIn([night({ screen: 1 }), night({ on_demand: 1 })]).map((s) => s.key)).toEqual(['screen', 'other'])
  })
})
