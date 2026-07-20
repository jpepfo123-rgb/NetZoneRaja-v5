/**
 * Call Log Native Module — reads Android call history.
 * On Android: uses READ_CALL_LOG permission to fetch real call log.
 * On web/iOS: returns mock data.
 */

import { Platform, NativeModules } from 'react-native';

export interface NativeCallLogEntry {
  id: string;
  phoneNumber: string;
  name: string;
  type: 'Incoming' | 'Outgoing' | 'Missed';
  duration: number;        // seconds
  timestamp: number;       // unix ms
  formattedDuration: string; // "M:SS"
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Fetch device call log entries.
 * On Android: reads real call log via native module.
 * Elsewhere: returns empty array.
 */
export async function fetchCallLog(limit = 100): Promise<NativeCallLogEntry[]> {
  if (Platform.OS !== 'android') return [];

  try {
    const CallLogModule = NativeModules.CallLogModule;
    if (!CallLogModule) {
      console.warn('CallLogModule not available — may need native build');
      return [];
    }
    const raw: any[] = await CallLogModule.getCallLog(limit);
    return raw.map(entry => ({
      id: String(entry.id ?? entry.timestamp),
      phoneNumber: entry.number ?? entry.phoneNumber ?? '',
      name: entry.name ?? entry.cachedName ?? '',
      type: entry.type === 1 ? 'Incoming'
          : entry.type === 2 ? 'Outgoing'
          : 'Missed',
      duration: parseInt(entry.duration ?? '0'),
      timestamp: parseInt(entry.date ?? entry.timestamp ?? Date.now()),
      formattedDuration: formatDuration(parseInt(entry.duration ?? '0')),
    }));
  } catch (err) {
    console.error('CallLog fetch error:', err);
    return [];
  }
}

/**
 * Request READ_CALL_LOG permission.
 * Returns true if granted.
 */
export async function requestCallLogPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const { PermissionsAndroid } = await import('react-native');
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      {
        title: 'Call Log Permission',
        message: 'Net Zone CRM needs access to your call log to track calls automatically.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      }
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

/**
 * Request all required permissions at once.
 */
export async function requestAllPermissions(): Promise<Record<string, boolean>> {
  if (Platform.OS !== 'android') return {};
  const { PermissionsAndroid } = await import('react-native');
  const permissions = [
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
    PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
    PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
    PermissionsAndroid.PERMISSIONS.CALL_PHONE,
  ];

  try {
    const results = await PermissionsAndroid.requestMultiple(permissions);
    return {
      callLog: results[PermissionsAndroid.PERMISSIONS.READ_CALL_LOG] === 'granted',
      contacts: results[PermissionsAndroid.PERMISSIONS.READ_CONTACTS] === 'granted',
      phoneState: results[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] === 'granted',
      callPhone: results[PermissionsAndroid.PERMISSIONS.CALL_PHONE] === 'granted',
    };
  } catch {
    return {};
  }
}
