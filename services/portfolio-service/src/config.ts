import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

function readJson(path: string): unknown {
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
  } catch {
    return null
  }
}

/** The decision model of the default profile in tools/model-profiles.json (model names live only there). */
export function reviewModelFrom(toolsDir: string): string | null {
  const cfg = readJson(join(toolsDir, 'model-profiles.json')) as { default?: string; profiles?: Record<string, { decision?: string }> } | null
  if (!cfg?.profiles) return null
  return cfg.profiles[cfg.default ?? '']?.decision ?? null
}

/** Every ticker on tools/watchlist.json, whatever its schedule (read each time: the nightly launcher rewrites it). */
export function watchlistFrom(toolsDir: string): string[] {
  const wl = readJson(join(toolsDir, 'watchlist.json')) as { stocks?: { ticker?: unknown }[] } | null
  return (wl?.stocks ?? []).map((s) => String(s.ticker ?? '').trim().toUpperCase()).filter((t) => /^[A-Z][A-Z0-9.-]{0,9}$/.test(t))
}
