#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_DIR="$PROJECT_DIR/server"
SOAK_DURATION_SECONDS="${SOAK_DURATION_SECONDS:-10}"

command -v node >/dev/null 2>&1 || { echo "Node.js is required." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required." >&2; exit 1; }

run_suite() {
  local name="$1"
  shift
  echo
  echo "=== $name ==="
  (cd "$SERVER_DIR" && PORT=0 "$@")
}

run_suite "Protocol and model tests" npm test
run_suite "Network interruption and resumption" npm run test:network
run_suite "Mac + iPhone 14 smoke test" npm run test:smoke
run_suite "Browser asset checks" npm run test:browser-assets
echo
echo "=== Two-client soak (${SOAK_DURATION_SECONDS}s) ==="
(cd "$SERVER_DIR" && PORT=0 SOAK_DURATION_SECONDS="$SOAK_DURATION_SECONDS" npm run test:soak)

echo
echo "All MusiCollab automated suites passed."
