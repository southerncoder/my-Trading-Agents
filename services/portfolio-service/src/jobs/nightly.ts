import type pg from 'pg'
import { tx, type Db } from '../db/pool.js'
import { valuation } from '../domain/accounting.js'
import { addDays, addTradingDays, tradingDaysBetween } from '../domain/calendar.js'
import { callSaysExit, checkExit, isBigMove } from '../domain/exits.js'
import { triggerFill } from '../domain/fills.js'
import { atr } from '../domain/indicators.js'
import { riskAlerts, type Rules } from '../domain/risk.js'
import { round, type Bar } from '../domain/types.js'
import type { Market } from '../market/yahoo.js'
import { pickIntent, type Candidate } from '../store/candidates.js'
import { insertAlert, requestAnalysis } from '../store/events.js'
import { latestMarks } from '../services/queries.js'
import { closeInTx, createPortfolio, getPortfolio, openInTx, type PortfolioRow, type PositionRow } from '../services/portfolio-ops.js'
import { UserError } from '../routes/http.js'
import { ingestLedger } from './ingest.js'

export interface NightlyDeps {
  pool: pg.Pool
  market: Market
  ledgerPath: string
}

export const SHADOW_NAME = 'System picks (shadow)'
const SHADOW_RULES: Partial<Rules> = { position_size: 2000, max_position_pct: 100, max_sector_pct: 100, max_open_positions: 500 }
export const PICK_SOURCES = ['watchlist', 'screen', 'news']
/** Closed positions keep getting prices this long, so the timing review can see what happened after the sale. */
const AFTER_SALE_DAYS = 40
const STALE_DAYS = 10
const HISTORY_DAYS = 45

/** The shadow portfolio takes every tradeable pick with a fixed size, so the owner's choices can be compared with it. */
export async function ensureShadow(pool: pg.Pool, date: string, spyClose: number | null): Promise<PortfolioRow> {
  const { rows } = await pool.query<{ id: number }>(`SELECT id FROM portfolios WHERE kind = 'shadow' AND NOT archived ORDER BY id LIMIT 1`)
  if (rows[0]) return getPortfolio(pool, rows[0].id)
  return createPortfolio(pool, { name: SHADOW_NAME, kind: 'shadow', startingCash: 100000, createdOn: date, rules: SHADOW_RULES, spyClose })
}

interface History {
  byTicker: Map<string, Bar[]>
  /** Bars after `after` up to and including the night, oldest first. */
  window(ticker: string, after: string, to: string): Bar[]
  barOn(ticker: string, date: string): Bar | undefined
  /** Close on or before the date, for marking. */
  mark(ticker: string, date: string): number | undefined
  prevClose(ticker: string, date: string): number | undefined
  atr(ticker: string, date: string): number | null
}

async function loadHistory(pool: pg.Pool, market: Market, tickers: string[], from: string, to: string, notes: string[]): Promise<History> {
  const byTicker = new Map<string, Bar[]>()
  for (const t of tickers) {
    let bars: Bar[]
    try {
      bars = await market.bars(t, from, to)
      for (const x of bars) {
        await pool.query(
          `INSERT INTO bars (ticker, date, open, high, low, close) VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (ticker, date) DO UPDATE SET open = EXCLUDED.open, high = EXCLUDED.high, low = EXCLUDED.low, close = EXCLUDED.close`,
          [t, x.date, x.open, x.high, x.low, x.close],
        )
      }
    } catch (e) {
      notes.push(`prices for ${t} unavailable (${(e as Error).message}); using stored bars`)
      bars = (await pool.query<Bar>(`SELECT date, open, high, low, close FROM bars WHERE ticker = $1 AND date BETWEEN $2 AND $3 ORDER BY date`, [t, from, to])).rows
    }
    byTicker.set(t, bars.filter((x) => x.date <= to).sort((a, b) => a.date.localeCompare(b.date)))
  }
  const get = (t: string) => byTicker.get(t) ?? []
  return {
    byTicker,
    window: (t, after, end) => get(t).filter((x) => x.date > after && x.date <= end),
    barOn: (t, d) => get(t).find((x) => x.date === d),
    mark: (t, d) => [...get(t)].reverse().find((x) => x.date <= d)?.close,
    prevClose: (t, d) => [...get(t)].reverse().find((x) => x.date < d)?.close,
    atr: (t, d) => atr(get(t).filter((x) => x.date <= d)),
  }
}

