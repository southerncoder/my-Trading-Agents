# Security & Secret Scanning

Central reference for repository secret scanning and security automation.

## Layers
1. **Pre-Commit Hook**: Runs (as configured in `.pre-commit-config.yaml`) to catch obvious secrets locally.
2. **Gitleaks Workflow**: `.github/workflows/secret-scan.yml` executes Gitleaks with project config `.gitleaks.toml`.
3. **Heuristic Scan Script**: `tools/secret-scan.ps1` executed in the same workflow after Gitleaks with policy env vars.
4. **Workflow Runner Secret Scan**: `services/trading-agents/scripts/run-workflow-tests.ts` captures stdout/stderr and heuristically scans output.

## Policy Environment Variables (Heuristic Script)
| Variable | Default | Purpose |
|----------|---------|---------|
| `SECRET_SCAN_FAIL_ON_MATCH` | true | Fail process if matches exceed max |
| `SECRET_SCAN_MAX_MATCHES` | 0 | Allowable findings before failure |
| `SECRET_SCAN_VERBOSE` | false | Print policy debug info |

Example manual run:
```
$env:SECRET_SCAN_FAIL_ON_MATCH='true'
$env:SECRET_SCAN_MAX_MATCHES='0'
pwsh -File tools/secret-scan.ps1
```

## Workflow Runner Variables
| Variable | Default | Purpose |
|----------|---------|---------|
| `WORKFLOW_SECRET_SCAN` | true | Enable runner output scan |
| `WORKFLOW_SECRET_STRICT` | false | Stricter entropy heuristic |
| `WORKFLOW_SECRET_MAX_FINDINGS` | 2 | Allowed findings before failure |
| `WORKFLOW_FAIL_ON_SECRETS` | true | Fail suite on violation |
| `WORKFLOW_SECRET_ALLOWLIST` | (empty) | Comma-separated regex allowlist |

## Findings Handling
1. Treat any real credential as compromised; rotate immediately.
2. Remove accidental commits using documented history rewrite steps (see `tools/remove-secrets.md`).
3. Add only necessary, generic test placeholders (never realistic key shapes like `sk-live-...`).

## Adding New Patterns
- Extend the `$patterns` array in `tools/secret-scan.ps1`.
- Update `.gitleaks.toml` for high-fidelity signatures.
- Document rationale in PR description.

## Best Practices
- Use environment variables and Docker secrets exclusively for credentials.
- Keep example values generic (`<your_api_key>` or placeholder tokens) in docs.
- Avoid storing scan result artifacts in Git (ignored via `.gitignore`).

## Related Documents
- `GETTING-STARTED.md` (high-level onboarding; references this file)
- `SECURITY-AUDIT-2025-09-19.md` (snapshot point-in-time audit)
- `tools/secret-scan.ps1` (heuristic scanning implementation)

