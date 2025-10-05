# Git Hooks Documentation

## Overview

The TradingAgents repository uses Git hooks to enforce security best practices and prevent accidental exposure of secrets. These hooks run automatically before commits and can be bypassed only with explicit override (not recommended).

## Installed Hooks

### 1. Pre-commit Hook
**Location:** `.git/hooks/pre-commit` (Bash) and `.git/hooks/pre-commit.ps1` (PowerShell)

**Purpose:** Performs comprehensive security checks before allowing commits.

**Checks Performed:**
1. **Environment Files** - Prevents committing `.env`, `.env.local`, etc.
2. **Docker Secrets** - Blocks `docker/secrets/*.txt` files
3. **API Key Scanning** - Detects hardcoded secrets using regex patterns
4. **File Size Check** - Warns about files >5MB
5. **Linting** - Runs ESLint on TypeScript/JavaScript files
6. **Gitignore Verification** - Runs `scripts/verify-gitignore.ps1`
7. **Certificate Files** - Prevents committing `.key`, `.pem`, `.crt`, etc.

**Secret Patterns Detected:**
- OpenAI API keys (`sk-*`, `sk-proj-*`)
- AWS Access Keys (`AKIA*`)
- Google API Keys (`AIza*`)
- Slack Tokens (`xoxb-*`)
- GitHub Tokens (`ghp_*`, `gho_*`)
- Generic hex strings (potential secrets)

### 2. Commit-msg Hook
**Location:** `.git/hooks/commit-msg`

**Purpose:** Prevents secrets in commit messages.

**Checks Performed:**
- Scans commit message for API keys and tokens
- Warns about TODO/FIXME comments containing "password"

## Usage

### Normal Operation
Hooks run automatically when you commit:

```bash
git add .
git commit -m "Your commit message"
# Hooks run automatically here
```

### Testing Hooks Manually

**Test pre-commit hook:**
```powershell
# PowerShell (Windows)
.\.git\hooks\pre-commit.ps1

# Bash (Unix/Git Bash)
./.git/hooks/pre-commit
```

**Test commit-msg hook:**
```bash
echo "test commit message" > .git/COMMIT_EDITMSG
./.git/hooks/commit-msg .git/COMMIT_EDITMSG
```

### Bypassing Hooks (Not Recommended)

If you absolutely must bypass the hooks:

```bash
# Bypass all hooks for a single commit
git commit --no-verify -m "Your message"

# Or use the shorthand
git commit -n -m "Your message"
```

**⚠️ WARNING:** Bypassing hooks can expose secrets. Only use in emergency situations and double-check your commits.

## Hook Behavior

### Success (Exit Code 0)
When all checks pass:
```
==================================
Pre-commit Security Checks
==================================

1. Checking for .env files...
  [PASS] No .env files

2. Checking for Docker secrets...
  [PASS] No secret files

3. Scanning for potential secrets...
  [PASS] No secrets detected

...

==================================
Summary: 7/7 checks passed
==================================
SUCCESS: All security checks passed!
```

### Failure (Exit Code 1)
When issues are detected:
```
1. Checking for .env files...
  [FAIL] .env files detected in commit!
    - .env.local
  These files should not be committed. Use: git reset HEAD <file>

...

==================================
Summary: 5/7 checks passed
==================================
FAILED: Security issues detected!
Fix the issues above before committing.
```

## Troubleshooting

### Hook Not Running

**Problem:** Hook doesn't execute when committing.

**Solution:**
```powershell
# Check if hook file exists
Test-Path .git/hooks/pre-commit

# Make hook executable (Unix only)
chmod +x .git/hooks/pre-commit

# Check execution policy (Windows)
Get-ExecutionPolicy
```

### Permission Errors

**Problem:** "Cannot run script" or permission denied.

**Solution (Windows):**
```powershell
# Set execution policy for current session
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Or permanently for current user
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

**Solution (Unix):**
```bash
chmod +x .git/hooks/pre-commit
chmod +x .git/hooks/commit-msg
```

### False Positives

**Problem:** Hook detects non-secret as a secret.

**Solution:**
1. Review the detected pattern
2. If legitimate, consider updating the pattern in `.git/hooks/pre-commit.ps1`
3. Use environment variables instead of hardcoded values
4. If absolutely necessary, use `--no-verify` (with caution)

### Linting Failures

**Problem:** ESLint errors prevent commit.

**Solution:**
```bash
# Auto-fix linting issues
cd services/trading-agents
npm run lint:fix

# Check what issues remain
npm run lint

# Stage fixed files
git add .
git commit -m "Your message"
```

### Slow Hook Execution

**Problem:** Pre-commit takes too long.

**Solution:**
- Commit smaller changesets
- Skip linting for non-code commits (add `[skip lint]` to message)
- Consider adjusting timeout values in hook scripts

## Maintenance

### Updating Hooks

To update hooks after pulling changes:

```bash
# Hooks are in .git/hooks/ (not tracked by git)
# If project provides new hooks in scripts/hooks/:

# Copy updated hooks
cp scripts/hooks/pre-commit .git/hooks/
cp scripts/hooks/commit-msg .git/hooks/

# Make executable (Unix)
chmod +x .git/hooks/*
```

### Adding Custom Checks

To add your own security checks:

1. Edit `.git/hooks/pre-commit.ps1` (Windows) or `.git/hooks/pre-commit` (Unix)
2. Add your check following the existing pattern:

```powershell
# PowerShell example
Write-Host "`n8. Checking custom rule..." -ForegroundColor Yellow

# Your check logic here
if ($condition) {
    Write-Host "  [FAIL] Custom check failed!" -ForegroundColor Red
    $exitCode = 1
} else {
    Write-Host "  [PASS] Custom check passed" -ForegroundColor Green
    $checksPassed++
}
```

### Disabling Specific Checks

To temporarily disable a check, comment it out:

```powershell
# Comment out the check
# Write-Host "`n3. Scanning for potential secrets..." -ForegroundColor Yellow
# ... rest of check code ...
```

## Integration with CI/CD

These hooks complement (not replace) CI/CD security scanning:

**GitHub Actions Example:**
```yaml
name: Security Scan
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Gitignore Verification
        run: |
          pwsh -File scripts/verify-gitignore.ps1
      
      - name: Run Gitleaks (if installed)
        if: success()
        run: |
          gitleaks detect --verbose --redact
```

## Best Practices

1. **Never Bypass Hooks** without review
2. **Test Changes** before committing large sets
3. **Keep Hooks Updated** with project requirements
4. **Document Custom Changes** to hooks
5. **Use Environment Variables** instead of hardcoding secrets
6. **Review Hook Output** to understand what's being checked
7. **Report False Positives** to improve detection accuracy

## Additional Security Tools

While hooks provide pre-commit protection, also consider:

1. **Gitleaks** - Install for enhanced secret scanning
   ```bash
   choco install gitleaks  # Windows
   brew install gitleaks   # macOS
   ```

2. **Pre-commit Framework** - For multi-language hook management
   ```bash
   pip install pre-commit
   pre-commit install
   ```

3. **GitHub Secret Scanning** - Enable in repository settings

4. **Branch Protection Rules** - Require status checks before merge

## Support

If you encounter issues with hooks:

1. Check this documentation
2. Review hook output for specific errors
3. Test hooks manually to isolate issues
4. Check `.git/hooks/` file permissions
5. Consult team lead if problems persist

---

**Last Updated:** October 4, 2025  
**Hook Version:** 1.0.0  
**Maintained By:** TradingAgents Security Team
