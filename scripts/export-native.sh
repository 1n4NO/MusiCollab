#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ARCHIVE_PATH="${ARCHIVE_PATH:-$PROJECT_DIR/build/MusiCollab.xcarchive}"
EXPORT_PATH="${EXPORT_PATH:-$PROJECT_DIR/build/export}"
EXPORT_OPTIONS="${EXPORT_OPTIONS:-$PROJECT_DIR/ExportOptions-AppStore.plist}"

if ! command -v xcodebuild >/dev/null 2>&1; then
  echo "xcodebuild is required. Install Xcode and select it with xcode-select." >&2
  exit 1
fi

if [[ ! -d "$ARCHIVE_PATH" ]]; then
  echo "Archive not found: $ARCHIVE_PATH" >&2
  echo "Create one first with ./scripts/archive-native.sh" >&2
  exit 1
fi

if [[ ! -f "$EXPORT_OPTIONS" ]]; then
  echo "Export options plist not found: $EXPORT_OPTIONS" >&2
  exit 1
fi

mkdir -p "$EXPORT_PATH"

echo "Exporting $ARCHIVE_PATH to $EXPORT_PATH"
xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$EXPORT_PATH" \
  -exportOptionsPlist "$EXPORT_OPTIONS" \
  -allowProvisioningUpdates

echo
echo "Export complete: $EXPORT_PATH"
echo "Upload the IPA from Xcode Organizer or App Store Connect; do not commit export artifacts."
