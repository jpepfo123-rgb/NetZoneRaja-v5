/**
 * CRMContext — in-memory state for all CRM entities.
 * Data is loaded from CrmService (local adapter by default, remote when logged in
 * with a real server URL) and kept in React state for fast UI updates.
 *
 * Every mutation:
 *   1. Calls CrmService (which persists via AsyncStorage or REST API)
 *   2. Updates local state immediately so the UI stays responsive
 */

import React, {
  createContext, useCallback, useContext, useEffect, useState,
} from 'react';
import { Platform } from 'react-native';
import { CrmService } from '@/services/crmService';
import type {
  Customer, CallRecord, Remark, Reminder,
} from '@/services/types';
import { Category, CallType, Priority } from '@/constants/colors';
import { cacheCustomerData } from '@/modules/phone-state';

export type { Customer, CallRecord, Remark, Reminder };

// ─── Dialer (local-only, no remote sync needed) ───────────────────────────────
export interface DialerEntry {
  id: string;
  name: string;
  mobile: string;
  status: 'pending' | 'calling' | 'busy' | 'no_answer' | 'done' | 'skipped';
  attempts: number;
}

export interface Agent {
  id: string | number;
  name: string;
  username: string;
  role: 'admin' | 'agent';
  totalCalls: number;
  todayCalls: number;
  isActive: boolean;
}

// ─── Context type ─────────────────────────────────────────────────────────────
interface CRMContextType {
  customers:  Customer[];
  calls:      CallRecord[];
  remarks:    Remark[];
  reminders:  Reminder[];
  dialerQueue: DialerEntry[];
  agents:     Agent[];
  isLoading:  boolean;

