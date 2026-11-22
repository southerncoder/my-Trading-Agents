import type { Db } from '../db/pool.js'
import { addDays } from '../domain/calendar.js'
import { round } from '../domain/types.js'
import type { ServiceDeps } from '../routes/deps.js'
import { sourceResults } from '../services/results.js'

/** The Friday on or before a date (weekly reviews cover Saturday through Friday). */
export function weekEndingFor(date: string): string {
  let d = date
  while (new Date(`${d}T00:00:00Z`).getUTCDay() !== 5) d = addDays(d, -1)
  return d
}

/** Calls Ollama's chat API (local models and cloud models signed in through the local Ollama). */
export async function ollamaChat(baseUrl: string, model: string, system: string, user: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ model, stream: false, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], options: { num_ctx: 16384 } }),
    signal: AbortSignal.timeout(300_000),
  })
  if (!res.ok) throw new Error(`Ollama answered ${res.status}`)
  const body = (await res.json()) as { message?: { content?: string } }
  const text = body.message?.content?.trim()
  if (!text) throw new Error('Ollama returned an empty answer')
  return text
}

async function weekValue(db: Db, portfolioId: number, from: string, to: string) {
  const { rows } = await db.query<{ date: string; equity: number; spy_close: number | null }>(
    `(SELECT date, equity, spy_close FROM snapshots WHERE portfolio_id = $1 AND date < $2 ORDER BY date DESC LIMIT 1)
     UNION ALL (SELECT date, equity, spy_close FROM snapshots WHERE portfolio_id = $1 AND date <= $3 ORDER BY date DESC LIMIT 1)`,
    [portfolioId, from, to],
  )
  const [start, end] = rows.length === 2 ? rows : [undefined, rows[0]]
  return {
    weekReturnPct: start && end ? round((end.equity / start.equity - 1) * 100, 2) : null,
    spyWeekPct: start?.spy_close && end?.spy_close ? round((end.spy_close / start.spy_close - 1) * 100, 2) : null,
  }
}

/** Everything the review is written from: plain numbers, so the text can be checked against them. */
async function gatherWeek(db: Db, from: string, to: string) {
  const results = await sourceResults(db, to)
  const portfolios = await Promise.all(
    results.portfolios.map(async (p) => ({ name: p.name, kind: p.kind, equity: p.equity, totalReturnPct: p.returnPct, totalSpyReturnPct: p.spyReturnPct, ...(await weekValue(db, p.id, from, to)) })),
  )
  const trades = (await db.query(
    `SELECT p.name AS portfolio, t.traded_on, t.ticker, t.direction, t.action, t.quantity, t.price, t.realized_pnl FROM trades t JOIN portfolios p ON p.id = t.portfolio_id
     WHERE t.traded_on BETWEEN $1 AND $2 AND p.kind = 'owner' ORDER BY t.traded_on`, [from, to])).rows
  const shadowTrades = (await db.query(`SELECT count(*)::int n FROM trades t JOIN portfolios p ON p.id = t.portfolio_id WHERE t.traded_on BETWEEN $1 AND $2 AND p.kind = 'shadow'`, [from, to])).rows[0].n
  const alerts = (await db.query(
    `SELECT a.run_date, a.ticker, a.kind, a.message FROM alerts a JOIN portfolios p ON p.id = a.portfolio_id WHERE a.run_date BETWEEN $1 AND $2 AND p.kind = 'owner' ORDER BY a.severity, a.run_date LIMIT 15`,
    [from, to])).rows
  const picks = (await db.query(
    `SELECT source, label, count(*)::int n FROM candidates WHERE run_date BETWEEN $1 AND $2 GROUP BY source, label ORDER BY source, n DESC`, [from, to])).rows
  const closedThisWeek = results.positions.filter((p) => p.closed)
  const closes = (await db.query(`SELECT count(*)::int n FROM trades WHERE action = 'close' AND traded_on BETWEEN $1 AND $2`, [from, to])).rows[0].n
  // Counted here so the model only has to report them (it miscounted when left to count).
  const facts = {
    openPositions: Object.fromEntries(results.portfolios.map((p) => [p.name, p.openPositions])),
    waitingOrders: Object.fromEntries(results.portfolios.map((p) => [p.name, p.pendingOrders])),
    positionsClosedThisWeek: closes,
    picksThisWeek: picks.reduce((s: number, r: { n: number }) => s + r.n, 0),
  }
  return { facts, week: { from, to }, portfolios, trades, shadowTrades, alerts, picks, bySource: results.bySource, forwardTest: results.forwardTest, recentClosedShadowPositions: closedThisWeek.slice(-10) }
}

