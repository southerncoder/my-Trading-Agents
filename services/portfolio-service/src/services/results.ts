import type { Db } from '../db/pool.js'
import { tradingDaysBetween } from '../domain/calendar.js'
import { sourceStats, spyReturn, type SourceItem } from '../domain/performance.js'
import { round } from '../domain/types.js'
import { FORWARD_TEST, forwardTestEnd } from '../sources/tonight.js'
import { portfolioSummary, positionsView } from './queries.js'
import { getPortfolio } from './portfolio-ops.js'

async function spyCloses(db: Db): Promise<Record<string, number>> {
  const { rows } = await db.query<{ date: string; close: number }>(`SELECT date, close FROM bars WHERE ticker = 'SPY'`)
  return Object.fromEntries(rows.map((r) => [r.date, r.close]))
}

/**
 * How each pick source has done, measured on the shadow portfolio (which takes every pick, so the owner's choices
 * do not bias it), next to every portfolio's return and SPY's, plus the forward test status.
 */
export async function sourceResults(db: Db, asOf: string) {
  const shadowId = (await db.query<{ id: number }>(`SELECT id FROM portfolios WHERE kind = 'shadow' AND NOT archived ORDER BY id LIMIT 1`)).rows[0]?.id
  const { rows: ids } = await db.query<{ id: number }>(`SELECT id FROM portfolios WHERE NOT archived ORDER BY kind, id`)
  const portfolios = await Promise.all(ids.map(async (x) => portfolioSummary(db, await getPortfolio(db, x.id), asOf)))
  if (!shadowId) return { bySource: [], positions: [], portfolios, forwardTest: null }
  const spy = await spyCloses(db)
  const positions = await positionsView(db, shadowId, 'all', asOf)
  const items: (SourceItem & { ticker: string })[] = positions.map((p) => {
    const spyPct = spyReturn(spy, p.opened_on, p.closed_on ?? asOf)
    return { ticker: p.ticker, source: p.source ?? 'unknown', returnPct: p.returnPct, spyReturnPct: spyPct === null ? null : round(spyPct, 2), closed: p.status === 'closed' }
  })
  const shadow = portfolios.find((p) => p.id === shadowId)
  const start = shadow?.created_on ?? asOf
  const end = forwardTestEnd(start)
  const closed = items.filter((i) => i.closed && i.spyReturnPct !== null)
  const beat = closed.filter((i) => i.returnPct > (i.spyReturnPct as number)).length
  const done = asOf >= end
  const passed = done && shadow !== undefined && shadow.spyReturnPct !== null && shadow.returnPct >= shadow.spyReturnPct && closed.length > 0 && beat / closed.length >= 0.5
  return {
    bySource: sourceStats(items),
    positions: items,
    portfolios,
    forwardTest: {
      ...FORWARD_TEST,
      start,
      end,
      elapsed: Math.min(tradingDaysBetween(start, asOf), FORWARD_TEST.tradingDays),
      status: done ? (passed ? 'passed' : 'failed') : 'in progress',
      closedPositions: closed.length,
      beatSpy: beat,
    },
  }
}
