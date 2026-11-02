#!/usr/bin/env bash
set -euo pipefail

# Uses the existing Wrangler OAuth login, or CLOUDFLARE_API_TOKEN in CI.
export CLOUDFLARE_ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-b9cd9415f53ddec58df5017f346586fa}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RELEASE="$(mktemp -d "${TMPDIR:-/tmp}/doaide-release.XXXXXX")"
trap 'rm -rf "$RELEASE"' EXIT

cd "$ROOT"
python3 build/release.py "$RELEASE"
npx wrangler pages deploy "$RELEASE" --project-name doaide-landing \
  --branch "${1:-main}" --commit-dirty=true
