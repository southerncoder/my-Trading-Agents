import { z } from 'zod'

const BASE = `${import.meta.env.VITE_API_URL || '/api'}/portfolio`
const n = z.number()
const nn = z.number().nullable()
const sn = z.string().nullable()

export const rulesSchema = z.object({
  position_size: n,
  max_position_pct: n,
  max_sector_pct: n,
  stop_pct: n,
  target_pct: n,
  max_hold_days: n,
  order_expiry_days: n,
  drawdown_alert_pct: n,
  max_open_positions: n,
  follow_shares: n.optional(),
})
export type Rules = z.infer<typeof rulesSchema>

export const educationalReviewSchema = z.object({
  summary: z.string(),
  why_not_before_flag: z.string(),
  figures_explained: z.string(),
  buy_low_sell_high: z.string(),
  risk_temperament: z.string(),
  portfolio_fit: z.string(),
}).partial()
export type EducationalReview = z.infer<typeof educationalReviewSchema>

export const summarySchema = z.object({
  id: n,
  name: z.string(),
  kind: z.enum(['owner', 'shadow', 'baseline']),
  starting_cash: n,
  cash: n,
  created_on: z.string(),
  archived: z.boolean(),
  rules: rulesSchema,
  equity: n,
  longValue: n,
  shortValue: n,
  returnPct: n,
  spyReturnPct: nn,
  maxDrawdownPct: n,
  openPositions: n,
  openAlerts: n,
  pendingOrders: n,
})
export type PortfolioSummary = z.infer<typeof summarySchema>

export const positionSchema = z.object({
  id: n,
  ticker: z.string(),
  direction: z.enum(['long', 'short']),
  quantity: n,
  avg_cost: n,
  opened_on: z.string(),
  closed_on: sn,
  status: z.enum(['open', 'closed']),
  source: sn,
  candidate_id: nn,
  stop_price: nn,
  target_price: nn,
  hold_until: sn,
  realized_pnl: n,
  sector: sn,
  mark: n,
  mark_date: sn,
  market_value: n,
  unrealized: n,
  returnPct: n,
  educational_review: educationalReviewSchema.nullable().optional(),
})
export type Position = z.infer<typeof positionSchema>

export const orderSchema = z.looseObject({
  id: n,
  ticker: z.string(),
  direction: z.enum(['long', 'short']),
  intent: z.enum(['open', 'close']),
  kind: z.enum(['market', 'trigger']),
  trigger_price: nn,
  trigger_when: z.enum(['above', 'below']).nullable(),
  amount: nn,
  quantity: nn,
  status: z.string(),
  created_on: z.string(),
  expires_on: sn,
  filled_on: sn,
  fill_price: nn,
  source: sn,
  note: sn,
})
export type Order = z.infer<typeof orderSchema>

export const tradeSchema = z.looseObject({
  id: n,
  ticker: z.string(),
  direction: z.string(),
  action: z.string(),
  quantity: n,
  price: n,
  traded_on: z.string(),
  source: sn,
  realized_pnl: n,
  note: sn,
})
export type Trade = z.infer<typeof tradeSchema>

export const alertSchema = z.looseObject({
  id: n,
  ticker: z.string(),
  kind: z.string(),
  severity: z.enum(['action', 'info']),
  message: z.string(),
  run_date: z.string(),
  acknowledged_at: sn,
  position_id: nn,
})
export type Alert = z.infer<typeof alertSchema>

export const performanceSchema = z.object({
  series: z.array(z.object({ date: z.string(), portfolio: n, spy: nn })),
  summary: z.object({ returnPct: n, spyReturnPct: nn, excessPct: nn, maxDrawdownPct: n }),
  startingCash: n,
})
export type Performance = z.infer<typeof performanceSchema>

export const pickSchema = z.looseObject({
  id: n,
  run_date: z.string(),
  ticker: z.string(),
  source: z.string(),
  decision: z.string(),
  confidence: nn,
  action_now: sn,
  label: z.string(),
  price: nn,
  trigger_price: nn,
  trigger_type: sn,
  walk_away: nn,
  rationale: sn,
  key_risks: z.array(z.string()).catch([]),
  tradeable: z.boolean(),
  direction: z.enum(['long', 'short']).nullable(),
  kind: z.enum(['market', 'trigger']).nullable(),
  reasons: z.record(z.string(), z.unknown()).nullable().optional(),
  educational_review: educationalReviewSchema.nullable().optional(),
  company: sn.optional(),
  sector: sn.optional(),
  llm_seconds: nn.optional(),
})
export type Pick = z.infer<typeof pickSchema>

export const picksSchema = z.object({ date: sn, dates: z.array(z.string()), picks: z.array(pickSchema) })