const later = (a: string, b: string) => (a > b ? a : b)
const money = (n: number) => `$${n.toFixed(2)}`

/** Fill or expire pending orders using every bar since they were last checked. */
async function processOrders(db: Db, p: PortfolioRow, h: History, lastChecked: string, date: string, summary: Summary) {
  // FOR UPDATE: a cancel from the page waits for this transaction, then finds the order no longer pending.
  const { rows: orders } = await db.query(`SELECT * FROM orders WHERE portfolio_id = $1 AND status = 'pending' AND created_on <= $2 ORDER BY id FOR UPDATE`, [p.id, date])
  for (const o of orders) {
    const bars = h.window(o.ticker, later(lastChecked, o.created_on), date).filter((x) => !o.expires_on || x.date <= o.expires_on)
    let filled = false
    for (const bar of bars) {
      const price = o.kind === 'trigger' ? triggerFill(o.trigger_when, o.trigger_price, bar) : bar.open
      if (price === null) continue
      const cand = o.candidate_id ? (await db.query<Candidate>('SELECT * FROM candidates WHERE id = $1', [o.candidate_id])).rows[0] : undefined
      // Checks first, then only the fill itself inside the savepoint, then alerts: a failure in an alert can never
      // land between RELEASE and ROLLBACK TO (which would abort the whole portfolio's night).
      if (o.intent === 'close') {
        // A queued exit (the shadow's response to a sell call) fills at the next open, like any market order.
        const pos = o.position_id ? (await db.query<{ status: string }>('SELECT status FROM positions WHERE id = $1', [o.position_id])).rows[0] : undefined
        if (!pos || pos.status !== 'open') {
          await db.query(`UPDATE orders SET status = 'cancelled', note = 'position already closed' WHERE id = $1`, [o.id])
          filled = true
          break
        }
      }
      let opened = false
      try {
        await db.query('SAVEPOINT fill')
        if (o.intent === 'close') {
          await closeInTx(db, { portfolioId: p.id, positionId: o.position_id, price, date: bar.date, quantity: o.quantity ?? undefined, orderId: o.id, note: o.note })
          await db.query('RELEASE SAVEPOINT fill')
          if (p.kind === 'shadow') summary.shadowClosed++
          if (p.kind === 'baseline') summary.baselineFills++
          filled = true
          break
        }
        await openInTx(db, { portfolioId: p.id, ticker: o.ticker, direction: o.direction, amount: o.quantity ? undefined : o.amount, quantity: o.quantity ?? undefined, price, date: bar.date, orderId: o.id, candidateId: o.candidate_id, source: o.source, walkAway: cand?.walk_away ?? null, sector: await sectorOf(db, o.ticker) })
        await db.query('RELEASE SAVEPOINT fill')
        opened = true
      } catch (e) {
        await db.query('ROLLBACK TO SAVEPOINT fill')
        if (!(e instanceof UserError)) throw e
        await db.query(`UPDATE orders SET status = 'cancelled', note = $2 WHERE id = $1`, [o.id, `Not filled: ${e.message}`])
        if (p.kind === 'owner') {
          await insertAlert(db, { portfolioId: p.id, orderId: o.id, ticker: o.ticker, kind: 'order_failed', severity: 'action', runDate: bar.date,
            message: `${o.ticker} reached your trigger but the order could not fill: ${e.message}` })
        }
      }
      if (opened) {
        summary.fills++
        if (p.kind === 'baseline') summary.baselineFills++
        if (p.kind === 'owner') {
          await insertAlert(db, { portfolioId: p.id, orderId: o.id, ticker: o.ticker, kind: 'order_filled', severity: 'info', runDate: bar.date, data: { price },
            message: `Your ${o.direction === 'long' ? 'buy' : 'short'} order for ${o.ticker} filled at ${money(price)} on ${bar.date}${o.trigger_price ? ` (trigger ${money(o.trigger_price)})` : ''}.` })
        }
      }
      filled = true
      break
    }
    if (!filled && o.expires_on && o.expires_on < date) {
      await db.query(`UPDATE orders SET status = 'expired' WHERE id = $1`, [o.id])
      summary.expired++
      if (p.kind === 'owner') {
        await insertAlert(db, { portfolioId: p.id, orderId: o.id, ticker: o.ticker, kind: 'order_expired', severity: 'info', runDate: date,
          message: `Your order for ${o.ticker} at ${money(o.trigger_price ?? 0)} expired on ${o.expires_on} without the price reaching it.` })
      }
    }
  }
}

