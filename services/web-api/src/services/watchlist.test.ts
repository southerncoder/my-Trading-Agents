import { describe, it, expect } from 'vitest'
import { mkdtempSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { loadWatchlist } from './watchlist.js'

function file(content: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'wl-'))
  const p = join(dir, 'watchlist.json')
  writeFileSync(p, content)
  return p
}

describe('loadWatchlist', () => {
  it('reads stocks, keeps lesson, strips a BOM', async () => {
    const p = file(
      '\uFEFF' +
        JSON.stringify({
          _comment: 'x',
          stocks: [
            { ticker: 'NVDA', list: 'core', cadence: 'nightly' },
            { ticker: 'KO', list: 'brands', cadence: 'weekly', lesson: 'staples' },
          ],
        }),
    )
    const r = await loadWatchlist(p)
    expect(r.available).toBe(true)
    expect(r.skipped).toBe(0)
    expect(r.stocks).toEqual([
      { ticker: 'NVDA', list: 'core', cadence: 'nightly' },
      { ticker: 'KO', list: 'brands', cadence: 'weekly', lesson: 'staples' },
    ])
  })

  it('treats an unknown cadence as paused', async () => {
    const r = await loadWatchlist(file(JSON.stringify({ stocks: [{ ticker: 'AAPL', list: 'core', cadence: 'hourly' }] })))
    expect(r.stocks[0].cadence).toBe('paused')
  })

  it('skips and counts bad ticker, bad list and non-objects', async () => {
    const r = await loadWatchlist(
      file(
        JSON.stringify({
          stocks: [
            { ticker: 'bad ticker', list: 'core', cadence: 'nightly' },
            { ticker: 'MSFT', list: 'other', cadence: 'nightly' },
            'junk',
            { ticker: 'MSFT', list: 'core', cadence: 'nightly' },
          ],
        }),
      ),
    )
    expect(r.stocks.map((s) => s.ticker)).toEqual(['MSFT'])
    expect(r.skipped).toBe(3)
  })

  it('returns available:false for a missing file', async () => {
    const r = await loadWatchlist(join(tmpdir(), 'does-not-exist-wl', 'watchlist.json'))
    expect(r).toEqual({ stocks: [], skipped: 0, available: false })
  })

  it('returns available:false for unparsable JSON or a missing stocks array', async () => {
    expect((await loadWatchlist(file('{nope'))).available).toBe(false)
    expect((await loadWatchlist(file('{"stocks": 3}'))).available).toBe(false)
  })
})
