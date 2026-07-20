#!/usr/bin/env bash
# ============================================================
# Net Zone CRM Dialer — Android Build Script
# ============================================================
# Runs expo prebuild + EAS cloud build to produce a release APK.
#
# Prerequisites:
#   1. EAS CLI installed:  pnpm add -g eas-cli
#   2. Logged in to EAS:  eas login
#   3. The project must already exist on EAS (projectId in app.json)
#
# Usage:
#   cd <workspace-root>
#   bash scripts/build-android.sh [preview|production]
#
# Profiles (defined in artifacts/mobile/eas.json):
#   preview    — assembleRelease APK, sideload-ready (default)
#   production — bundleRelease AAB, for Play Store
# ============================================================

set -euo pipefail

PROFILE="${1:-preview}"
MOBILE_DIR="$(cd "$(dirname "$0")/.." && pwd)/artifacts/mobile"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Net Zone CRM Dialer — Android Build"
echo "  Profile : $PROFILE"
echo "  Dir     : $MOBILE_DIR"
echo "═══════════════════════════════════════════════════"
echo ""

cd "$MOBILE_DIR"

# ── 1. Install dependencies ──────────────────────────────────
echo "▶ Installing dependencies…"
pnpm install --frozen-lockfile

# ── 2. Run expo prebuild (generates android/ source tree) ────
echo "▶ Running expo prebuild…"
pnpm exec expo prebuild --platform android --clean

# At this point the withKotlinSources plugin has copied all Kotlin
# modules into android/app/src/main/java/com/netzone/crm/ and
# android/app/src/main/java/com/netzone/crmdialer/MainApplication.kt

echo ""
echo "✔ Prebuild complete — Kotlin sources copied to android/ tree"
echo ""

# ── 3. EAS Cloud Build ────────────────────────────────────────
echo "▶ Starting EAS cloud build (profile: $PROFILE)…"
echo "   This uploads the project to EAS Build servers."
echo "   Follow the URL printed below to monitor progress."
echo ""

pnpm exec eas build \
  --platform android \
  --profile "$PROFILE" \
  --non-interactive

echo ""
echo "═══════════════════════════════════════════════════"
echo "  Build submitted!  Download the APK/AAB from the"
echo "  EAS dashboard URL shown above."
echo "═══════════════════════════════════════════════════"