async function sectorOf(db: Db, ticker: string): Promise<string | null> {
  return (await db.query<{ sector: string | null }>('SELECT sector FROM tickers WHERE ticker = $1', [ticker])).rows[0]?.sector ?? null
}

/** The shadow portfolio opens every tradeable pick from tonight's sources. */
async function shadowOpens(db: Db, p: PortfolioRow, date: string, summary: Summary) {
  const { rows: picks } = await db.query<Candidate>(`SELECT * FROM candidates WHERE run_date = $1 AND source = ANY($2) ORDER BY id`, [date, PICK_SOURCES])
  const held = new Set((await db.query<{ ticker: string }>(`SELECT ticker FROM positions WHERE portfolio_id = $1 AND status = 'open'`, [p.id])).rows.map((r) => r.ticker))
  // Tickers already handled tonight (an order for this exact call, or any order placed tonight, such as a queued
  // exit): a re-run of the night must not place a second order or flip into the opposite position.
  const { rows: tonight } = await db.query<{ ticker: string; candidate_id: number | null }>(
    `SELECT ticker, candidate_id FROM orders WHERE portfolio_id = $1 AND (created_on = $2 OR candidate_id = ANY($3))`,
    [p.id, date, picks.map((c) => c.id)],
  )
  const handled = new Set(tonight.map((o) => o.ticker))
  const ordered = new Set(tonight.map((o) => o.candidate_id))
  for (const c of picks) {
    const intent = pickIntent(c.label)
    if (!intent || held.has(c.ticker) || handled.has(c.ticker) || ordered.has(c.id) || !c.price) continue
    if (intent.kind === 'trigger' && !c.trigger_price) continue
    // A newer call replaces an older pending order for the same ticker.
    await db.query(`UPDATE orders SET status = 'cancelled', note = 'replaced by a newer call' WHERE portfolio_id = $1 AND ticker = $2 AND status = 'pending'`, [p.id, c.ticker])
    // Point-in-time: the call is made after the close, so even "buy now" first fills at the next day's open.
    const trigger = intent.kind === 'trigger' ? c.trigger_price : null
    await db.query(
      `INSERT INTO orders (portfolio_id, candidate_id, ticker, direction, intent, kind, trigger_price, trigger_when, amount, status, created_on, expires_on, source, note)
       VALUES ($1,$2,$3,$4,'open',$5,$6,$7,$8,'pending',$9,$10,$11,'shadow: every pick')`,
      [p.id, c.id, c.ticker, intent.direction, intent.kind, trigger, trigger === null ? null : trigger >= c.price ? 'above' : 'below',
        p.rules.position_size, date, addTradingDays(date, intent.kind === 'trigger' ? p.rules.order_expiry_days : 3), c.source],
    )
    handled.add(c.ticker)
    summary.shadowOrders++
  }
}

/**
 * The baseline portfolio follows every call from tonight's sources with the same number of shares: a buy call buys
 * that many (now, or when the trigger is reached), a sell or short call sells that many of a held position. Holds and
 * waits do nothing. No stops, targets or alerts: the position history shows exactly what following the advice did.
 * Long only. Orders fill at the next open or at the trigger, like every other order (point-in-time).
 */
