/** Plain-English meanings of the words this site uses, each with where it shows up. Linked from the charts. */

export interface Entry {
  id: string
  term: string
  short: string
  long: string
  example?: string
  seeAlso?: string[]
}

export const GLOSSARY: Entry[] = [
  {
    id: 'call',
    term: 'Call',
    short: 'What the nightly analysis says to do with a stock tonight.',
    long: 'Each night every stock gets one call: Buy now, Buy if price reaches trigger, Wait, Keep, Trim or Exit. It comes from the final step of the pipeline (the portfolio manager) after the analysts, the bull and bear debate, the trader and the risk team have had their say.',
    seeAlso: ['trigger', 'walk-away', 'confidence'],
  },
  {
    id: 'trigger',
    term: 'Trigger',
    short: 'The price a "Buy if price reaches trigger" call waits for before buying.',
    long: 'A trigger below the price is a pullback: wait for a dip to buy cheaper. A trigger above the price is a breakout: wait for the price to prove itself by climbing through a level. If the price never reaches it in time, the order expires and nothing is bought.',
    example: 'KO at $97 with a trigger of $94.60 buys only if KO falls to $94.60.',
    seeAlso: ['walk-away', 'atr'],
  },
  {
    id: 'walk-away',
    term: 'Walk-away price',
    short: 'The price at which the idea is dropped.',
    long: 'If the price falls to the walk-away before the trigger is reached, the waiting order is cancelled; after buying, it works like a stop-loss. The gap between the entry and the walk-away is the "room" a trade has before it is wrong.',
    seeAlso: ['trigger', 'stop'],
  },
  {
    id: 'stop',
    term: 'Stop and target',
    short: 'The prices that close a position at a loss (stop) or take the profit (target).',
    long: 'Every position in the shadow and your own portfolios has an exit plan: sell if the price falls to the stop, sell if it rises to the target, and review after a number of trading days.',
    seeAlso: ['walk-away'],
  },
  {
    id: 'atr',
    term: 'Typical day (ATR)',
    short: 'How far the stock usually moves in one day, in dollars.',
    long: 'The average true range over the last 14 days. Dividing a distance by it turns dollars into "typical days": a trigger 0.5 typical days away could fire on an ordinary day; one 4 typical days away needs a real move.',
    example: 'A $2 ATR and a trigger $1 away: half a typical day.',
    seeAlso: ['trigger'],
  },
  {
    id: 'vs-spy',
    term: 'Against SPY (excess return)',
    short: 'A stock\'s return minus SPY\'s return over the same days.',
    long: 'SPY is a fund that holds the S&P 500, so it stands for "the market". Comparing with it over the same days removes the market\'s own move: if everything fell 3% and the stock fell 1%, the call did 2% better than the market even though it lost money.',
    example: 'Stock +1.5%, SPY +2.0% over the same days: -0.5% against SPY.',
    seeAlso: ['horizon'],
  },
  {
    id: 'horizon',
    term: 'Horizon',
    short: 'How many trading days after the call a result is measured.',
    long: 'The scorecard measures every call after 1, 3 and 5 trading days. Longer horizons say more about the call and less about one day\'s noise, but take longer to arrive, so they rest on fewer calls at first.',
    seeAlso: ['vs-spy', 'sample'],
  },
  {
    id: 'confidence',
    term: 'Confidence',
    short: 'How sure the model said it was, from 0 to 100%.',
    long: 'The number is the model\'s own statement, not a measured probability. It is "calibrated" only once surer calls are shown to do better; the scorecard\'s confidence chart is where that is checked. Until then, read it as a ranking at most.',
    seeAlso: ['sample'],
  },
  {
    id: 'sample',
    term: 'Sample size',
    short: 'How many results a number rests on.',
    long: 'An average of three calls can swing wildly on one surprise; an average of a hundred barely moves. Faded bars on this site mark numbers that rest on too few results (under 10 calls, or under 3 per stock) to lean on.',
    seeAlso: ['horizon'],
  },
  {
    id: 'drawdown',
    term: 'Drawdown',
    short: 'The drop from a portfolio\'s highest value to a later low.',
    long: 'The worst drop from a peak measures how painful a strategy is to hold, which matters as much as where it ends up. Two portfolios with the same return can have very different drawdowns.',
  },
  {
    id: 'shadow',
    term: 'Shadow portfolio',
    short: 'A paper portfolio that takes every pick by itself, at the same size.',
    long: 'It buys each tradeable pick from the nightly sources ($2,000 each) and exits by fixed rules, so it shows what the system would do with no human choices. Your own portfolios are compared with it, and the results by source are measured on it.',
    seeAlso: ['baseline'],
  },
  {
    id: 'baseline',
    term: 'Baseline portfolio',
    short: 'A paper portfolio that follows every call literally, one share at a time.',
    long: 'A buy call buys one share (now, or at the trigger), an Exit call sells the whole position and a Trim call sells one share. It has no stops or targets, so its trades show exactly what obeying the calls did.',
    seeAlso: ['shadow'],
  },
  {
    id: 'backtest',
    term: 'Backtest',
    short: 'Replaying past calls on real past prices with fixed rules.',
    long: 'It answers "what if I had followed the calls?" without risking money. Its traps: a short history can fit one market mood, rules chosen after seeing results flatter themselves, and fees and slippage are left out here.',
    seeAlso: ['sample'],
  },
  {
    id: 'pipeline',
    term: 'The analysis pipeline',
    short: 'The steps every nightly analysis runs through.',
    long: 'Four analysts (market and technicals, news, social sentiment, fundamentals from SEC filings) write reports; a bull and a bear researcher argue; a research manager decides; a trader turns it into a plan; three risk analysts (risky, safe, neutral) challenge it; the portfolio manager makes the final call. The Professor then explains it in plain English.',
    seeAlso: ['call'],
  },
]

export const ENTRY = Object.fromEntries(GLOSSARY.map((e) => [e.id, e])) as Record<string, Entry>

/**
 * The Professor's first question depends on the call: why buy now, why wait for the trigger, why sell, or
 * why do nothing yet. (The stored key stays why_not_before_flag for every call.)
 */
export function timingTitle(label: string | null | undefined): string {
  const l = (label ?? '').toLowerCase()
  if (/trigger/.test(l)) return 'Why wait for the trigger?'
  if (/exit|trim|sell|reduce/.test(l)) return 'Why sell now?'
  if (/buy now|short \(/.test(l)) return 'Why act now?'
  return 'Why not act yet?'
}
