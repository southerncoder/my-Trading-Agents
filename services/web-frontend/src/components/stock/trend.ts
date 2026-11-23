import type { HistoryPoint } from '../../services/nightly'

const money = (n: number) => `$${n.toFixed(2)}`
const pct = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)}%`
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)

/**
 * Plain-English notes on how a stock's call and price moved across the nights up to `date`.
 * Worked out from the history alone, so they hold even on nights without a Professor review.
 */
export function trendNotes(history: HistoryPoint[], date: string): string[] {
  const upTo = history.filter((h) => h.date <= date)
  const now = upTo[upTo.length - 1]
  if (!now) return []
  const notes: string[] = []
  const first = upTo[0]

  if (upTo.length === 1) {
    notes.push('This is the first night the system looked at this stock, so there is no trend yet: each later night adds a point.')
  } else {
    const move = (now.price / first.price - 1) * 100
    const dir = Math.abs(move) < 1 ? 'roughly flat' : move > 0 ? 'up' : 'down'
    notes.push(
      `Over ${upTo.length} nights (${first.date} to ${now.date}) the price went from ${money(first.price)} to ${money(now.price)}, ${dir} (${pct(move)}).`,
    )

    const changes = upTo.slice(1).filter((h, i) => h.label !== upTo[i].label)
    if (changes.length === 0) {
      notes.push(`The call stayed "${now.label}" every night: the system has not changed its mind.`)
    } else {
      const last = changes[changes.length - 1]
      const before = upTo[upTo.indexOf(last) - 1]
      notes.push(
        `The call changed ${changes.length} time${changes.length === 1 ? '' : 's'}; most recently from "${before.label}" to "${last.label}" on ${last.date}.` +
          (changes.length >= 3 ? ' Frequent flips mean the evidence is mixed, so treat any single night with caution.' : ''),
      )
    }

    const prevTrig = [...upTo.slice(0, -1)].reverse().find((h) => finite(h.trigger_price))
    if (finite(now.trigger_price) && prevTrig && finite(prevTrig.trigger_price)) {
      const shift = (now.trigger_price / prevTrig.trigger_price - 1) * 100
      if (Math.abs(shift) >= 1) {
        notes.push(
          `The trigger moved from ${money(prevTrig.trigger_price)} (${prevTrig.date}) to ${money(now.trigger_price)}: the level it wants to see has ${shift > 0 ? 'risen' : 'dropped'} with the price.`,
        )
      }
    }

    const dc = Math.round((now.confidence - first.confidence) * 100)
    if (Math.abs(dc) >= 10) {
      notes.push(`Confidence ${dc > 0 ? 'rose' : 'fell'} from ${Math.round(first.confidence * 100)}% to ${Math.round(now.confidence * 100)}% over these nights.`)
    }
  }

  if (finite(now.ma50) && finite(now.ma200)) {
    const above50 = now.price >= now.ma50
    const above200 = now.price >= now.ma200
    notes.push(
      `The price is ${above50 ? 'above' : 'below'} its 50-day average (${money(now.ma50)}) and ${above200 ? 'above' : 'below'} its 200-day average (${money(now.ma200)}). ` +
        (now.ma50 >= now.ma200
          ? !above50 && !above200
            ? 'The averages still point to a longer-term uptrend, but the price has dropped below both: that uptrend is being tested.'
            : 'The shorter average sits above the longer one, which traders read as a longer-term uptrend.'
          : above50 && above200
            ? 'The averages still point to a longer-term downtrend, but the price has climbed above both: a possible turn, not yet confirmed.'
            : 'The shorter average sits below the longer one, which traders read as a longer-term downtrend.'),
    )
  }

  if (finite(now.walk_away) && now.price > 0) {
    const room = (now.price / now.walk_away - 1) * 100
    notes.push(
      room > 0
        ? `The price is ${room.toFixed(1)}% above the walk-away level of ${money(now.walk_away)}; below that, the idea is dropped.`
        : `The price is already below the walk-away level of ${money(now.walk_away)}, so the idea no longer holds.`,
    )
  }
  return notes
}