async function baselineOrders(db: Db, p: PortfolioRow, date: string, summary: Summary) {
  const shares = p.rules.follow_shares ?? 1
  // The newest call per ticker: a ticker can appear in more than one source on a night.
  const { rows: picks } = await db.query<Candidate>(
    `SELECT DISTINCT ON (ticker) * FROM candidates WHERE run_date = $1 AND source = ANY($2) ORDER BY ticker, id DESC`,
    [date, PICK_SOURCES],
  )
  const { rows: tonight } = await db.query<{ ticker: string }>(`SELECT ticker FROM orders WHERE portfolio_id = $1 AND created_on = $2`, [p.id, date])
  const handled = new Set(tonight.map((o) => o.ticker))
  const { rows: open } = await db.query<PositionRow>(`SELECT * FROM positions WHERE portfolio_id = $1 AND status = 'open' AND direction = 'long'`, [p.id])
  const held = new Map(open.map((x) => [x.ticker, x]))
  const expiry = (days: number) => addTradingDays(date, days)

  for (const c of picks) {
    if (handled.has(c.ticker) || !c.price) continue
    const intent = pickIntent(c.label)
    const sell = callSaysExit('long', c.decision) || intent?.direction === 'short'
    if (sell) {
      const pos = held.get(c.ticker)
      // A sell call also withdraws any buy still waiting for its trigger.
      await db.query(`UPDATE orders SET status = 'cancelled', note = 'replaced by a sell call' WHERE portfolio_id = $1 AND ticker = $2 AND status = 'pending' AND intent = 'open'`, [p.id, c.ticker])
      if (!pos) continue
      // "Trim" sells the follow size; "Exit" (or a short call) sells everything the repeated buy calls added up to.
      const qty = c.label === 'Trim' ? Math.min(shares, pos.quantity) : pos.quantity
      await db.query(
        `INSERT INTO orders (portfolio_id, candidate_id, position_id, ticker, direction, intent, kind, quantity, status, created_on, expires_on, source, note)
         VALUES ($1,$2,$3,$4,'long','close','market',$5,'pending',$6,$7,$8,$9)`,
        [p.id, c.id, pos.id, c.ticker, qty, date, expiry(3), c.source, `baseline: ${c.label} call, sell ${qty === pos.quantity ? 'all' : qty}`],
      )
    } else if (intent?.direction === 'long') {
      if (intent.kind === 'trigger' && !c.trigger_price) continue
      await db.query(`UPDATE orders SET status = 'cancelled', note = 'replaced by a newer call' WHERE portfolio_id = $1 AND ticker = $2 AND status = 'pending' AND intent = 'open'`, [p.id, c.ticker])
      const trigger = intent.kind === 'trigger' ? c.trigger_price : null
      await db.query(
        `INSERT INTO orders (portfolio_id, candidate_id, ticker, direction, intent, kind, trigger_price, trigger_when, quantity, status, created_on, expires_on, source, note)
         VALUES ($1,$2,$3,'long','open',$4,$5,$6,$7,'pending',$8,$9,$10,$11)`,
        [p.id, c.id, c.ticker, intent.kind, trigger, trigger === null ? null : trigger >= c.price ? 'above' : 'below', shares, date,
          expiry(intent.kind === 'trigger' ? p.rules.order_expiry_days : 3), c.source, `baseline: ${c.label} call, buy ${shares}`],
      )
    } else continue
    handled.add(c.ticker)
    summary.baselineOrders++
  }
}

const EXIT_TEXT = { stop_hit: 'hit its stop', target_hit: 'reached its target', max_hold: 'reached its maximum holding time' } as const

