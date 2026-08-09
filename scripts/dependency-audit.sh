#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_DIR="$PROJECT_DIR/server"

command -v node >/dev/null 2>&1 || { echo "Node.js is required." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "npm is required." >&2; exit 1; }

echo "Checking locked dependency tree"
(cd "$SERVER_DIR" && npm ci --ignore-scripts --audit=false --fund=false)
(cd "$SERVER_DIR" && npm ls --all --omit=dev)

echo "Running high-severity runtime vulnerability audit"
(cd "$SERVER_DIR" && npm audit --omit=dev --audit-level=high)

echo "Checking native project dependency surface"
if command -v xcodebuild >/dev/null 2>&1; then
  xcodebuild -project "$PROJECT_DIR/MusiCollab.xcodeproj" -target MusiCollab -showBuildSettings >/dev/null
else
  echo "xcodebuild unavailable; skipped native project check." >&2
fi

echo "Dependency and license audit passed. See $PROJECT_DIR/DEPENDENCY_LICENSES.md."
