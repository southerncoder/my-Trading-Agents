import { describe, it, expect } from 'vitest'
import { lineSeverity } from './status'

describe('lineSeverity', () => {
  it('flags a PROBLEMS line and any FAILED line as a problem', () => {
    expect(lineSeverity('PROBLEMS: nightly-brief.ps1 threw: x')).toBe('problem')
    expect(lineSeverity('Step 3 FAILED for AMD')).toBe('problem')
  })
  it('flags waiting watchlist changes and rejected changes as a warning', () => {
    expect(lineSeverity('Watchlist requests are waiting: watchlist.json could not be updated (x)')).toBe('warning')
    expect(lineSeverity('Watchlist changes rejected: KO (already on the watchlist)')).toBe('warning')
  })
  it('leaves normal lines alone', () => {
    expect(lineSeverity('Calls: Buy now: 3')).toBe('ok')
    expect(lineSeverity('Watchlist changes applied: NVDA now paused')).toBe('ok')
    expect(lineSeverity('Took 71 minutes')).toBe('ok')
  })
})