/** Exit rules, sell calls, big moves and stale analysis for every open position. */
async function processPositions(db: Db, p: PortfolioRow, h: History, lastChecked: string, date: string, summary: Summary) {
  const { rows: open } = await db.query<PositionRow>(`SELECT * FROM positions WHERE portfolio_id = $1 AND status = 'open' ORDER BY id`, [p.id])
  for (const pos of open) {
    let exited = false
    for (const bar of h.window(pos.ticker, later(lastChecked, pos.opened_on), date)) {
      const hit = checkExit({ direction: pos.direction, stop: pos.stop_price, target: pos.target_price, holdUntil: pos.hold_until }, bar)
      if (!hit) continue
      exited = true
      if (p.kind === 'shadow') {
        await closeInTx(db, { portfolioId: p.id, positionId: pos.id, price: hit.price, date: bar.date, note: `shadow: ${hit.kind}` })
        summary.shadowClosed++
      } else {
        // Once per position and rule: a stop that stays broken must not alert (and spend a re-analysis) every night.
        const already = (await db.query('SELECT 1 FROM alerts WHERE position_id = $1 AND kind = $2 LIMIT 1', [pos.id, hit.kind])).rows[0]
        if (already) break
        const isNew = await insertAlert(db, {
          portfolioId: p.id, positionId: pos.id, ticker: pos.ticker, kind: hit.kind, severity: 'action', runDate: bar.date, data: { price: hit.price },
          message: `${pos.ticker} ${EXIT_TEXT[hit.kind]} on ${bar.date} (${money(hit.price)}). The plan says ${pos.direction === 'long' ? 'sell' : 'cover'}; record the sale if you act on it.`,
        })
        if (isNew) summary.alerts++
        if (isNew && hit.kind !== 'max_hold') await requestAnalysis(db, { ticker: pos.ticker, reason: hit.kind, portfolioId: p.id, positionId: pos.id })
      }
      break
    }
    if (exited && p.kind === 'shadow') continue

    // Only the nightly pick sources count: the owner's own on-demand analyses must not steer the shadow.
    const call = (await db.query<Candidate>(`SELECT * FROM candidates WHERE ticker = $1 AND run_date = $2 AND source = ANY($3) ORDER BY id DESC LIMIT 1`, [pos.ticker, date, PICK_SOURCES])).rows[0]
    if (call && callSaysExit(pos.direction, call.decision)) {
      if (p.kind === 'shadow') {
        // Queue the exit for the next open (point-in-time), once.
        const queued = (await db.query(`SELECT 1 FROM orders WHERE position_id = $1 AND intent = 'close' AND status = 'pending'`, [pos.id])).rows[0]
        if (!queued) {
          await db.query(
            `INSERT INTO orders (portfolio_id, candidate_id, position_id, ticker, direction, intent, kind, status, created_on, expires_on, source, note)
             VALUES ($1,$2,$3,$4,$5,'close','market','pending',$6,$7,$8,$9)`,
            [p.id, call.id, pos.id, pos.ticker, pos.direction, date, addTradingDays(date, 3), pos.source, `shadow: ${call.label} call`],
          )
        }
        continue
      }
      const isNew = await insertAlert(db, {
        portfolioId: p.id, positionId: pos.id, ticker: pos.ticker, kind: 'sell_call', severity: 'action', runDate: date, data: { candidateId: call.id, decision: call.decision },
        message: `Tonight's analysis of ${pos.ticker} says ${call.label} (${call.decision}, confidence ${call.confidence ?? '?'}). ${call.rationale ?? ''}`.trim(),
      })
      if (isNew) summary.alerts++
    }
    if (p.kind !== 'owner' || exited) continue

    const bar = h.barOn(pos.ticker, date)
    const prev = h.prevClose(pos.ticker, date)
    if (bar && prev && isBigMove(pos.direction, prev, bar.close, h.atr(pos.ticker, date))) {
      const pct = round(((bar.close - prev) / prev) * 100, 1)
      const isNew = await insertAlert(db, {
        portfolioId: p.id, positionId: pos.id, ticker: pos.ticker, kind: 'big_move', severity: 'info', runDate: date, data: { changePct: pct },
        message: `${pos.ticker} moved ${pct}% against your position today, more than two typical days. A fresh analysis has been requested.`,
      })
      if (isNew) await requestAnalysis(db, { ticker: pos.ticker, reason: 'big_move', portfolioId: p.id, positionId: pos.id })
    }
    if (tradingDaysBetween(pos.opened_on, date) >= STALE_DAYS) {
      const last = (await db.query<{ d: string | null }>(`SELECT max(run_date)::text d FROM candidates WHERE ticker = $1`, [pos.ticker])).rows[0].d
      if (!last || tradingDaysBetween(last, date) >= STALE_DAYS) await requestAnalysis(db, { ticker: pos.ticker, reason: 'stale', portfolioId: p.id, positionId: pos.id })
    }
  }
}

