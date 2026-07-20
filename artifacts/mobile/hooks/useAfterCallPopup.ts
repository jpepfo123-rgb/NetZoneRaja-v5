/**
 * useAfterCallPopup — listens for native call-ended events and
 * shows the AfterCallModal when a call finishes.
 *
 * Works on Android via NativeEventEmitter (PhoneStateModule).
 * No-op on web/iOS.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform, NativeModules, NativeEventEmitter, DeviceEventEmitter } from 'react-native';
import type { AfterCallData } from '@/components/AfterCallModal';

export function useAfterCallPopup() {
  const [visible, setVisible] = useState(false);
  const [callData, setCallData] = useState<AfterCallData | null>(null);
  const callStartRef = useRef<number>(0);
  const currentNumberRef = useRef<string>('');

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const PhoneStateModule = NativeModules.PhoneStateModule;
    if (!PhoneStateModule) return;

    let emitter: NativeEventEmitter | null = null;
    let subscription: any = null;

    try {
      emitter = new NativeEventEmitter(PhoneStateModule);

      subscription = emitter.addListener('onCallStateChanged', (event: {
        state: 'RINGING' | 'OFFHOOK' | 'IDLE';
        phoneNumber: string;
        duration?: number;
      }) => {
        const { state, phoneNumber, duration } = event;

        if (state === 'RINGING') {
          currentNumberRef.current = phoneNumber;
        } else if (state === 'OFFHOOK') {
          callStartRef.current = Date.now();
          if (!currentNumberRef.current) {
            currentNumberRef.current = phoneNumber;
          }
        } else if (state === 'IDLE' && currentNumberRef.current) {
          const elapsed = duration ?? Math.round((Date.now() - callStartRef.current) / 1000);
          const num = currentNumberRef.current;

          // Small delay to ensure call log is updated
          setTimeout(() => {
            setCallData({
              phoneNumber: num,
              duration: Math.max(0, elapsed),
              callType: elapsed < 2 ? 'missed' : 'outgoing',
            });
            setVisible(true);
          }, 1500);

          callStartRef.current = 0;
          currentNumberRef.current = '';
        }
      });
    } catch (err) {
      console.warn('useAfterCallPopup: failed to attach listener', err);
    }

    // Also listen for the broadcast-based event from CallMonitorService
    const broadcastSub = DeviceEventEmitter.addListener(
      'com.netzone.crm.AFTER_CALL_SAVE',
      (event: any) => {
        if (event?.phoneNumber) {
          setCallData({
            phoneNumber: event.phoneNumber,
            duration: event.duration ?? 0,
            callType: (event.callType ?? 'OUTGOING').toLowerCase() as AfterCallData['callType'],
          });
          setVisible(true);
        }
      }
    );

    return () => {
      subscription?.remove?.();
      broadcastSub?.remove?.();
    };
  }, []);

  const dismiss = useCallback(() => {
    setVisible(false);
    setCallData(null);
  }, []);

  return { visible, callData, dismiss };
}
