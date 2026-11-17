"""Build the self-contained nightly brief page.

    python tools/build-brief-page.py <brief-data.json> <out.html> [<date>]

Reads the rows written by nightly-brief.ps1, drops fields the page does not use and
embeds the rest in tools/brief-template.html. The result is one HTML file with no
external data, ready to publish.
"""
import json
import pathlib
import sys

DROP = {'pm_raw', 'business', 'industry', 'market_cap_b', 'target', 'analyst'}


def main():
    src, dest = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
    date = sys.argv[3] if len(sys.argv) > 3 else src.parent.name
    rows = json.loads(src.read_text(encoding='utf-8-sig'))
    if isinstance(rows, dict):
        rows = [rows]
    rows = [{k: v for k, v in r.items() if k not in DROP and v not in (None, '')} for r in rows]
    for r in rows:  # PowerShell writes a one-item list as a bare string
        if isinstance(r.get('risks'), str):
            r['risks'] = [r['risks']]
    data = json.dumps({'date': date, 'rows': rows}, ensure_ascii=False).replace('</', '<\\/')
    template = pathlib.Path(__file__).with_name('brief-template.html').read_text(encoding='utf-8')
    dest.write_text(template.replace('__DATE__', date).replace('__DATA__', data), encoding='utf-8')
    print(f'Wrote {dest} ({len(rows)} stocks, {dest.stat().st_size // 1024} KB)')


if __name__ == '__main__':
    main()