/** Mark to market, store the night's snapshot, and (for the owner) check the portfolio risk limits. */
async function snapshotAndRisk(db: Db, portfolioId: number, h: History, date: string) {
  const p = await getPortfolio(db, portfolioId)
  const { rows: open } = await db.query<PositionRow>(`SELECT * FROM positions WHERE portfolio_id = $1 AND status = 'open'`, [p.id])
  const marks: Record<string, number | undefined> = {}
  for (const x of open) marks[x.ticker] = h.mark(x.ticker, date)
  // A stock with no price in the loaded window (a long halt) keeps its last stored close rather than its cost.
  const missing = open.filter((x) => marks[x.ticker] === undefined).map((x) => x.ticker)
  for (const [t, m] of Object.entries(await latestMarks(db, missing, date))) marks[t] = m.close
  const v = valuation(p.cash, open.map((x) => ({ ticker: x.ticker, direction: x.direction, quantity: x.quantity, avgCost: x.avg_cost })), marks)
  const spy = h.barOn('SPY', date)?.close ?? null
  await db.query(
    `INSERT INTO snapshots (portfolio_id, date, cash, long_value, short_value, equity, spy_close) VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (portfolio_id, date) DO UPDATE SET cash = EXCLUDED.cash, long_value = EXCLUDED.long_value, short_value = EXCLUDED.short_value,
       equity = EXCLUDED.equity, spy_close = COALESCE(EXCLUDED.spy_close, snapshots.spy_close)`,
    [p.id, date, p.cash, v.longValue, v.shortValue, v.equity, spy],
  )
  if (p.kind !== 'owner') return v.equity
  const peak = (await db.query<{ m: number }>(`SELECT max(equity) m FROM snapshots WHERE portfolio_id = $1 AND date <= $2`, [p.id, date])).rows[0].m
  const drafts = riskAlerts({
    rules: p.rules, equity: v.equity, peakEquity: Math.max(peak ?? 0, p.starting_cash),
    positions: open.map((x) => ({ ticker: x.ticker, value: x.quantity * (marks[x.ticker] ?? x.avg_cost), sector: x.sector })),
  })
  for (const d of drafts) {
    const pos = open.find((x) => x.ticker === d.ticker)
    await insertAlert(db, { portfolioId: p.id, positionId: pos?.id ?? null, ticker: d.ticker, kind: d.kind, severity: d.severity, message: d.message, runDate: date, data: d.data })
  }
  return v.equity
}

interface Summary {
  candidates: number
  fills: number
  expired: number
  alerts: number
  shadowOpened: number
  shadowOrders: number
  shadowClosed: number
  baselineOrders: number
  baselineFills: number
  notes: string[]
  equity: Record<string, number>
}

/**
 * The nightly portfolio job for one market date. Safe to re-run: fills, closes, alerts and requests are keyed so a
 * second run of the same night finds nothing new. Bars since the last successful run are all checked, so a
 * missed night is caught up. Each portfolio runs in its own transaction.
 */
