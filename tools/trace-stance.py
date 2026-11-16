"""Trace where "wait for a trigger" enters the pipeline.

    python tools/trace-stance.py <eval-run-dir> [<eval-run-dir> ...] [--csv out.csv]

For every run log it classifies the stance of each stage:
  market  - the Market Analyst's conclusion
  rm      - the Research Manager's "Investment Recommendation"
  trader  - the Trader's "Trade Recommendation" (+ entry plan)
  pm      - the Portfolio Manager's action_now
as one of:
  now   - act at the current price (buy/sell/short now)
  wait  - act only after a price trigger (pullback, breakout, confirmation)
  none  - hold / no trade wanted
  ?     - could not tell
It also pulls the Trader's nearest entry level and reports how far it is from the
current price (entry gap %). The summary shows, per stage, the share of runs that
say "wait", and the stage where "wait" first appears. Text heuristics, so treat the
numbers as a trend indicator; compare the same script's output before and after a
prompt change. Runs made after 2026-11-16 carry an explicit ENTRY STANCE line per
stage, which is read first and is reliable; older logs fall back to text heuristics.
"""
import csv
import importlib.util
import pathlib
import re
import statistics
import sys

_spec = importlib.util.spec_from_file_location('extract_pipeline', pathlib.Path(__file__).with_name('extract-pipeline.py'))
_ep = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_ep)

WAIT = re.compile(
    r'wait|trigger|pullback|pull-back|on support|support entry|on (a )?dip|confirmation|confirmed (daily )?close|'
    r'breakout|do not chase|don.t chase|no new entry|no entry|not? (yet|at current)|limit orders? (at|\$|only)|'
    r'only (on|if|after|above|below)|stand aside|patience|before (adding|entering|buying)|conditional|staged|tranche|'
    r'on dips|accumulat\w+ (on|near|in)|\byet\b|avoid (chasing|initiating|adding)|await|at current price', re.I)
NOW = re.compile(r'\b(buy now|enter now|initiate (a )?(long|position) (now|at market)|at market|market order|immediate(ly)? (entry|buy))\b', re.I)
DIRECTION = re.compile(r'\b(STRONG BUY|STRONG SELL|BUY|SELL|SHORT|ACCUMULATE)\b')
HOLD = re.compile(r'\b(HOLD|NEUTRAL|AVOID|NO TRADE)\b')
PRICE = re.compile(r'\$\s?(\d{1,5}(?:,\d{3})*(?:\.\d+)?)')


def section(text, heading_pattern, max_chars=900):
    """Text under the first markdown heading matching heading_pattern, up to the next heading."""
    m = re.search(r'^#{2,4}\s*[^\n]*(' + heading_pattern + r')[^\n]*\n', text or '', re.I | re.M)
    if not m:
        return ''
    rest = text[m.end():]
    nxt = re.search(r'^#{2,4}\s', rest, re.M)
    return (rest[:nxt.start()] if nxt else rest)[:max_chars]


def classify(text):
    if not text.strip():
        return '?'
    has_dir = bool(DIRECTION.search(text))
    if has_dir and HOLD.search(text):
        return 'wait'  # "HOLD / BUY on ...": a buy that is not for today
    if WAIT.search(text):
        return 'wait' if has_dir or re.search(r'buy|entry|enter|add', text, re.I) else 'none'
    if has_dir or NOW.search(text):
        return 'now'
    if HOLD.search(text):
        return 'none'
    return '?'


STATED = re.compile(r'ENTRY STANCE:\W*(NOW|WAIT|NONE)', re.I)


def stance(full_text, *sections):
    """The stage's own ENTRY STANCE line when it wrote one (reliable); otherwise the text heuristic."""
    found = STATED.findall(full_text or '')
    if found:
        return found[-1].lower()
    return first_clear(*sections)


def first_clear(*texts):
    """Stance of the first section that gives a clear answer (the headline section wins over its details)."""
    for t in texts:
        c = classify(t)
        if c != '?':
            return c
    return '?'


def current_price(market):
    m = re.search(r'(?:current|last)\s+price[^$\n]{0,40}\$\s?(\d[\d,]*\.?\d*)', market or '', re.I)
    return float(m.group(1).replace(',', '')) if m else None


def entry_gap(trader, price):
    """Nearest price in the Trader's entry section vs the current price, in percent (signed)."""
    if not price:
        return None
    ent = section(trader, r'Entry', 1200)
    levels = [float(x.replace(',', '')) for x in PRICE.findall(ent)]
    levels = [x for x in levels if 0.5 * price < x < 1.5 * price and abs(x - price) / price > 0.0005]
    if not levels:
        return None
    nearest = min(levels, key=lambda x: abs(x - price))
    return round((nearest - price) / price * 100, 2)


