#!/usr/bin/env bash
# Verify env secret files are not tracked by Git.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

FAIL=0

echo "Checking Git-tracked env files..."

TRACKED="$(git ls-files '.env' '.env.local' '.env.*.local' 2>/dev/null || true)"
if [[ -n "$TRACKED" ]]; then
  echo "FAIL: Sensitive env files are still tracked by Git:"
  echo "$TRACKED"
  echo
  echo "Fix with:"
  echo "  git rm --cached .env .env.local"
  echo "  git commit -m \"Stop tracking local env files\""
  FAIL=1
else
  echo "OK: No .env or .env.local files tracked."
fi

if git ls-files --error-unmatch .env.example >/dev/null 2>&1; then
  echo "OK: .env.example is tracked (template only)."
else
  echo "WARN: .env.example is not tracked — contributors need the template."
fi

if [[ -f .env ]] && grep -qE '=(sk_|pk_|secret|postgresql://|AIza)' .env 2>/dev/null; then
  echo "WARN: .env on disk may contain real secrets — ensure it stays git-ignored."
fi

if [[ -f .env.local ]] && grep -qE '=(sk_|pk_|secret|postgresql://|AIza)' .env.local 2>/dev/null; then
  echo "WARN: .env.local on disk may contain real secrets — ensure it stays git-ignored."
fi

if [[ "$FAIL" -ne 0 ]]; then
  exit 1
fi

echo "Secret hygiene check passed."
