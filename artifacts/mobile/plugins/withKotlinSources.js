/**
 * Expo Config Plugin — withKotlinSources
 *
 * Copies all Kotlin native module sources into the Android project tree during
 * `expo prebuild` / EAS Build, enabling Gradle to compile them.
 *
 * Source layout (in this repo):
 *   modules/call-log/android/*.kt      → android/.../com/netzone/crm/calllog/
 *   modules/phone-state/android/*.kt   → android/.../com/netzone/crm/phonestate/
 *   modules/overlay/android/*.kt       → android/.../com/netzone/crm/overlay/
 *   modules/overlay/android/MainApplication.kt
 *                                      → android/.../com/netzone/crmdialer/   (overwrites Expo stub)
 *
 * The MainApplication.kt is placed in the crmdialer package (= applicationId) so that
 * Android resolves android:name=".MainApplication" correctly. All other source files
 * keep the com.netzone.crm.* sub-package names.
 */

const { withDangerousMod } = require('@expo/config-plugins');
const fs   = require('fs');
const path = require('path');

// ── helpers ───────────────────────────────────────────────────────────────────

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyKt(src, dst) {
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
  console.log(`[withKotlinSources] ${path.basename(src)} → ${dst.split('java/')[1] ?? dst}`);
}

function copyDir(srcDir, dstDir, exclude = []) {
  if (!fs.existsSync(srcDir)) return;
  ensureDir(dstDir);
  for (const file of fs.readdirSync(srcDir)) {
    if (!file.endsWith('.kt'))  continue;
    if (exclude.includes(file)) continue;
    copyKt(path.join(srcDir, file), path.join(dstDir, file));
  }
}

// ── plugin ────────────────────────────────────────────────────────────────────

module.exports = function withKotlinSources(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot  = config.modRequest.projectRoot;        // artifacts/mobile/
      const platformRoot = config.modRequest.platformProjectRoot; // artifacts/mobile/android/

      const javaSrc    = path.join(platformRoot, 'app/src/main/java');
      const crmBase    = path.join(javaSrc, 'com/netzone/crm');
      const appBase    = path.join(javaSrc, 'com/netzone/crmdialer');

      // 1. CallLog module
      copyDir(
        path.join(projectRoot, 'modules/call-log/android'),
        path.join(crmBase, 'calllog')
      );

      // 2. PhoneState module (includes CallEndedReceiver + CallSyncService)
      copyDir(
        path.join(projectRoot, 'modules/phone-state/android'),
        path.join(crmBase, 'phonestate')
      );

      // 3. Overlay module — skip MainApplication.kt (handled separately below)
      copyDir(
        path.join(projectRoot, 'modules/overlay/android'),
        path.join(crmBase, 'overlay'),
        ['MainApplication.kt']
      );

      // 4. MainApplication.kt → applicationId package dir (replaces Expo-generated stub)
      const mainAppSrc = path.join(projectRoot, 'modules/overlay/android/MainApplication.kt');
      if (fs.existsSync(mainAppSrc)) {
        copyKt(mainAppSrc, path.join(appBase, 'MainApplication.kt'));
      }

      return config;
    },
  ]);
};
