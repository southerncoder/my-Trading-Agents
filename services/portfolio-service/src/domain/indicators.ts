import type { Bar } from './types.js'

/** Average true range over the last n bars (needs n + 1 bars), or null. */
export function atr(bars: Bar[], n = 14): number | null {
  if (bars.length < n + 1) return null
  const recent = bars.slice(-(n + 1))
  let sum = 0
  for (let i = 1; i < recent.length; i++) {
    const { high, low } = recent[i]
    const prev = recent[i - 1].close
    sum += Math.max(high - low, Math.abs(high - prev), Math.abs(low - prev))
  }
  return sum / n
}
