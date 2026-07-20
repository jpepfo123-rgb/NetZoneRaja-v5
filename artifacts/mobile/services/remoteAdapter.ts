/**
 * Remote Adapter — communicates with the Node.js / PostgreSQL REST API.
 * Handles snake_case → camelCase field mapping automatically.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Agent, Customer, CallRecord, Remark, Reminder,
  ICrmService, LoginRequest, LoginResponse,
} from './types';

const TOKEN_KEY = '@netzone/auth_token';
const BASE_KEY  = '@netzone/server_url';

// ─── Field normalizers ────────────────────────────────────────────────────────

function normalizeCustomer(c: any): Customer {
  return {
    id: String(c.id),
    name: c.name,
    mobile: c.mobile,
    alternate_number: c.alternate_number ?? undefined,
    company: c.company ?? undefined,
    email: c.email ?? '',
    address: c.address ?? '',
    city: c.city ?? undefined,
    category: c.category ?? 'New Lead',
    priority: c.priority ?? 'Medium',
    notes: c.notes ?? '',
    follow_up_date: c.follow_up_date ?? undefined,
    agentId: String(c.agent_id ?? c.agentId ?? ''),
    agent_id: c.agent_id,
    agent_name: c.agent_name,
    total_calls: c.total_calls ? parseInt(c.total_calls) : 0,
    last_call_at: c.last_call_at,
    status: c.status ?? 'Active',
    close_date: c.close_date ?? undefined,
    close_remark: c.close_remark ?? undefined,
    close_by: c.close_by ?? undefined,
    createdAt: c.created_at ?? c.createdAt ?? new Date().toISOString(),
    updatedAt: c.updated_at ?? c.updatedAt ?? new Date().toISOString(),
  };
}

function normalizeCall(c: any): CallRecord {
  // customer_id may be NULL when a call was logged before the customer existed.
  // matched_customer_id comes from the phone-number fallback JOIN in GET /api/calls.
  const resolvedCustomerId = String(
    c.customer_id ?? c.matched_customer_id ?? c.customerId ?? ''
  );
  return {
    id: String(c.id),
    customerId: resolvedCustomerId,
    customerName:
      c.customer_name_resolved ?? c.customer_name ?? c.customerName ?? c.customer_display ?? '',
    customerMobile:
      c.customer_mobile_resolved ?? c.customer_mobile ?? c.customerMobile ?? c.phone_number ?? '',
    type: c.type,
    duration: c.duration ?? '0:00',
    durationSeconds: c.duration_seconds ?? c.durationSeconds ?? 0,
    agentName: c.agent_name ?? c.agentName ?? '',
    agentId: String(c.agent_id ?? c.agentId ?? ''),
    remarks: c.remarks ?? '',
    phoneNumber: c.phone_number ?? c.phoneNumber,
    category: c.category,
    follow_up_date: c.follow_up_date,
    reminder_date: c.reminder_date,
    device_id: c.device_id,
    createdAt: c.created_at ?? c.createdAt ?? new Date().toISOString(),
    matchedCustomerId: c.matched_customer_id ? String(c.matched_customer_id) : undefined,
    customerCategoryLive: c.customer_category_live ?? undefined,
    customerNotes: c.customer_notes ?? undefined,
  };
}

function normalizeRemark(r: any): Remark {
  return {
    id: String(r.id),
    customerId: String(r.customer_id ?? r.customerId ?? ''),
    text: r.text,
    agentName: r.agent_name ?? r.agentName ?? '',
    isCallNote: r.is_call_note ?? r.isCallNote ?? false,
    createdAt: r.created_at ?? r.createdAt ?? new Date().toISOString(),
  };
}

function normalizeReminder(r: any): Reminder {
  return {
    id: String(r.id),
    customerId: String(r.customer_id ?? r.customerId ?? ''),
    customerName: r.customer_name ?? r.customer_name_resolved ?? r.customerName ?? '',
    customerMobile: r.customer_mobile ?? r.customer_mobile_resolved ?? r.customerMobile ?? '',
    dateTime: r.date_time ?? r.dateTime ?? '',
    notes: r.notes ?? '',
    reminder_type: r.reminder_type ?? undefined,
    status: r.status ?? 'pending',
    createdAt: r.created_at ?? r.createdAt ?? new Date().toISOString(),
  };
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function http<T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}/api${path}`, {
    ...options,
    headers,
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ─── Builder ──────────────────────────────────────────────────────────────────

export function createRemoteAdapter(baseUrl: string): ICrmService {
  const base = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');

  async function get<T>(path: string): Promise<T> {
    return http<T>(base, path, { method: 'GET' });
  }
  async function post<T>(path: string, body: unknown): Promise<T> {
    return http<T>(base, path, { method: 'POST', body: JSON.stringify(body) });
  }
  async function put<T>(path: string, body: unknown): Promise<T> {
    return http<T>(base, path, { method: 'PUT', body: JSON.stringify(body) });
  }
  async function patch<T>(path: string, body: unknown): Promise<T> {
    return http<T>(base, path, { method: 'PATCH', body: JSON.stringify(body) });
  }
  async function del(path: string): Promise<void> {
    await http<void>(base, path, { method: 'DELETE' });
  }

  return {
    async login({ username, password, role }) {
      try {
        const res = await post<LoginResponse>('/auth/login', { username, password, role });
        if (res.ok && res.token) {
          await AsyncStorage.setItem(TOKEN_KEY, res.token);
          await AsyncStorage.setItem(BASE_KEY, base);
        }
        return res;
      } catch (e: any) {
        return { ok: false, error: e.message };
      }
    },

    async getCustomers() {
      const data = await get<any[]>('/customers');
      return data.map(normalizeCustomer);
    },
    async addCustomer(d) {
      const data = await post<any>('/customers', {
        name: d.name, mobile: d.mobile,
        alternate_number: d.alternate_number,
        company: d.company, email: d.email,
        address: d.address, city: d.city,
        category: d.category, priority: d.priority,
        notes: d.notes, follow_up_date: d.follow_up_date,
        agent_id: d.agent_id ?? d.agentId,
      });
      return normalizeCustomer(data);
    },
    async updateCustomer(id, d) {
      // Use PATCH for partial updates (status, close fields, etc.)
      const data = await patch<any>(`/customers/${id}`, {
        name: d.name, mobile: d.mobile,
        alternate_number: d.alternate_number,
        company: d.company, email: d.email,
        address: d.address, city: d.city,
        category: d.category, priority: d.priority,
        notes: d.notes, follow_up_date: d.follow_up_date,
        status:       d.status,
        close_date:   d.close_date,
        close_remark: d.close_remark,
        close_by:     d.close_by,
      });
      return normalizeCustomer(data);
    },
    async deleteCustomer(id) { return del(`/customers/${id}`); },

    async getCalls() {
      const data = await get<any[]>('/calls');
      return data.map(normalizeCall);
    },
    async addCall(d) {
      const data = await post<any>('/calls', {
        customer_id: d.customer_id ?? d.customerId,
        customer_name: d.customerName,
        customer_mobile: d.customerMobile,
        agent_id: d.agent_id ?? d.agentId,
        agent_name: d.agentName,
        type: d.type,
        duration: d.duration,
        duration_seconds: d.durationSeconds ?? d.duration_seconds,
        phone_number: d.phoneNumber ?? d.phone_number ?? d.customerMobile,
        remarks: d.remarks,
        category: d.category,
        follow_up_date: d.follow_up_date,
        reminder_date: d.reminder_date,
        device_id: d.device_id,
      });
      return normalizeCall(data);
    },

    async getRemarks() {
      const data = await get<any[]>('/remarks');
      return data.map(normalizeRemark);
    },
    async addRemark(d) {
      const data = await post<any>('/remarks', {
        customer_id: d.customer_id ?? d.customerId,
        text: d.text,
        is_call_note: d.isCallNote ?? d.is_call_note,
      });
      return normalizeRemark(data);
    },
    async updateRemark(id, text) {
      const data = await patch<any>(`/remarks/${id}`, { text });
      return normalizeRemark(data);
    },

    async getReminders() {
      const data = await get<any[]>('/reminders');
      return data.map(normalizeReminder);
    },
    async addReminder(d) {
      const data = await post<any>('/reminders', {
        customer_id:   d.customer_id ?? d.customerId,
        date_time:     d.date_time ?? d.dateTime,
        notes:         d.notes,
        reminder_type: d.reminder_type,
      });
      return normalizeReminder(data);
    },
    async updateReminderStatus(id, status) {
      const data = await patch<any>(`/reminders/${id}/status`, { status });
      return normalizeReminder(data);
    },
    async deleteReminder(id) { return del(`/reminders/${id}`); },

    async getAgents() {
      const data = await get<any[]>('/agents');
      return data.map((a: any): Agent => ({
        id: String(a.id),
        name: a.name,
        username: a.username,
        role: a.role,
        isActive: a.is_active ?? a.isActive ?? true,
        totalCalls: a.total_calls ?? a.totalCalls ?? 0,
        todayCalls: a.today_calls ?? a.todayCalls ?? 0,
      }));
    },
  };
}

/** Clears saved auth token (called on logout) */
export async function clearRemoteToken(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(TOKEN_KEY),
    AsyncStorage.removeItem(BASE_KEY),
  ]);
}

/** Tests whether the server URL is reachable */
export async function pingServer(baseUrl: string): Promise<boolean> {
  try {
    const cleanBase = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
    const res = await fetch(`${cleanBase}/api/health`, {
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Bulk sync offline calls to server */
export async function bulkSyncCalls(baseUrl: string, calls: any[]): Promise<number> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    const cleanBase = baseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
    const res = await fetch(`${cleanBase}/api/calls/bulk-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ calls }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.synced ?? 0;
  } catch {
    return 0;
  }
}
