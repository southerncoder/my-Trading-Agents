#!/usr/bin/env python3
import re
import subprocess
import sys

FORBIDDEN_PATTERNS = [
    # OpenAI-style secret (require longer length and ensure not part of a word)
    r"(?<![A-Za-z0-9_-])sk-[A-Za-z0-9_-]{24,}",
    # AWS access key id
    r"(?<![A-Za-z0-9_-])AKIA[0-9A-Z]{16,}",
    # GitHub personal token prefix
    r"(?<![A-Za-z0-9_-])ghp_[A-Za-z0-9_\-]{10,}",
    # PEM private key header
    r"-----BEGIN PRIVATE KEY-----",
]

COMPILED = re.compile("|".join(f"(?:{p})" for p in FORBIDDEN_PATTERNS))

# Paths to ignore (examples, docs, or intentionally placeholder files)
IGNORE_PATH_PREFIXES = (
    '.env.example',
    'docker/secrets/',
    'docs/',
    'README.md',
    '.kiro/',
)

IGNORE_LINE_KEYWORDS = (
    'your_',
    'REPLACED_',
    'placeholder',
    'example',
    '#',
)

# Extend ignores for tests, tools, and common placeholder keywords
IGNORE_PATH_PREFIXES = IGNORE_PATH_PREFIXES + (
    'services/trading-agents/tests/',
    'tools/',
    'services/zep_graphiti/',
)

# Ignore node_modules and nested package example files
IGNORE_PATH_PREFIXES = IGNORE_PATH_PREFIXES + (
    'node_modules/',
    'services/trading-agents/node_modules/',
)

# Also ignore our own scripts/hooks so the hook doesn't flag its own patterns
IGNORE_PATH_PREFIXES = IGNORE_PATH_PREFIXES + (
    'scripts/',
    'scripts/hooks/',
)

IGNORE_LINE_KEYWORDS = IGNORE_LINE_KEYWORDS + (
    'fake',
    'simulated',
    'sk-fake',
    'sk-development',
    'sk-test',
    'TEST',
    'test placeholder',
    'REDACTED',
)


def get_staged_files():
    # Allow pre-commit to pass files as arguments; if provided, use them
    if len(sys.argv) > 1:
        return [p for p in sys.argv[1:] if p]

    out = subprocess.run(["git", "diff", "--cached", "--name-only", "--diff-filter=ACM"], capture_output=True, text=True)
    if out.returncode != 0:
        print("[pre-commit] Failed to list staged files", file=sys.stderr)
        sys.exit(2)
    files = [x.strip() for x in out.stdout.splitlines() if x.strip()]
    return files


def file_blob_content(path):
    # Read file content from index (staged blob)
    out = subprocess.run(["git", "show", f":{path}"], capture_output=True)
    if out.returncode != 0:
        return None
    try:
        return out.stdout.decode('utf-8', errors='replace')
    except Exception:
        return out.stdout.decode('latin-1', errors='replace')


def main():
    files = get_staged_files()
    if not files:
        return 0

    failed = False
    for f in files:
        # skip ignored paths
        if any(f.startswith(p) for p in IGNORE_PATH_PREFIXES):
            continue
        try:
            # verify file exists in index
            ok = subprocess.run(["git", "ls-files", "--error-unmatch", "--", f], capture_output=True)
            if ok.returncode != 0:
                continue
        except Exception:
            continue

        content = file_blob_content(f)
        if not content:
            continue

        for i, line in enumerate(content.splitlines(), start=1):
            if COMPILED.search(line):
                # skip obvious placeholder lines
                if any(k in line for k in IGNORE_LINE_KEYWORDS):
                    continue
                if not failed:
                    print("[pre-commit] Forbidden token(s) found in staged files:")
                print(f"  {f}:{i}: {line}")
                failed = True

    if failed:
        print('\n[pre-commit] Commit aborted: remove or rotate secrets and retry.', file=sys.stderr)
        return 1

    return 0


if __name__ == '__main__':
    sys.exit(main())
