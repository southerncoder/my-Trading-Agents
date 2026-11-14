#!/usr/bin/env node
/*
 TypeScript pre-commit hook to scan staged files for secret-like patterns.
 Runs without /bin/sh and without Python virtualenvs.
*/

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

type Pattern = { name: string; regex: RegExp };

const FORBIDDEN_PATTERNS: Pattern[] = [
  { name: 'OpenAI-style key', regex: /(?<![A-Za-z0-9_-])sk-[A-Za-z0-9_-]{20,}/ },
  { name: 'AWS Access Key ID', regex: /(?<![A-Z0-9])AKIA[0-9A-Z]{16}(?![A-Z0-9])/ },
  { name: 'GitHub token', regex: /(?<![A-Za-z0-9])gh[pousr]_[A-Za-z0-9]{20,}/ },
  { name: 'Private key block', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
];

const IGNORE_PATH_PREFIXES = [
  'docs/',
  'node_modules/',
  'tools/',
  'scripts/', // allow scripts themselves
  'docker/secrets/',
  'services/', // tests/docs below are ignored by keyword rules too
  '.kiro/',
  '.github/',
];

const EXPLICIT_IGNORE_FILES = new Set<string>([
  '.env.example',
  '.env.monitoring.example',
]);

const IGNORE_LINE_KEYWORDS = [
  'your_',
  'REPLACED_',
  'fake',
  'simulated',
  'placeholder',
  'example',
  'sk-fake',
];

function isIgnoredPath(path: string): boolean {
  const p = path.replace(/\\/g, '/');
  if (EXPLICIT_IGNORE_FILES.has(p) || EXPLICIT_IGNORE_FILES.has(p.split('/').pop() || '')) return true;
  return IGNORE_PATH_PREFIXES.some(prefix => p.startsWith(prefix));
}

function getStagedFiles(args: string[]): string[] {
  if (args && args.length > 0) return args;
  const res = spawnSync('git', ['diff', '--cached', '--name-only'], { encoding: 'utf-8' });
  if (res.status !== 0) return [];
  return res.stdout.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

function readStagedBlob(path: string): string {
  const res = spawnSync('git', ['show', `:${path}`], { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
  if (res.status !== 0) return '';
  return res.stdout || '';
}

function likelyBinary(content: string): boolean {
  // Simple heuristic: presence of many NULs or very high non-text ratio
  const N = Math.min(content.length, 2048);
  let nonText = 0;
  for (let i = 0; i < N; i++) {
    const c = content.charCodeAt(i);
    if (c === 0) return true;
    if ((c < 9) || (c > 13 && c < 32)) nonText++;
  }
  return nonText > N * 0.3;
}

function lineLooksPlaceholder(line: string): boolean {
  const lower = line.toLowerCase();
  return IGNORE_LINE_KEYWORDS.some(k => lower.includes(k));
}

function main() {
  const args = process.argv.slice(2);
  const files = getStagedFiles(args);

  if (files.length === 0) {
    process.exit(0);
  }

  const findings: { file: string; name: string; match: string }[] = [];

  for (const f of files) {
    if (isIgnoredPath(f)) continue;
    try {
      // Skip large files quickly
      const stat = fs.existsSync(f) ? fs.statSync(f) : undefined;
      if (stat && stat.size > 2 * 1024 * 1024) continue;

      const content = readStagedBlob(f);
      if (!content || likelyBinary(content)) continue;

      const lines = content.split(/\r?\n/);
      for (const pattern of FORBIDDEN_PATTERNS) {
        for (const line of lines) {
          if (lineLooksPlaceholder(line)) continue;
          const m = line.match(pattern.regex);
          if (m) {
            findings.push({ file: f, name: pattern.name, match: m[0].slice(0, 8) + '…' });
            break; // one finding per pattern per file is enough
          }
        }
      }
    } catch {
      // Ignore read errors silently for hook robustness
    }
  }

  if (findings.length > 0) {
    console.error('Pre-commit security checks failed. Potential secrets found:');
    for (const f of findings) {
      console.error(` - ${f.file} (${f.name}) e.g., ${f.match}`);
    }
    process.exit(1);
  }

  process.exit(0);
}

main();
