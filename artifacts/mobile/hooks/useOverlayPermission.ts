/**
 * useOverlayPermission
 *
 * Manages the SYSTEM_ALERT_WINDOW ("Display over other apps") permission
 * lifecycle on Android:
 *
 *   - Checks permission on mount (once per install via AsyncStorage)
 *   - If not granted and not yet decided, status = 'needs_permission'
 *   - When user returns from Android Settings, re-checks automatically
 *   - User can "Skip" → permission marked as skipped, overlay features disabled
 *   - Never shows the prompt again once a decision is made
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkOverlayPermission, openOverlaySettings } from '@/modules/overlay';

export type OverlayPermissionStatus =
  | 'checking'         // initial — waiting for async check
  | 'granted'          // permission is currently granted
  | 'needs_permission' // not granted, not yet decided — show explanation screen
  | 'skipped';         // user chose to skip; overlay features disabled

const PREF_KEY = '@netzone/overlay_decided_v1';

export interface UseOverlayPermissionReturn {
  status: OverlayPermissionStatus;
  /** Opens Android Manage Overlay Permission screen */
  requestPermission: () => Promise<void>;
  /** User chooses to skip; overlay features will be disabled */
  skipPermission: () => Promise<void>;
  /** Re-check current permission state (called after returning from settings) */
  recheck: () => Promise<void>;
}

export function useOverlayPermission(): UseOverlayPermissionReturn {
  const [status, setStatus] = useState<OverlayPermissionStatus>('checking');
  const appStateRef = useRef(AppState.currentState);

  const recheck = useCallback(async () => {
    if (Platform.OS !== 'android') {
      setStatus('granted');
      return;
    }

    try {
      const granted = await checkOverlayPermission();
      if (granted) {
        await AsyncStorage.setItem(PREF_KEY, 'granted');
        setStatus('granted');
        return;
      }

      // Check if user already made a decision
      const stored = await AsyncStorage.getItem(PREF_KEY);
      if (stored === 'skipped') {
        setStatus('skipped');
      } else {
        // Permission not granted and no stored decision → show explanation
        setStatus('needs_permission');
      }
    } catch {
      // On error, don't block the app — treat as skipped
      setStatus('skipped');
    }
  }, []);

  // Initial check
  useEffect(() => {
    recheck();
  }, [recheck]);

  // Re-check when app comes back to foreground (user returns from Settings)
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active' &&
        status === 'needs_permission'
      ) {
        await recheck();
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [status, recheck]);

  const requestPermission = useCallback(async () => {
    await openOverlaySettings();
    // Result checked automatically via AppState listener when app comes back
  }, []);

  const skipPermission = useCallback(async () => {
    await AsyncStorage.setItem(PREF_KEY, 'skipped');
    setStatus('skipped');
  }, []);

  return { status, requestPermission, skipPermission, recheck };
}

/** Detect Android device manufacturer (for device-specific guidance) */
export function getDeviceManufacturer(): string {
  if (Platform.OS !== 'android') return '';
  return (
    (Platform.constants as any)?.Manufacturer ??
    (Platform.constants as any)?.Brand ??
    ''
  ).toLowerCase();
}
