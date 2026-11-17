"""Write one night's brief data for the viewer page.

    python tools/build-brief-page.py <brief-data.json> [<date>]

The page itself is written once: tools/brief-viewer.html is copied to logs/nightly/latest.html
only when its code changed. Each night only adds data next to it:

    logs/nightly/<date>/brief-data.js   window.BRIEF = {...}   (the calls, prices, transcripts)
    logs/nightly/nights.js              window.NIGHTS = [...]  (every night with data, newest first)

Data is a .js file, not .json, because browsers refuse to let a page opened from disk read
JSON files but do load scripts, so latest.html works by double-clicking it.
"""
import json
import pathlib
import shutil
import sys

DROP = {'pm_raw', 'business', 'industry', 'market_cap_b', 'target', 'analyst'}


def night_data(src, date):
    rows = json.loads(src.read_text(encoding='utf-8-sig'))
    if isinstance(rows, dict):
        rows = [rows]
    rows = [{k: v for k, v in r.items() if k not in DROP and v not in (None, '')} for r in rows]
    # The full transcript (every stage's report) and each stage's buy-now-or-wait stance, if saved.
    pipe_path, stance_path = src.parent / 'pipeline.json', src.parent / 'stance.json'
    pipeline = json.loads(pipe_path.read_text(encoding='utf-8')) if pipe_path.exists() else {}
    stances = {s['ticker']: s for s in json.loads(stance_path.read_text(encoding='utf-8'))} if stance_path.exists() else {}
    for r in rows:
        if isinstance(r.get('risks'), str):  # PowerShell writes a one-item list as a bare string
            r['risks'] = [r['risks']]
        p = pipeline.get(r.get('ticker'))
        if p:
            r['pipeline'] = {k: v for k, v in p.items() if isinstance(v, str) and v.strip()}
        s = stances.get(r.get('ticker'))
        if s:
            r['stance'] = {k: s.get(k) for k in ('market', 'rm', 'trader', 'pm')}
    return {'date': date, 'rows': rows}


def main():
    src = pathlib.Path(sys.argv[1])
    date = sys.argv[2] if len(sys.argv) > 2 else src.parent.name
    nightly = src.parent.parent

    data = night_data(src, date)
    out = src.parent / 'brief-data.js'
    out.write_text('window.BRIEF = ' + json.dumps(data, ensure_ascii=False) + ';\n', encoding='utf-8')

    nights = sorted((p.parent.name for p in nightly.glob('*/brief-data.js')), reverse=True)
    (nightly / 'nights.js').write_text('window.NIGHTS = ' + json.dumps(nights) + ';\n', encoding='utf-8')

    viewer, page = pathlib.Path(__file__).with_name('brief-viewer.html'), nightly / 'latest.html'
    if not page.exists() or page.read_bytes() != viewer.read_bytes():
        shutil.copyfile(viewer, page)
        print(f'Viewer updated: {page}')
    print(f'Wrote {out} ({len(data["rows"])} stocks, {out.stat().st_size // 1024} KB); nights on file: {len(nights)}')


if __name__ == '__main__':
    main()
