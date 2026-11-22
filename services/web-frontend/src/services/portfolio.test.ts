import { afterEach, describe, expect, it, vi } from 'vitest'
import { buy, fetchPicks, fetchPortfolios, requestAnalysis } from './portfolio'

const reply = (status: number, body: unknown, json = true) =>
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: json ? async () => body : async () => { throw new SyntaxError('Unexpected token <') },
    }),
  )
afterEach(() => vi.unstubAllGlobals())

const summary = {
  id: 1, name: 'Mine', kind: 'owner', starting_cash: 10000, cash: 9000, created_on: '2026-11-21', archived: false,
  rules: { position_size: 1000, max_position_pct: 15, max_sector_pct: 35, stop_pct: 8, target_pct: 15, max_hold_days: 60, order_expiry_days: 10, drawdown_alert_pct: 10, max_open_positions: 20 },
  equity: 10050, longValue: 1050, shortValue: 0, returnPct: 0.5, spyReturnPct: null, maxDrawdownPct: 0, openPositions: 1, openAlerts: 2, pendingOrders: 0,
}

describe('portfolio API client', () => {
  it('parses the portfolio list', async () => {
    reply(200, { success: true, data: [summary] })
    const list = await fetchPortfolios()
    expect(list[0]).toMatchObject({ name: 'Mine', equity: 10050, spyReturnPct: null })
  })

  it('a proxy error page (not JSON) reports the status, not a parser error', async () => {
    reply(502, null, false)
    await expect(fetchPortfolios()).rejects.toThrow('Request failed (502)')
  })

  it('shows the service’s own message for a refused trade', async () => {
    reply(400, { success: false, error: 'Not enough cash: this needs $1000.00 and the portfolio has $10.00' })
    await expect(buy(1, { ticker: 'KO' })).rejects.toThrow('Not enough cash')
  })

  it('sends JSON bodies to the right path', async () => {
    reply(201, { success: true, data: { id: 3, ticker: 'NVDA', status: 'queued', reason: 'on_demand', requested_at: '2026-11-22T07:00:00Z' } })
    await requestAnalysis('nvda')
    const [url, init] = (fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0]
    expect(url).toBe('/api/portfolio/analysis-requests')
    expect(init).toMatchObject({ method: 'POST', body: JSON.stringify({ ticker: 'nvda' }) })
  })

  it('picks: an empty night parses', async () => {
    reply(200, { success: true, data: { date: null, dates: [], picks: [] } })
    expect(await fetchPicks()).toEqual({ date: null, dates: [], picks: [] })
  })
})
