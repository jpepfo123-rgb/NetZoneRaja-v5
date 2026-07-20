/**
 * Local Adapter — stores all data in AsyncStorage.
 * This is the offline-first implementation used when no server is configured
 * or when the device cannot reach the server.
 *
 * Storage keys:
 *   @netzone/customers   JSON[]
 *   @netzone/calls       JSON[]
 *   @netzone/remarks     JSON[]
 *   @netzone/reminders   JSON[]
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Customer, CallRecord, Remark, Reminder,
  ICrmService, LoginRequest, LoginResponse,
} from './types';

// ─── Demo users (local only) ─────────────────────────────────────────────────

const DEMO_USERS = [
  { id: 'u1', name: 'Admin User',  username: 'admin',  password: 'admin123',  role: 'admin'  as const },
  { id: 'u2', name: 'Raj Sharma',  username: 'agent1', password: 'agent123',  role: 'agent'  as const },
  { id: 'u3', name: 'Priya Singh', username: 'agent2', password: 'agent123',  role: 'agent'  as const },
];

// ─── Storage helpers ──────────────────────────────────────────────────────────

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function iso(): string {
  return new Date().toISOString();
}

async function read<T>(key: string, fallback: T[]): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : fallback;
  } catch {
    return fallback;
  }
}

async function write<T>(key: string, data: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

// ─── Keys ─────────────────────────────────────────────────────────────────────

const K = {
  customers: '@netzone/customers',
  calls:     '@netzone/calls',
  remarks:   '@netzone/remarks',
  reminders: '@netzone/reminders',
} as const;

// ─── Seed data (written once on first run) ────────────────────────────────────

export const SEED_CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'Amit Patel',    mobile: '9876543210', email: 'amit@example.com',    address: 'Mumbai, MH',      category: 'Interested',      priority: 'High',   notes: 'Interested in premium plan', agentId: 'u2', createdAt: ago(7),  updatedAt: ago(2) },
  { id: 'c2', name: 'Sunita Rao',    mobile: '9123456789', email: 'sunita@example.com',  address: 'Pune, MH',        category: 'Follow-up',       priority: 'Medium', notes: 'Called twice, need follow-up', agentId: 'u2', createdAt: ago(10), updatedAt: ago(1) },
  { id: 'c3', name: 'Vijay Kumar',   mobile: '8765432109', email: 'vijay@example.com',   address: 'Delhi, DL',       category: 'Customer',        priority: 'Low',    notes: 'Active customer since 2023', agentId: 'u3', createdAt: ago(30), updatedAt: ago(5) },
  { id: 'c4', name: 'Meera Shah',    mobile: '7654321098', email: 'meera@example.com',   address: 'Ahmedabad, GJ',   category: 'Payment Pending', priority: 'High',   notes: 'Payment due this week', agentId: 'u2', createdAt: ago(15), updatedAt: ago(0) },
  { id: 'c5', name: 'Rajan Verma',   mobile: '6543210987', email: 'rajan@example.com',   address: 'Bangalore, KA',   category: 'New Lead',        priority: 'Medium', notes: 'Referral from Vijay', agentId: 'u3', createdAt: ago(3),  updatedAt: ago(0) },
  { id: 'c6', name: 'Anita Desai',   mobile: '9988776655', email: 'anita@example.com',   address: 'Chennai, TN',     category: 'Closed',          priority: 'Low',    notes: 'Deal closed successfully', agentId: 'u2', createdAt: ago(20), updatedAt: ago(4) },
  { id: 'c7', name: 'Deepak Joshi',  mobile: '9871234560', email: 'deepak@example.com',  address: 'Kolkata, WB',     category: 'Interested',      priority: 'High',   notes: 'Demo scheduled next week', agentId: 'u3', createdAt: ago(5),  updatedAt: ago(1) },
  { id: 'c8', name: 'Kavita Nair',   mobile: '8900123456', email: 'kavita@example.com',  address: 'Hyderabad, TS',   category: 'Follow-up',       priority: 'Medium', notes: 'Waiting for budget approval', agentId: 'u2', createdAt: ago(8), updatedAt: ago(0) },
];

function ago(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}
function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3_600_000).toISOString();
}
function hoursFromNow(h: number): string {
  return new Date(Date.now() + h * 3_600_000).toISOString();
}

export const SEED_CALLS: CallRecord[] = [
  { id: 'cl1', customerId: 'c1', customerName: 'Amit Patel',   customerMobile: '9876543210', type: 'Outgoing', duration: '3:45', durationSeconds: 225, agentName: 'Raj Sharma',   agentId: 'u2', remarks: 'Discussed pricing options',    createdAt: hoursAgo(2) },
  { id: 'cl2', customerId: 'c2', customerName: 'Sunita Rao',   customerMobile: '9123456789', type: 'Incoming', duration: '1:20', durationSeconds: 80,  agentName: 'Raj Sharma',   agentId: 'u2', remarks: 'She will call back tomorrow',  createdAt: hoursAgo(4) },
  { id: 'cl3', customerId: 'c3', customerName: 'Vijay Kumar',  customerMobile: '8765432109', type: 'Missed',   duration: '0:00', durationSeconds: 0,   agentName: 'Priya Singh',  agentId: 'u3', remarks: '',                             createdAt: hoursAgo(5) },
  { id: 'cl4', customerId: 'c4', customerName: 'Meera Shah',   customerMobile: '7654321098', type: 'Outgoing', duration: '5:10', durationSeconds: 310, agentName: 'Raj Sharma',   agentId: 'u2', remarks: 'Payment confirmed by end of week', createdAt: hoursAgo(1) },
  { id: 'cl5', customerId: 'c5', customerName: 'Rajan Verma',  customerMobile: '6543210987', type: 'Incoming', duration: '2:35', durationSeconds: 155, agentName: 'Priya Singh',  agentId: 'u3', remarks: 'Introduction call',              createdAt: hoursAgo(3) },
  { id: 'cl6', customerId: 'c1', customerName: 'Amit Patel',   customerMobile: '9876543210', type: 'Outgoing', duration: '4:00', durationSeconds: 240, agentName: 'Raj Sharma',   agentId: 'u2', remarks: 'Sent product brochure over email', createdAt: ago(1) },
  { id: 'cl7', customerId: 'c7', customerName: 'Deepak Joshi', customerMobile: '9871234560', type: 'Outgoing', duration: '2:15', durationSeconds: 135, agentName: 'Priya Singh',  agentId: 'u3', remarks: 'Confirmed demo for next week',     createdAt: ago(2) },
  { id: 'cl8', customerId: 'c8', customerName: 'Kavita Nair',  customerMobile: '8900123456', type: 'Missed',   duration: '0:00', durationSeconds: 0,   agentName: 'Raj Sharma',   agentId: 'u2', remarks: '',                             createdAt: hoursAgo(6) },
];

export const SEED_REMARKS: Remark[] = [
  { id: 'r1', customerId: 'c1', text: 'Customer interested in Enterprise plan. Needs more details on pricing.', agentName: 'Raj Sharma',  isCallNote: false, createdAt: ago(5) },
  { id: 'r2', customerId: 'c1', text: 'Sent brochure via email. Follow up next Monday.',                        agentName: 'Raj Sharma',  isCallNote: false, createdAt: ago(2) },
  { id: 'r3', customerId: 'c2', text: 'Called but no answer. Left voicemail.',                                  agentName: 'Raj Sharma',  isCallNote: true,  createdAt: ago(3) },
  { id: 'r4', customerId: 'c2', text: 'She called back — budget approved at ₹50,000.',                         agentName: 'Raj Sharma',  isCallNote: false, createdAt: ago(1) },
  { id: 'r5', customerId: 'c3', text: 'Long-term customer. Very satisfied with service.',                      agentName: 'Priya Singh', isCallNote: false, createdAt: ago(10) },
  { id: 'r6', customerId: 'c4', text: 'Payment due by Friday. Reminder sent on WhatsApp.',                     agentName: 'Raj Sharma',  isCallNote: false, createdAt: ago(1) },
];

export const SEED_REMINDERS: Reminder[] = [
  { id: 'rem1', customerId: 'c2', customerName: 'Sunita Rao',  customerMobile: '9123456789', dateTime: hoursFromNow(2),   notes: 'Follow-up on budget approval',   status: 'pending',   createdAt: ago(1) },
  { id: 'rem2', customerId: 'c4', customerName: 'Meera Shah',  customerMobile: '7654321098', dateTime: hoursFromNow(24),  notes: 'Collect payment',                status: 'pending',   createdAt: ago(0) },
  { id: 'rem3', customerId: 'c1', customerName: 'Amit Patel',  customerMobile: '9876543210', dateTime: hoursAgo(1),       notes: 'Send pricing proposal',          status: 'overdue',   createdAt: ago(2) },
  { id: 'rem4', customerId: 'c7', customerName: 'Deepak Joshi',customerMobile: '9871234560', dateTime: hoursFromNow(48),  notes: 'Confirm demo schedule',          status: 'pending',   createdAt: ago(1) },
];

// ─── Seed initialiser — call once at app start ────────────────────────────────

const SEED_KEY = '@netzone/seeded_v2';

export async function seedLocalStorageOnce(): Promise<void> {
  const done = await AsyncStorage.getItem(SEED_KEY);
  if (done) return;

  await Promise.all([
    write(K.customers, SEED_CUSTOMERS),
    write(K.calls,     SEED_CALLS),
    write(K.remarks,   SEED_REMARKS),
    write(K.reminders, SEED_REMINDERS),
  ]);
  await AsyncStorage.setItem(SEED_KEY, '1');
}

/** Force-reset seed data (used from Settings → Reset Data) */
export async function resetLocalStorage(): Promise<void> {
  await AsyncStorage.removeItem(SEED_KEY);
  await Promise.all([
    write(K.customers, SEED_CUSTOMERS),
    write(K.calls,     SEED_CALLS),
    write(K.remarks,   SEED_REMARKS),
    write(K.reminders, SEED_REMINDERS),
  ]);
  await AsyncStorage.setItem(SEED_KEY, '1');
}