  // Customers
  getCustomerById:    (id: string) => Customer | undefined;
  addCustomer:        (data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateCustomer:     (id: string, data: Partial<Omit<Customer, 'id' | 'createdAt'>>) => Promise<void>;
  deleteCustomer:     (id: string) => Promise<void>;
  searchCustomers:    (q: string) => Customer[];

  // Calls
  addCall:            (data: Omit<CallRecord, 'id' | 'createdAt'>) => Promise<void>;
  getCustomerCalls:   (customerId: string) => CallRecord[];
  getTodayCalls:      () => CallRecord[];

  // Remarks
  getCustomerRemarks: (customerId: string) => Remark[];
  addRemark:          (data: Omit<Remark, 'id' | 'createdAt'>) => Promise<void>;
  updateRemark:       (id: string, text: string) => Promise<void>;

  // Reminders
  addReminder:           (data: Omit<Reminder, 'id' | 'createdAt'>) => Promise<void>;
  updateReminderStatus:  (id: string, status: Reminder['status']) => Promise<void>;
  deleteReminder:        (id: string) => Promise<void>;
  getTodayReminders:     () => Reminder[];
  getPendingFollowUps:   () => Customer[];

  // Dialer (local-only)
  setDialerQueue:     (entries: DialerEntry[]) => void;
  updateDialerEntry:  (id: string, patch: Partial<DialerEntry>) => void;

  // Reload from service (called after Settings → Reset Data)
  reload: () => Promise<void>;
}

const CRMContext = createContext<CRMContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function CRMProvider({ children }: { children: React.ReactNode }) {
  const [customers,   setCustomers]   = useState<Customer[]>([]);
  const [calls,       setCalls]       = useState<CallRecord[]>([]);
  const [remarks,     setRemarks]     = useState<Remark[]>([]);
  const [reminders,   setReminders]   = useState<Reminder[]>([]);
  const [agents,      setAgents]      = useState<Agent[]>([]);
  const [dialerQueue, setDialerQueue] = useState<DialerEntry[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);

  // ── Load all data ────────────────────────────────────────────────────────
  const reload = useCallback(async () => {
    setIsLoading(true);
    try {
      const [c, cl, r, rem] = await Promise.all([
        CrmService.getCustomers(),
        CrmService.getCalls(),
        CrmService.getRemarks(),
        CrmService.getReminders(),
      ]);
      setCustomers(c);
      setCalls(cl);
      setRemarks(r);
      setReminders(rem);

      // Push minimal customer map to SharedPreferences so IncomingCallActivity
      // can look up callers by phone number without the React Native bridge.
      if (Platform.OS === 'android' && c.length > 0) {
        const slim = c.map(cu => ({
          id:               cu.id,
          name:             cu.name,
          mobile:           cu.mobile,
          alternate_number: cu.alternate_number ?? '',
          category:         cu.category ?? '',
          notes:            (cu.notes ?? '').slice(0, 120),
        }));
        cacheCustomerData(JSON.stringify(slim)).catch(() => {});
      }

      // Fetch agents from API if available
      try {
        const agentList = await CrmService.getAgents?.();
        if (agentList) setAgents(agentList);
      } catch {
        /* agents may not be available in local mode */
      }
    } catch {
      /* keep whatever is in state */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // ─── Customer operations ─────────────────────────────────────────────────
  const getCustomerById = useCallback(
    (id: string) => customers.find(c => c.id === id),
    [customers],
  );

  const addCustomer = useCallback(async (
    data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>,
  ) => {
    const rec = await CrmService.addCustomer(data);
    setCustomers(prev => [rec, ...prev]);
    // Re-fetch calls so any historical records for this phone number are now
    // linked (the API backfills customer_id on create).
    CrmService.getCalls().then(setCalls).catch(() => {});
  }, []);

  const updateCustomer = useCallback(async (
    id: string,
    data: Partial<Omit<Customer, 'id' | 'createdAt'>>,
  ) => {
    const rec = await CrmService.updateCustomer(id, data);
    setCustomers(prev => prev.map(c => c.id === id ? rec : c));
    // Re-fetch calls so any historical records for the updated phone number are
    // re-linked (the API backfills customer_id on update).
    CrmService.getCalls().then(setCalls).catch(() => {});
  }, []);

  const deleteCustomer = useCallback(async (id: string) => {
    await CrmService.deleteCustomer(id);
    setCustomers(prev => prev.filter(c => c.id !== id));
  }, []);

  const searchCustomers = useCallback((q: string): Customer[] => {
    if (!q.trim()) return customers;
    const lq = q.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(lq) ||
      c.mobile.includes(q) ||
      c.email.toLowerCase().includes(lq) ||
      c.address.toLowerCase().includes(lq),
    );
  }, [customers]);

  // ─── Call operations ─────────────────────────────────────────────────────
  const addCall = useCallback(async (data: Omit<CallRecord, 'id' | 'createdAt'>) => {
    const rec = await CrmService.addCall(data);
    setCalls(prev => [rec, ...prev]);
  }, []);

  const getCustomerCalls = useCallback(
    (customerId: string) => calls.filter(c => c.customerId === customerId),
    [calls],
  );

  const getTodayCalls = useCallback(() => {
    const today = new Date().toDateString();
    return calls.filter(c => new Date(c.createdAt).toDateString() === today);
  }, [calls]);

  // ─── Remark operations ───────────────────────────────────────────────────
  const getCustomerRemarks = useCallback(
    (customerId: string) => remarks.filter(r => r.customerId === customerId),
    [remarks],
  );

  const addRemark = useCallback(async (data: Omit<Remark, 'id' | 'createdAt'>) => {
    const rec = await CrmService.addRemark(data);
    setRemarks(prev => [rec, ...prev]);
  }, []);

  const updateRemark = useCallback(async (id: string, text: string) => {
    const rec = await CrmService.updateRemark(id, text);
    setRemarks(prev => prev.map(r => r.id === id ? rec : r));
  }, []);

  // ─── Reminder operations ─────────────────────────────────────────────────
  const addReminder = useCallback(async (data: Omit<Reminder, 'id' | 'createdAt'>) => {
    const rec = await CrmService.addReminder(data);
    setReminders(prev => [rec, ...prev]);
  }, []);

  const updateReminderStatus = useCallback(async (
    id: string, status: Reminder['status'],
  ) => {
    const rec = await CrmService.updateReminderStatus(id, status);
    setReminders(prev => prev.map(r => r.id === id ? rec : r));
  }, []);

  const deleteReminder = useCallback(async (id: string) => {
    await CrmService.deleteReminder(id);
    setReminders(prev => prev.filter(r => r.id !== id));
  }, []);

  const getTodayReminders = useCallback(() => {
    const today = new Date().toDateString();
    return reminders.filter(r =>
      new Date(r.dateTime).toDateString() === today && r.status !== 'completed',
    );
  }, [reminders]);

  const getPendingFollowUps = useCallback(() =>
    customers.filter(c => c.category === 'Follow-up'),
    [customers],
  );

  // ─── Dialer (local-only) ─────────────────────────────────────────────────
  const setDialerQueueCb = useCallback((entries: DialerEntry[]) => {
    setDialerQueue(entries);
  }, []);

  const updateDialerEntry = useCallback((id: string, patch: Partial<DialerEntry>) => {
    setDialerQueue(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));
  }, []);

  return (
    <CRMContext.Provider value={{
      customers, calls, remarks, reminders, dialerQueue, agents, isLoading,
      getCustomerById, addCustomer, updateCustomer, deleteCustomer, searchCustomers,
      addCall, getCustomerCalls, getTodayCalls,
      getCustomerRemarks, addRemark, updateRemark,
      addReminder, updateReminderStatus, deleteReminder,
      getTodayReminders, getPendingFollowUps,
      setDialerQueue: setDialerQueueCb, updateDialerEntry,
      reload,
    }}>
      {children}
    </CRMContext.Provider>
  );
}

export function useCRM(): CRMContextType {
  const ctx = useContext(CRMContext);
  if (!ctx) throw new Error('useCRM must be used inside CRMProvider');
  return ctx;
}
