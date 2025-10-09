#!/bin/sh
# Install repository git hooks (Unix / Git Bash)
set -e
echo "Installing git hooks..."
mkdir -p .git/hooks
cp scripts/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit || true
cp scripts/hooks/pre-commit.ps1 .git/hooks/pre-commit.ps1
echo "Installed hooks to .git/hooks"
echo "Done."