def trace(path):
    d = _ep.extract(path)
    if not d:
        return None
    pm_json = d.get('pm_json') if isinstance(d.get('pm_json'), dict) else {}
    action = str(pm_json.get('action_now', '')).lower()
    pm = {'enter_now': 'now', 'wait_for_trigger': 'wait', 'hold_existing': 'none', 'reduce': 'now', 'exit': 'now'}.get(action, '?')
    trader = d.get('trader', '')
    price = current_price(d.get('market', ''))
    return {
        'ticker': pathlib.Path(path).name.rsplit('-', 1)[0],
        'run': pathlib.Path(path).stem.rsplit('-', 1)[-1],
        'market': stance(d.get('market', ''), section(d.get('market', ''), r'Conclusion'), section(d.get('market', ''), r'Market Timing')),
        'rm': stance(d.get('research_manager', ''), section(d.get('research_manager', ''), r'Investment Recommendation'), section(d.get('research_manager', ''), r'Action Plan', 400)),
        'trader': stance(trader, section(trader, r'Trade Recommendation'), section(trader, r'Entry', 500)),
        'trigger_price': pm_json.get('trigger_price') if isinstance(pm_json.get('trigger_price'), (int, float)) else None,
        'price': price,
        'stated': sum(bool(STATED.search(d.get(k, '') or '')) for k in ('market', 'research_manager', 'trader')),
        'pm': pm,
        'pm_decision': str(pm_json.get('decision', '')),
        'entry_gap_pct': entry_gap(trader, price),
    }


def main():
    args = sys.argv[1:]
    out_csv = None
    out_json = None
    if '--json' in args:
        i = args.index('--json')
        out_json = args[i + 1]
        del args[i:i + 2]
    if '--csv' in args:
        i = args.index('--csv')
        out_csv = args[i + 1]
        del args[i:i + 2]
    rows = []
    for run_dir in args:
        for f in sorted(pathlib.Path(run_dir).glob('*.log')):
            r = trace(f)
            if r:
                r['run_dir'] = pathlib.Path(run_dir).name
                rows.append(r)
    if not rows:
        print('No parsable logs.')
        return
    stages = ['market', 'rm', 'trader', 'pm']
    print(f"{'ticker':7}{'run':4}" + ''.join(f'{s:8}' for s in stages) + 'entry gap %')
    for r in rows:
        gap = '' if r['entry_gap_pct'] is None else f"{r['entry_gap_pct']:+.2f}"
        print(f"{r['ticker']:7}{r['run']:4}" + ''.join(f'{r[s]:8}' for s in stages) + gap)
    n = len(rows)
    print(f'\n=== Share of runs saying "wait", by stage (n={n}) ===')
    for s in stages:
        print(f"  {s:8}{sum(r[s] == 'wait' for r in rows) / n:6.0%}")
    first = {}
    for r in rows:
        f = next((s for s in stages if r[s] == 'wait'), 'never')
        first[f] = first.get(f, 0) + 1
    print('=== Stage where "wait" first appears ===')
    for s in stages + ['never']:
        if s in first:
            print(f'  {s:8}{first[s]:3}')
    gaps = [r['entry_gap_pct'] for r in rows if r['entry_gap_pct'] is not None]
    if gaps:
        below = [g for g in gaps if g < 0]
        print(f"=== Trader's nearest entry level vs current price (n={len(gaps)}) ===")
        print(f"  median gap {statistics.median(gaps):+.2f}%   below price: {len(below)}/{len(gaps)}   median |gap| {statistics.median([abs(g) for g in gaps]):.2f}%")
    stated = sum(r['stated'] for r in rows)
    print(f'Stance lines stated by the stages themselves: {stated}/{3 * n} (the rest are text heuristics, less reliable)')
    if out_json:
        import json
        pathlib.Path(out_json).write_text(json.dumps(rows), encoding='utf-8')
    if out_csv:
        with open(out_csv, 'w', newline='', encoding='utf-8') as fh:
            w = csv.DictWriter(fh, fieldnames=['run_dir', 'ticker', 'run'] + stages + ['pm_decision', 'entry_gap_pct', 'trigger_price', 'price', 'stated'])
            w.writeheader()
            w.writerows(rows)
        print(f'Wrote {out_csv}')


if __name__ == '__main__':
    main()
