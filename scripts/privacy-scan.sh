#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"
tracked_files="$(git ls-files)"
[ -n "$tracked_files" ] || { echo "No tracked files found; privacy scan cannot run." >&2; exit 1; }

for pattern in \
  'BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY' \
  '(AKIA|ASIA)[0-9A-Z]{16}' \
  'gh[pousr]_[A-Za-z0-9_]{20,}' \
  'xox[baprs]-[A-Za-z0-9-]+' \
  '-----BEGIN CERTIFICATE-----'; do
  if rg -n -- "$pattern" $tracked_files; then
    echo "Potential secret material matched: $pattern" >&2
    exit 1
  fi
done

while IFS= read -r file; do
  case "$file" in
    *.p12|*.mobileprovision|*.pem|*.key|*.cer|.env|.env.*)
      echo "Sensitive file is tracked: $file" >&2
      exit 1
      ;;
  esac
done <<< "$tracked_files"

echo "Privacy scan passed: no high-confidence credentials, certificates, private keys, or sensitive tracked file types found."
