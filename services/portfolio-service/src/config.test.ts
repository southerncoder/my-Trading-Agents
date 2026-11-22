import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { reviewModelFrom, watchlistFrom } from './config.js'

describe('config from tools/', () => {
  it('reads the default profile decision model and the watchlist tickers (BOM tolerated, bad tickers dropped)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tools-'))
    writeFileSync(join(dir, 'model-profiles.json'), '\uFEFF' + JSON.stringify({ default: 'c', profiles: { c: { fast: 'f', decision: 'big:cloud' } } }))
    writeFileSync(join(dir, 'watchlist.json'), JSON.stringify({ stocks: [{ ticker: 'ko' }, { ticker: 'bad ticker' }, { ticker: 'BRK-B' }] }))
    expect(reviewModelFrom(dir)).toBe('big:cloud')
    expect(watchlistFrom(dir)).toEqual(['KO', 'BRK-B'])
  })
  it('missing files give null and an empty list', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tools-'))
    expect(reviewModelFrom(dir)).toBeNull()
    expect(watchlistFrom(dir)).toEqual([])
  })
})
