#!/usr/bin/env bash
# ============================================================
# Run expo prebuild only (no EAS cloud build).
# Use this to inspect the generated android/ tree locally or
# to verify that withKotlinSources copied all Kotlin files.
# ============================================================

set -euo pipefail

MOBILE_DIR="$(cd "$(dirname "$0")/.." && pwd)/artifacts/mobile"
cd "$MOBILE_DIR"

echo "▶ Installing dependencies…"
pnpm install --frozen-lockfile

echo "▶ Running expo prebuild (android)…"
pnpm exec expo prebuild --platform android --clean

echo ""
echo "✔ Prebuild done. Kotlin sources:"
find android/app/src/main/java/com/netzone -name "*.kt" 2>/dev/null | sort || true
