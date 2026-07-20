/**
 * Phone State Module — monitors incoming/outgoing calls in real time.
 * Uses NativeEventEmitter on Android to relay call state changes to JS.
 *
 * New in v1.1:
 *   - cacheAuthToken(token, baseUrl)   — write auth token for native HTTP calls
 *   - cacheCustomerData(customersJson) — write customer list for IncomingCallActivity lookup
 */

import {
  Platform,
  NativeModules,
  NativeEventEmitter,
  EmitterSubscription,
  PermissionsAndroid,
} from 'react-native';

export type CallState = 'IDLE' | 'RINGING' | 'OFFHOOK';

export interface CallStateEvent {
  state: CallState;
  phoneNumber?: string;
  duration?: number;
  callType?: 'INCOMING' | 'OUTGOING' | 'MISSED';
  callEnded?: boolean;
  incoming: boolean;
}

let subscription: EmitterSubscription | null = null;

/**
 * Start monitoring phone call state.
 * Fires onCallState for: RINGING (incoming), OFFHOOK (answered/outgoing), IDLE (ended).
 * Returns an unsubscribe function.
 */
export function startCallMonitor(
  onCallState: (event: CallStateEvent) => void
): () => void {
  if (Platform.OS !== 'android') return () => {};

  try {
    const PhoneStateModule = NativeModules.PhoneStateModule;
    if (!PhoneStateModule) {
      console.warn('[PhoneStateModule] Not available — native build required');
      return () => {};
    }

    const emitter = new NativeEventEmitter(PhoneStateModule);
    subscription = emitter.addListener('onCallStateChanged', (event: any) => {
      onCallState({
        state:       event.state as CallState,
        phoneNumber: event.phoneNumber,
        duration:    event.duration,
        callType:    event.callType,
        callEnded:   event.callEnded,
        incoming:    event.state === 'RINGING',
      });
    });

    // Tell the native side to start the foreground service + register the bridge receiver
    PhoneStateModule.startCallMonitor?.().catch?.(() => {});

    return () => {
      subscription?.remove?.();
      subscription = null;
      PhoneStateModule.stopCallMonitor?.().catch?.(() => {});
    };
  } catch (err) {
    console.warn('[PhoneStateModule] Failed to start monitor:', err);
    return () => {};
  }
}

/** Open the system dialer pre-filled with a number. */
export async function openDialer(phoneNumber: string): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    return await NativeModules.PhoneStateModule?.openDialer(phoneNumber) ?? false;
  } catch { return false; }
}

/** Initiate a direct call (requires CALL_PHONE permission). */
export async function makeCall(phoneNumber: string): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    return await NativeModules.PhoneStateModule?.makeCall(phoneNumber) ?? false;
  } catch { return false; }
}

/**
 * Cache the JWT auth token + server URL in SharedPreferences so that
 * CallSyncService can POST call records to the API without the RN bridge.
 * Call this after every successful login.
 */
export async function cacheAuthToken(token: string, baseUrl: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await NativeModules.PhoneStateModule?.cacheAuthToken?.(token, baseUrl);
  } catch (e) {
    console.warn('[PhoneStateModule] cacheAuthToken failed:', e);
  }
}

/**
 * Cache customer data as JSON string in SharedPreferences so that
 * IncomingCallActivity can resolve caller names without the RN bridge.
 * Call this whenever the customer list is loaded or refreshed.
 *
 * Pass the minimal fields needed: id, name, mobile, alternate_number, category, notes
 */
export async function cacheCustomerData(customersJson: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await NativeModules.PhoneStateModule?.cacheCustomerData?.(customersJson);
  } catch (e) {
    console.warn('[PhoneStateModule] cacheCustomerData failed:', e);
  }
}

/** Request READ_PHONE_STATE permission. Returns true if granted. */
export async function requestPhoneStatePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
      {
        title:           'Phone State Permission',
        message:         'Net Zone CRM needs phone state access to detect calls automatically.',
        buttonPositive:  'Allow',
        buttonNegative:  'Deny',
      }
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch { return false; }
}

/** Request READ_CALL_LOG permission. Returns true if granted. */
export async function requestCallLogPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      {
        title:           'Call Log Permission',
        message:         'Net Zone CRM needs access to your call log to track calls automatically.',
        buttonPositive:  'Allow',
        buttonNegative:  'Deny',
      }
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch { return false; }
}

/** Request all required runtime permissions at once. */
export async function requestAllPermissions(): Promise<Record<string, boolean>> {
  if (Platform.OS !== 'android') return {};
  const permissions = [
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
    PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
    PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
    PermissionsAndroid.PERMISSIONS.CALL_PHONE,
  ];
  try {
    const results = await PermissionsAndroid.requestMultiple(permissions);
    return {
      callLog:    results[PermissionsAndroid.PERMISSIONS.READ_CALL_LOG]    === 'granted',
      contacts:   results[PermissionsAndroid.PERMISSIONS.READ_CONTACTS]    === 'granted',
      phoneState: results[PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE] === 'granted',
      callPhone:  results[PermissionsAndroid.PERMISSIONS.CALL_PHONE]       === 'granted',
    };
  } catch { return {}; }
}
