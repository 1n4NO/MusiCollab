#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/Users/ps/dev/MusiCollab"

echo "== native build =="
xcodebuild \
  -project "$PROJECT_DIR/MusiCollab.xcodeproj" \
  -target MusiCollab \
  -sdk iphoneos \
  -configuration Debug \
  -allowProvisioningUpdates \
  build

echo "== protocol tests =="
(cd "$PROJECT_DIR/server" && npm test)

echo "== network recovery tests =="
(cd "$PROJECT_DIR/server" && npm run test:network)

echo "== three-client smoke test =="
(cd "$PROJECT_DIR/server" && npm run test:smoke)

if [[ -n "${SOAK_DURATION_SECONDS:-}" ]]; then
  echo "== memory/CPU soak test =="
  (cd "$PROJECT_DIR/server" && npm run test:soak)
else
  echo "Skipping soak; set SOAK_DURATION_SECONDS=10 or 3600 to run it."
fi

echo "Performance harness passed."
