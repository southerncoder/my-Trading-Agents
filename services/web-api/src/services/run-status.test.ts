import { describe, it, expect } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { loadRunStatus } from './run-status.js'

function logs(): string {
  return mkdtempSync(join(tmpdir(), 'rs-'))
}
function night(root: string, date: string, status?: string) {
  mkdirSync(join(root, date), { recursive: true })
  if (status !== undefined) writeFileSync(join(root, date, 'status.txt'), status)
}

describe('loadRunStatus', () => {
  it('returns the newest dated status.txt, trimmed, blanks dropped', async () => {
    const root = logs()
    night(root, '2026-11-19', 'old line')
    night(root, '2026-11-20', '\uFEFFCalls: 20 \r\n\r\n  Took 21 minutes\r\n')
    expect(await loadRunStatus(root)).toEqual({ date: '2026-11-20', lines: ['Calls: 20', 'Took 21 minutes'] })
  })

  it('skips date dirs without status.txt', async () => {
    const root = logs()
    night(root, '2026-11-19', 'older')
    night(root, '2026-11-20')
    expect((await loadRunStatus(root))?.date).toBe('2026-11-19')
  })

  it('ignores non-date entries such as latest.html or odd names', async () => {
    const root = logs()
    night(root, '2026-11-18', 'ok')
    night(root, 'zzz-not-a-date', 'bad')
    writeFileSync(join(root, 'latest.html'), '<html/>')
    expect((await loadRunStatus(root))?.date).toBe('2026-11-18')
  })

  it('returns null when the dir is missing or has no status', async () => {
    expect(await loadRunStatus(join(tmpdir(), 'no-such-logs-dir'))).toBeNull()
    expect(await loadRunStatus(logs())).toBeNull()
  })
})
