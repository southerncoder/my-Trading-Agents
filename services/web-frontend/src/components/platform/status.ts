export type LineSeverity = 'problem' | 'warning' | 'ok'

/** Classifies a status.txt line so the Platform page can make trouble stand out. */
export function lineSeverity(line: string): LineSeverity {
  if (/^PROBLEMS:/.test(line) || /\bFAILED\b/i.test(line)) return 'problem'
  if (/^Watchlist requests are waiting/.test(line) || /^Watchlist changes rejected/.test(line)) return 'warning'
  return 'ok'
}