export const requestSchema = z.looseObject({
  id: n,
  ticker: z.string(),
  reason: z.string(),
  status: z.enum(['queued', 'running', 'done', 'failed']),
  requested_at: z.string(),
  finished_at: sn.optional(),
  error: sn.optional(),
  label: sn.optional(),
  decision: sn.optional(),
  confidence: nn.optional(),
  candidate_id: nn.optional(),
})
export type AnalysisRequest = z.infer<typeof requestSchema>

export const sourceStatSchema = z.object({ source: z.string(), positions: n, closed: n, winRatePct: n, avgReturnPct: n, avgExcessPct: nn })
export const resultsSchema = z.object({
  bySource: z.array(sourceStatSchema),
  positions: z.array(z.object({ ticker: z.string(), source: z.string(), returnPct: n, spyReturnPct: nn, closed: z.boolean() })),
  portfolios: z.array(summarySchema),
  forwardTest: z
    .object({ tradingDays: n, rule: z.string(), start: z.string(), end: z.string(), elapsed: n, status: z.string(), closedPositions: n, beatSpy: n })
    .nullable(),
})
export type Results = z.infer<typeof resultsSchema>

export const reviewSchema = z.looseObject({ id: n, week_ending: z.string(), model: sn, created_at: z.string(), body_md: z.string().optional(), preview: z.string().optional() })
export type Review = z.infer<typeof reviewSchema>

async function call(method: string, path: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  type Reply = { success?: boolean; data?: unknown; error?: string }
  // A proxy error page (nginx 502) is HTML: a failed parse must not hide the status code.
  const parsed: Reply | null = await res.json().then(
    (b) => b as Reply,
    () => null,
  )
  if (!res.ok || !parsed || parsed.success === false) throw new Error(parsed?.error || `Request failed (${res.status})`)
  return parsed.data
}
const get = (p: string) => call('GET', p)
const post = (p: string, b: unknown = {}) => call('POST', p, b)

export const fetchPortfolios = async () => z.array(summarySchema).parse(await get('/portfolios'))
export const fetchPortfolio = async (id: number) => summarySchema.parse(await get(`/portfolios/${id}`))
export const createPortfolio = async (b: { name: string; startingCash: number; rules?: Partial<Rules> }) => z.looseObject({ id: n }).parse(await post('/portfolios', b))
export const patchRules = async (id: number, rules: Partial<Rules>) => call('PATCH', `/portfolios/${id}/rules`, rules)
export const fetchPositions = async (id: number, status: 'open' | 'closed' | 'all' = 'open') => z.array(positionSchema).parse(await get(`/portfolios/${id}/positions?status=${status}`))
export const fetchOrders = async (id: number, pending = false) => z.array(orderSchema).parse(await get(`/portfolios/${id}/orders${pending ? '?status=pending' : ''}`))
export const fetchTrades = async (id: number) => z.array(tradeSchema).parse(await get(`/portfolios/${id}/trades`))
export const fetchAlerts = async (id: number, openOnly = true) => z.array(alertSchema).parse(await get(`/portfolios/${id}/alerts${openOnly ? '?open=1' : ''}`))
export const ackAlert = (id: number, alertId: number) => post(`/portfolios/${id}/alerts/${alertId}/ack`)
export const fetchPerformance = async (id: number) => performanceSchema.parse(await get(`/portfolios/${id}/performance`))

export interface TradeInput {
  ticker: string
  direction?: 'long' | 'short'
  amount?: number
  price?: number
  candidateId?: number
  note?: string
}
export const buy = (id: number, b: TradeInput) => post(`/portfolios/${id}/buy`, b) as Promise<{ warnings: string[] }>
export const triggerOrder = (id: number, b: TradeInput & { triggerPrice: number }) => post(`/portfolios/${id}/trigger-orders`, b)
export const sell = (id: number, positionId: number, b: { quantity?: number; price?: number }) => post(`/portfolios/${id}/positions/${positionId}/sell`, b)
export const cancelOrder = (id: number, orderId: number) => post(`/portfolios/${id}/orders/${orderId}/cancel`)

export const fetchPicks = async (date?: string) => picksSchema.parse(await get(`/picks${date ? `?date=${encodeURIComponent(date)}` : ''}`))
export const fetchRequests = async () => z.array(requestSchema).parse(await get('/analysis-requests'))
export const requestAnalysis = async (ticker: string) => requestSchema.parse(await post('/analysis-requests', { ticker }))
export const fetchResults = async () => resultsSchema.parse(await get('/sources/results'))
export const fetchReviews = async () => z.array(reviewSchema).parse(await get('/reviews'))
export const fetchReview = async (weekEnding: string) => reviewSchema.parse(await get(`/reviews/${weekEnding}`))
