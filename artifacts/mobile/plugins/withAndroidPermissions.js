/**
 * Expo Config Plugin — withAndroidPermissions
 *
 * Adds to AndroidManifest.xml:
 *   - CallMonitorService   (foreground service, phoneCall type)
 *   - CallSyncService      (background HTTP sync to API)
 *   - BootReceiver         (restarts monitoring after device reboot)
 *   - PhoneStateReceiver   (PHONE_STATE broadcast)
 *   - IncomingCallActivity (full-screen overlay, shown over lock screen)
 *   - AfterCallActivity    (post-call note/category/reminder dialog)
 */

const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroidPermissions(config) {
  return withAndroidManifest(config, (config) => {
    const app         = config.modResults.manifest.application[0];

    // ── Services ─────────────────────────────────────────────────────────────
    if (!app.service) app.service = [];

    const services = [
      {
        'android:name':                'com.netzone.crm.phonestate.CallMonitorService',
        'android:enabled':             'true',
        'android:exported':            'false',
        'android:foregroundServiceType': 'phoneCall',
      },
      {
        'android:name':     'com.netzone.crm.phonestate.CallSyncService',
        'android:enabled':  'true',
        'android:exported': 'false',
      },
    ];

    for (const svc of services) {
      if (!app.service.some(s => s.$?.['android:name'] === svc['android:name'])) {
        app.service.push({ $: svc });
      }
    }

    // ── Receivers ────────────────────────────────────────────────────────────
    if (!app.receiver) app.receiver = [];

    const bootReceiver = 'com.netzone.crm.phonestate.BootReceiver';
    if (!app.receiver.some(r => r.$?.['android:name'] === bootReceiver)) {
      app.receiver.push({
        $: { 'android:name': bootReceiver, 'android:enabled': 'true', 'android:exported': 'true' },
        'intent-filter': [{
          action: [
            { $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } },
            { $: { 'android:name': 'android.intent.action.QUICKBOOT_POWERON' } },
          ],
        }],
      });
    }

    const phoneReceiver = 'com.netzone.crm.phonestate.PhoneStateReceiver';
    if (!app.receiver.some(r => r.$?.['android:name'] === phoneReceiver)) {
      app.receiver.push({
        $: { 'android:name': phoneReceiver, 'android:enabled': 'true', 'android:exported': 'true',
             'android:permission': 'android.permission.BROADCAST_PHONE_ACCOUNT_REGISTRATION_PERMISSION' },
        'intent-filter': [{
          action: [
            { $: { 'android:name': 'android.intent.action.PHONE_STATE' } },
            { $: { 'android:name': 'android.intent.action.NEW_OUTGOING_CALL' } },
          ],
        }],
      });
    }

    // ── Activities ───────────────────────────────────────────────────────────
    if (!app.activity) app.activity = [];

    const activities = [
      {
        'android:name':         'com.netzone.crm.overlay.IncomingCallActivity',
        'android:theme':        '@android:style/Theme.Translucent.NoTitleBar.Fullscreen',
        'android:launchMode':   'singleInstance',
        'android:exported':     'false',
        'android:showWhenLocked': 'true',
        'android:turnScreenOn': 'true',
      },
      {
        'android:name':       'com.netzone.crm.overlay.AfterCallActivity',
        'android:theme':      '@android:style/Theme.Material.Light.Dialog',
        'android:launchMode': 'singleInstance',
        'android:exported':   'false',
      },
    ];

    for (const act of activities) {
      if (!app.activity.some(a => a.$?.['android:name'] === act['android:name'])) {
        app.activity.push({ $: act });
      }
    }

    return config;
  });
};