const SYSTEM = `You write the weekly review for a paper-trading learning project (no real money). The reader is a senior
software engineer who is new to markets. Write in plain English, short sentences, no hype. Use only the numbers
given; never invent prices or events. A null number is not known yet (for example there is no earlier
snapshot to compare with): say it is not known, never treat it as zero. Report the counts in "facts" exactly. Always compare results with SPY (the S&P 500 index fund) over the same days.
This is education, not financial advice; do not tell the reader to buy or sell anything.
Write Markdown with these sections:
## The week in brief (3-4 sentences)
## The system's picks (how each source did, and whether one week means anything yet)
## Your portfolio vs the shadow and SPY
## One lesson (one market idea this week illustrates, explained simply)
## What to watch next week (2-3 bullets)`

function numbersOnly(data: Awaited<ReturnType<typeof gatherWeek>>, reason: string): string {
  const lines = [`## Week ending ${data.week.to}`, '', `_The model could not be reached (${reason}), so this review shows the numbers only._`, '', '| Portfolio | Week | SPY week | Since start | SPY since start |', '|---|---|---|---|---|']
  const f = (n: number | null) => (n === null ? '-' : `${n > 0 ? '+' : ''}${n}%`)
  for (const p of data.portfolios) lines.push(`| ${p.name} | ${f(p.weekReturnPct)} | ${f(p.spyWeekPct)} | ${f(p.totalReturnPct)} | ${f(p.totalSpyReturnPct)} |`)
  lines.push('', `Trades you recorded: ${data.trades.length}. Shadow trades: ${data.shadowTrades}. Alerts: ${data.alerts.length}.`)
  if (data.bySource.length) {
    lines.push('', '| Source | Positions | Win rate | Avg return | Avg vs SPY |', '|---|---|---|---|---|')
    for (const s of data.bySource) lines.push(`| ${s.source} | ${s.positions} | ${s.winRatePct}% | ${f(s.avgReturnPct)} | ${f(s.avgExcessPct)} |`)
  }
  return lines.join('\n')
}

/** Writes (or rewrites) the review for the week ending on a Friday. */
export async function weeklyReview(deps: ServiceDeps, weekEnding: string) {
  const { pool } = deps
  const from = addDays(weekEnding, -6)
  const run = (await pool.query<{ id: number }>(`INSERT INTO runs (kind, run_date) VALUES ('weekly_review', $1) RETURNING id`, [weekEnding])).rows[0].id
  let data: Awaited<ReturnType<typeof gatherWeek>>
  try {
    data = await gatherWeek(pool, from, weekEnding)
  } catch (e) {
    await pool.query(`UPDATE runs SET status = 'failed', finished_at = now(), summary = $2 WHERE id = $1`, [run, JSON.stringify({ error: (e as Error).message })])
    throw e
  }
  const model = deps.reviewModel?.() ?? null
  let body: string
  let usedModel: string | null = null
  try {
    if (!model) throw new Error('no review model configured')
    const ask = deps.llm ?? ((m: string, s: string, u: string) => ollamaChat(deps.ollamaUrl ?? 'http://host.docker.internal:11434', m, s, u))
    body = await ask(model, SYSTEM, `Week ${from} to ${weekEnding}. The numbers (JSON):\n${JSON.stringify(data, null, 1)}\n\nReminder: compare everything with SPY.`)
    usedModel = model
  } catch (e) {
    body = numbersOnly(data, (e as Error).message)
  }
  const { rows } = await pool.query(
    `INSERT INTO reviews (week_ending, model, body_md, data) VALUES ($1,$2,$3,$4)
     ON CONFLICT (week_ending) DO UPDATE SET model = EXCLUDED.model, body_md = EXCLUDED.body_md, data = EXCLUDED.data, created_at = now() RETURNING *`,
    [weekEnding, usedModel, body, JSON.stringify(data)],
  )
  await pool.query(`UPDATE runs SET status = 'ok', finished_at = now(), summary = $2 WHERE id = $1`, [run, JSON.stringify({ model: usedModel })])
  return rows[0]
}
