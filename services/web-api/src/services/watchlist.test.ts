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

  it('skips and counts a bad ticker and non-objects only', async () => {
    const r = await loadWatchlist(
      file(
        JSON.stringify({
          stocks: [
            { ticker: 'bad ticker', list: 'core', cadence: 'nightly' },
            { list: 'core' },
            'junk',
            { ticker: 'MSFT', list: 'core', cadence: 'nightly' },
          ],
        }),
      ),
    )
    expect(r.stocks.map((s) => s.ticker)).toEqual(['MSFT'])
    expect(r.skipped).toBe(3)
  })

  it('matches watchlist.ps1: trims and uppercases the ticker, lowercases cadence', async () => {
    const r = await loadWatchlist(file(JSON.stringify({ stocks: [{ ticker: ' amd ', list: 'core', cadence: 'Weekly' }] })))
    expect(r.stocks).toEqual([{ ticker: 'AMD', list: 'core', cadence: 'weekly' }])
  })

  it('matches watchlist.ps1: missing cadence is nightly, any non-core list is brands', async () => {
    const r = await loadWatchlist(
      file(JSON.stringify({ stocks: [{ ticker: 'KO', list: 'staples' }, { ticker: 'PEP' }, { ticker: 'XOM', list: 'core', cadence: '' }] })),
    )
    expect(r.stocks).toEqual([
      { ticker: 'KO', list: 'brands', cadence: 'nightly' },
      { ticker: 'PEP', list: 'brands', cadence: 'nightly' },
      { ticker: 'XOM', list: 'core', cadence: 'nightly' },
    ])
    expect(r.skipped).toBe(0)
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
