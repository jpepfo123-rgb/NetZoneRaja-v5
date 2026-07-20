/**
 * Offline Queue — stores calls locally when server is unreachable.
 * Auto-syncs when connectivity returns.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CallRecord } from './types';

const QUEUE_KEY = '@netzone/offline_calls';

export interface QueuedCall {
  localId: string;
  data: Omit<CallRecord, 'id' | 'createdAt'> & { created_at: string };
  timestamp: number;
}

export async function queueCall(data: Omit<CallRecord, 'id' | 'createdAt'>): Promise<string> {
  const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const item: QueuedCall = {
    localId,
    data: { ...data, created_at: new Date().toISOString() },
    timestamp: Date.now(),
  };
  const existing = await getQueue();
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...existing, item]));
  return localId;
}

export async function getQueue(): Promise<QueuedCall[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

export async function removeFromQueue(localIds: string[]): Promise<void> {
  const existing = await getQueue();
  const remaining = existing.filter(q => !localIds.includes(q.localId));
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}

/** Sync queued calls to server. Returns number synced. */
export async function syncQueuedCalls(serverUrl: string): Promise<number> {
  const queue = await getQueue();
  if (!queue.length) return 0;

  try {
    const { bulkSyncCalls } = await import('./remoteAdapter');
    const synced = await bulkSyncCalls(serverUrl, queue.map(q => q.data));
    if (synced > 0) {
      await clearQueue();
    }
    return synced;
  } catch {
    return 0;
  }
}
