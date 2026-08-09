#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECT_FILE="$PROJECT_DIR/MusiCollab.xcodeproj"
SCHEME="MusiCollab"
CONFIGURATION="${CONFIGURATION:-Release}"
ARCHIVE_PATH="${ARCHIVE_PATH:-$PROJECT_DIR/build/MusiCollab.xcarchive}"

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "xcodebuild is required. Install Xcode and select it with xcode-select." >&2
  exit 1
fi

mkdir -p "$(dirname "$ARCHIVE_PATH")"
rm -rf "$ARCHIVE_PATH"

echo "Archiving $SCHEME ($CONFIGURATION) to $ARCHIVE_PATH"
xcodebuild \
  -project "$PROJECT_FILE" \
  -scheme "$SCHEME" \
  -configuration "$CONFIGURATION" \
  -destination "generic/platform=iOS" \
  -archivePath "$ARCHIVE_PATH" \
  -allowProvisioningUpdates \
  archive

echo
echo "Archive created: $ARCHIVE_PATH"
echo "Export from Xcode Organizer after selecting the appropriate App Store or Ad Hoc method."
