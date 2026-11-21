import { readdir, readFile } from 'fs/promises'
import { join } from 'path'

export interface RunStatus {
  date: string
  lines: string[]
}

const DATE_DIR_RE = /^\d{4}-\d{2}-\d{2}$/

/** Newest dated night directory that has a status.txt, or null. */
export async function loadRunStatus(logsDir: string): Promise<RunStatus | null> {
  let names: string[]
  try {
    names = await readdir(logsDir)
  } catch {
    return null
  }
  for (const date of names.filter((n) => DATE_DIR_RE.test(n)).sort().reverse()) {
    try {
      const text = (await readFile(join(logsDir, date, 'status.txt'), 'utf8')).replace(/^\uFEFF/, '')
      const lines = text
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
      return { date, lines }
    } catch {
      // no status.txt for this night, try the previous one
    }
  }
  return null
}
