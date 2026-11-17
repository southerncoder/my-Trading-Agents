#!/usr/bin/env python3
"""Pull every stage's full text (analysts, debate, trader, risk panel, PM) out of eval logs.

Usage: python tools/extract-pipeline.py <eval-run-dir> <out.json>
Reads <TICKER>-<n>.log files and writes {ticker: {stage: text, ...}}.
"""
import json
import pathlib
import re
import sys

ANSI = re.compile(r'\x1b\[[0-9;]*m')
RULE = re.compile(r'^[═─�\-= \t]+$')
STAGES = {
    'Market Analyst:': 'market',
    'Social Analyst:': 'social',
    'News Analyst:': 'news',
    'Fundamentals Analyst:': 'fundamentals',
    'Bull Researcher:': 'bull',
    'Bear Researcher:': 'bear',
    'Research Manager:': 'research_manager',
    'Aggressive Analyst:': 'aggressive',
    'Conservative Analyst:': 'conservative',
    'Neutral Analyst:': 'neutral',
}
ROMAN = {
    'III. TRADING TEAM PLAN': 'trader',
    'V. PORTFOLIO MANAGER DECISION': 'pm',
}
IGNORED_HEADS = ('I. ANALYST TEAM REPORTS', 'II. RESEARCH TEAM DECISION', 'IV. RISK MANAGEMENT TEAM DECISION')


def fix_mojibake(s):
    """Docker output went through a CP437 console, so UTF-8 punctuation arrives garbled. Undo that."""
    out = bytearray()
    for ch in s:
        try:
            out += ch.encode('cp437')
        except UnicodeEncodeError:
            out += ch.encode('utf-8')
    return out.decode('utf-8', errors='replace')


def read(path):
    raw = pathlib.Path(path).read_bytes()
    if raw[:2] in (b'\xff\xfe', b'\xfe\xff'):
        return raw.decode('utf-16', errors='replace')
    return fix_mojibake(raw.decode('utf-8', errors='replace'))


def extract(path):
    lines = ANSI.sub('', read(path)).splitlines()
    start = next((i for i, l in enumerate(lines) if l.startswith('I. ANALYST TEAM REPORTS')), None)
    if start is None:
        return {}
    out, key, buf = {}, None, []

    def flush():
        if key:
            out[key] = '\n'.join(buf).strip()

    for l in lines[start:]:
        s = l.strip()
        if 'Final trading decision' in s:
            break
        if s in IGNORED_HEADS:
            flush(); key, buf = None, []
            continue
        if s in ROMAN:
            flush(); key, buf = ROMAN[s], []
            continue
        if s in STAGES:
            flush(); key, buf = STAGES[s], []
            continue
        if RULE.match(l) and s:
            continue
        if key:
            buf.append(l.rstrip())
    flush()
    pm = out.get('pm', '')
    m = None
    for m in re.finditer(r'\{[^{}]*"decision"[^{}]*\}', pm):
        pass
    if m:
        try:
            out['pm_json'] = json.loads(re.sub(r'\\(?!["\\/bfnrtu])', '', m.group(0)))
        except Exception:
            pass
    return out


def main():
    run, dest = pathlib.Path(sys.argv[1]), sys.argv[2]
    res = {}
    for f in sorted(run.glob('*-1.log')):
        res[f.name.split('-')[0]] = extract(f)
    pathlib.Path(dest).write_text(json.dumps(res, ensure_ascii=False), encoding='utf-8')
    for t, d in res.items():
        print(t, {k: len(v) if isinstance(v, str) else 'json' for k, v in d.items()})


if __name__ == '__main__':
    main()
