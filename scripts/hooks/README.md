# Local Hooks

This directory contains the project's example pre-commit hooks. To install them into your local repo hooks directory:

Windows (PowerShell):

```powershell
Copy-Item -Path .\scripts\hooks\pre-commit.ps1 -Destination .git\hooks\pre-commit.ps1 -Force
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Unix (Bash):

```sh
cp scripts/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

These hooks perform a quick staged-file scan for the string `PersonalDev` and fail the commit if it is found. They are intentionally minimal; for stronger protection use gitleaks/detect-secrets in CI or a pre-commit framework.
