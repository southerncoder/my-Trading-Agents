# Instructions to install and run gitleaks locally (PowerShell)
Write-Output "gitleaks is not installed in this environment. To run locally, follow these steps:"
Write-Output "1) Install gitleaks:"
Write-Output "   Scoop:      scoop install gitleaks"
Write-Output "   or Chocolatey: choco install gitleaks"
Write-Output "   or Homebrew (mac): brew install gitleaks/tap/gitleaks"
Write-Output "   or download a release from: https://github.com/zricethezav/gitleaks/releases"
Write-Output "2) Run gitleaks across repository:"
Write-Output "   gitleaks detect --source . --report-format=json --report-path=./gitleaks-report.json"
Write-Output "3) Review gitleaks-report.json and share it here if you want me to help interpret results."
exit 0