// ─── Local Adapter ────────────────────────────────────────────────────────────

export const localAdapter: ICrmService = {
  // AUTH
  async login({ username, password, role, serverUrl }) {
    const u = DEMO_USERS.find(
      d => d.username === username && d.password === password && d.role === role,
    );
    if (!u) return { ok: false, error: 'Invalid credentials' };
    return {
      ok: true,
      user: { id: u.id, name: u.name, username: u.username, role: u.role, serverUrl },
    };
  },

  // CUSTOMERS
  async getCustomers()  { return read<Customer>(K.customers, []); },
  async addCustomer(data) {
    const rec: Customer = { ...data, id: uid(), createdAt: iso(), updatedAt: iso() };
    const all = await read<Customer>(K.customers, []);
    all.unshift(rec);
    await write(K.customers, all);
    return rec;
  },
  async updateCustomer(id, data) {
    const all = await read<Customer>(K.customers, []);
    const idx = all.findIndex(c => c.id === id);
    if (idx < 0) throw new Error('Customer not found');
    all[idx] = { ...all[idx], ...data, updatedAt: iso() };
    await write(K.customers, all);
    return all[idx];
  },
  async deleteCustomer(id) {
    const all = await read<Customer>(K.customers, []);
    await write(K.customers, all.filter(c => c.id !== id));
  },

  // CALLS
  async getCalls() { return read<CallRecord>(K.calls, []); },
  async addCall(data) {
    const rec: CallRecord = { ...data, id: uid(), createdAt: iso() };
    const all = await read<CallRecord>(K.calls, []);
    all.unshift(rec);
    await write(K.calls, all);
    return rec;
  },

  // REMARKS
  async getRemarks() { return read<Remark>(K.remarks, []); },
  async addRemark(data) {
    const rec: Remark = { ...data, id: uid(), createdAt: iso() };
    const all = await read<Remark>(K.remarks, []);
    all.unshift(rec);
    await write(K.remarks, all);
    return rec;
  },
  async updateRemark(id, text) {
    const all = await read<Remark>(K.remarks, []);
    const idx = all.findIndex(r => r.id === id);
    if (idx < 0) throw new Error('Remark not found');
    all[idx] = { ...all[idx], text };
    await write(K.remarks, all);
    return all[idx];
  },

  // REMINDERS
  async getReminders() { return read<Reminder>(K.reminders, []); },
  async addReminder(data) {
    const rec: Reminder = { ...data, id: uid(), createdAt: iso() };
    const all = await read<Reminder>(K.reminders, []);
    all.unshift(rec);
    await write(K.reminders, all);
    return rec;
  },
  async updateReminderStatus(id, status) {
    const all = await read<Reminder>(K.reminders, []);
    const idx = all.findIndex(r => r.id === id);
    if (idx < 0) throw new Error('Reminder not found');
    all[idx] = { ...all[idx], status };
    await write(K.reminders, all);
    return all[idx];
  },
  async deleteReminder(id) {
    const all = await read<Reminder>(K.reminders, []);
    await write(K.reminders, all.filter(r => r.id !== id));
  },
};