export async function runNightly(deps: NightlyDeps, date: string) {
  const { pool, market } = deps
  const run = (await pool.query<{ id: number }>(`INSERT INTO runs (kind, run_date) VALUES ('nightly', $1) RETURNING id`, [date])).rows[0].id
  const summary: Summary = { candidates: 0, fills: 0, expired: 0, alerts: 0, shadowOpened: 0, shadowOrders: 0, shadowClosed: 0, baselineOrders: 0, baselineFills: 0, notes: [], equity: {} }
  try {
    const ing = await ingestLedger(pool, deps.ledgerPath, date)
    summary.candidates = ing.stored
    if (ing.missing) summary.notes.push('decision ledger not found')
    if (ing.skippedLines) summary.notes.push(`${ing.skippedLines} unreadable ledger lines skipped`)

    const lastOk = (await pool.query<{ d: string | null }>(`SELECT max(run_date)::text d FROM runs WHERE kind = 'nightly' AND status = 'ok' AND run_date < $1`, [date])).rows[0].d
    // The first run ever looks back over the whole history window: orders placed before it are still checked
    // (each order and position only looks at bars after it was placed or opened).
    const lastChecked = lastOk ?? addDays(date, -HISTORY_DAYS)

    const { rows: tick } = await pool.query<{ ticker: string }>(
      `SELECT ticker FROM positions WHERE status = 'open'
       UNION SELECT ticker FROM orders WHERE status = 'pending'
       UNION SELECT ticker FROM candidates WHERE run_date = $1
       UNION SELECT ticker FROM positions WHERE status = 'closed' AND closed_on >= $2`,
      [date, addDays(date, -AFTER_SALE_DAYS)],
    )
    const tickers = [...new Set(['SPY', ...tick.map((r) => r.ticker)])]
    // Enough history for ATR and every bar since the last successful night, whichever reaches further back.
    const from = [lastChecked, addDays(date, -HISTORY_DAYS)].sort()[0]
    const h = await loadHistory(pool, market, tickers, from, date, summary.notes)

    for (const t of tickers.filter((x) => x !== 'SPY')) {
      const known = (await pool.query('SELECT 1 FROM tickers WHERE ticker = $1 AND sector IS NOT NULL', [t])).rows[0]
      if (known) continue
      const prof = await market.profile(t)
      await pool.query(
        `INSERT INTO tickers (ticker, name, sector) VALUES ($1,$2,$3) ON CONFLICT (ticker) DO UPDATE SET name = COALESCE(EXCLUDED.name, tickers.name), sector = COALESCE(EXCLUDED.sector, tickers.sector), updated_at = now()`,
        [t, prof.name, prof.sector],
      )
    }
    await pool.query(`UPDATE positions p SET sector = t.sector FROM tickers t WHERE p.sector IS NULL AND t.ticker = p.ticker AND t.sector IS NOT NULL`)

    await ensureShadow(pool, date, h.barOn('SPY', date)?.close ?? null)
    const { rows: portfolios } = await pool.query<{ id: number }>(`SELECT id FROM portfolios WHERE NOT archived AND created_on <= $1 ORDER BY id`, [date])
    for (const { id } of portfolios) {
      try {
        summary.equity[id] = await tx(pool, async (db) => {
          const p = await getPortfolio(db, id, true)
          await processOrders(db, p, h, lastChecked, date, summary)
          if (p.kind === 'shadow') await shadowOpens(db, await getPortfolio(db, id), date, summary)
          // The baseline only follows the calls: no exit rules, alerts or re-analysis requests.
          if (p.kind === 'baseline') await baselineOrders(db, await getPortfolio(db, id), date, summary)
          else await processPositions(db, await getPortfolio(db, id), h, lastChecked, date, summary)
          return snapshotAndRisk(db, id, h, date)
        })
      } catch (e) {
        summary.notes.push(`portfolio ${id} failed: ${(e as Error).message}`)
        throw e
      }
    }
    await pool.query(`UPDATE runs SET status = 'ok', finished_at = now(), summary = $2 WHERE id = $1`, [run, JSON.stringify(summary)])
    return { status: 'ok' as const, runId: run, summary }
  } catch (e) {
    summary.notes.push(`failed: ${(e as Error).message}`)
    await pool.query(`UPDATE runs SET status = 'failed', finished_at = now(), summary = $2 WHERE id = $1`, [run, JSON.stringify(summary)])
    return { status: 'failed' as const, runId: run, summary }
  }
}
