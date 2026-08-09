#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PAGES_PROJECT="${MUSICOLLAB_PAGES_PROJECT:-musicollab-companion}"
BRANCH="${MUSICOLLAB_PAGES_BRANCH:-main}"

if ! command -v wrangler >/dev/null 2>&1; then
  echo "Cloudflare Wrangler is required for this deployment command." >&2
  echo "Install it with: npm install --global wrangler" >&2
  exit 1
fi

echo "Deploying /Users/ps/dev/MusiCollab/web to Cloudflare Pages project '$PAGES_PROJECT'"
wrangler pages deploy "$PROJECT_DIR/web" --project-name "$PAGES_PROJECT" --branch "$BRANCH"
