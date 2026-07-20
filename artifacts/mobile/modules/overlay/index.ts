/**
 * Overlay Module — shows incoming call popup and after-call dialog.
 * Uses SYSTEM_ALERT_WINDOW (canDrawOverlays) permission.
 *
 * Permission API:
 *   checkOverlayPermission()   → true if SYSTEM_ALERT_WINDOW granted
 *   openOverlaySettings()      → opens Android Manage Overlay Permission screen
 */

import { Platform, NativeModules } from 'react-native';

function getModule() {
  return NativeModules.OverlayModule as {
    canDrawOverlays: () => Promise<boolean>;
    requestOverlayPermission: () => Promise<boolean>;
    showIncomingCallOverlay: (phone: string, customerJson: string) => Promise<boolean>;
    showAfterCallPopup: (phone: string, duration: number, callType: string) => Promise<boolean>;
    dismissOverlay: () => Promise<boolean>;
  } | null;
}

/** Returns true if the SYSTEM_ALERT_WINDOW permission is granted */
export async function checkOverlayPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    return (await getModule()?.canDrawOverlays()) ?? false;
  } catch {
    return false;
  }
}

/**
 * Opens the Android "Display over other apps" settings page so the user
 * can grant the permission. Returns after launching (not after granting).
 */
export async function openOverlaySettings(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await getModule()?.requestOverlayPermission();
  } catch {
    // Fallback: open general app settings
    const { Linking } = await import('react-native');
    Linking.openSettings();
  }
}

/** Show the incoming call overlay for a given phone number */
export async function showIncomingCallOverlay(
  phoneNumber: string,
  customerJson: string,
): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await getModule()?.showIncomingCallOverlay(phoneNumber, customerJson);
  } catch (err) {
    console.warn('[OverlayModule] showIncomingCallOverlay failed:', err);
  }
}

/** Show the after-call popup */
export async function showAfterCallPopup(
  phoneNumber: string,
  duration: number,
  callType: string,
): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await getModule()?.showAfterCallPopup(phoneNumber, duration, callType);
  } catch (err) {
    console.warn('[OverlayModule] showAfterCallPopup failed:', err);
  }
}

/** Dismiss any active overlay */
export async function dismissOverlay(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await getModule()?.dismissOverlay();
  } catch {}
}
