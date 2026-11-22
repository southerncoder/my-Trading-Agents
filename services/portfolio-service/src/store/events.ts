import type { Db } from '../db/pool.js'

export interface AlertInput {
  portfolioId: number
  positionId?: number | null
  orderId?: number | null
  ticker: string
  kind: string
  severity: 'action' | 'info'
  message: string
  runDate: string
  data?: Record<string, unknown>
}

/** Inserts an alert unless the same one (portfolio, ticker, kind, date) exists. Returns true when it is new. */
export async function insertAlert(db: Db, a: AlertInput): Promise<boolean> {
  const { rowCount } = await db.query(
    `INSERT INTO alerts (portfolio_id, position_id, order_id, ticker, kind, severity, message, run_date, data)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (portfolio_id, ticker, kind, run_date) DO NOTHING`,
    [a.portfolioId, a.positionId ?? null, a.orderId ?? null, a.ticker, a.kind, a.severity, a.message, a.runDate, JSON.stringify(a.data ?? {})],
  )
  return (rowCount ?? 0) > 0
}

export type RequestReason = 'on_demand' | 'stop_hit' | 'target_hit' | 'big_move' | 'stale'

/** Queues a fresh analysis of a ticker unless one is already queued or running. Returns the request id or null. */
export async function requestAnalysis(
  db: Db,
  a: { ticker: string; reason: RequestReason; portfolioId?: number | null; positionId?: number | null },
): Promise<number | null> {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO analysis_requests (ticker, reason, portfolio_id, position_id) VALUES ($1,$2,$3,$4)
     ON CONFLICT (ticker) WHERE status IN ('queued','running') DO NOTHING RETURNING id`,
    [a.ticker, a.reason, a.portfolioId ?? null, a.positionId ?? null],
  )
  return rows[0]?.id ?? null
}
