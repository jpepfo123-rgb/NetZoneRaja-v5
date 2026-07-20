/**
 * Shared API types for Net Zone CRM Dialer
 * Updated to match PostgreSQL schema
 */

import type { Category, CallType, Priority } from '@/constants/colors';
export type { Category, CallType, Priority };

// ─── Domain Models ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  username: string;
  role: 'admin' | 'agent';
  serverUrl: string;
  phone?: string;
}

export type CustomerStatus = 'Active' | 'Closed';

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  alternate_number?: string;
  company?: string;
  email: string;
  address: string;
  city?: string;
  category: Category;
  priority: Priority;
  notes: string;
  follow_up_date?: string;
  agentId: string;
  agent_id?: string | number;
  agent_name?: string;
  total_calls?: number;
  last_call_at?: string;
  // Status: Active or Closed
  status?: CustomerStatus;
  close_date?: string;
  close_remark?: string;
  close_by?: string;
  createdAt: string;
  updatedAt: string;
  // DB field aliases
  created_at?: string;
  updated_at?: string;
}

export interface Remark {
  id: string;
  customerId: string;
  customer_id?: string | number;
  text: string;
  agentName: string;
  agent_name?: string;
  isCallNote: boolean;
  is_call_note?: boolean;
  createdAt: string;
  created_at?: string;
}

export interface CallRecord {
  id: string;
  customerId: string;
  customer_id?: string | number;
  customerName: string;
  customer_name?: string;
  customerMobile: string;
  customer_mobile?: string;
  type: CallType;
  duration: string;
  durationSeconds: number;
  duration_seconds?: number;
  agentName: string;
  agent_name?: string;
  agentId: string;
  agent_id?: string | number;
  remarks: string;
  phoneNumber?: string;
  phone_number?: string;
  category?: string;
  follow_up_date?: string;
  reminder_date?: string;
  device_id?: string;
  createdAt: string;
  created_at?: string;
}

export type ReminderType = 'Call Back' | 'Meeting' | 'Follow-up' | 'Payment Due' | 'Other';

export interface Reminder {
  id: string;
  customerId: string;
  customer_id?: string | number;
  customerName: string;
  customer_name?: string;
  customerMobile: string;
  customer_mobile?: string;
  dateTime: string;
  date_time?: string;
  notes: string;
  reminder_type?: ReminderType;
  status: 'pending' | 'completed' | 'overdue';
  agentId?: string | number;
  createdAt: string;
  created_at?: string;
}

export interface Agent {
  id: string | number;
  name: string;
  username: string;
  role: 'admin' | 'agent';
  phone?: string;
  active?: boolean;
  totalCalls: number;
  todayCalls: number;
  total_customers?: number;
  calls_today?: number;
  isActive: boolean;
}

export interface DashboardStats {
  today_calls: number;
  missed_today: number;
  total_customers: number;
  pending_follow_ups: number;
  today_reminders: number;
  active_agents: number;
  calls_by_type: { incoming: number; outgoing: number; missed: number };
  recent_calls: CallRecord[];
}

// ─── API Shapes ───────────────────────────────────────────────────────────────

export interface LoginRequest {
  username: string;
  password: string;
  role: 'admin' | 'agent';
}

export interface LoginResponse {
  ok: boolean;
  user?: User;
  token?: string;
  error?: string;
}

// ─── Offline Queue ────────────────────────────────────────────────────────────

export interface OfflineCallRecord {
  id: string; // local temp id
  data: Omit<CallRecord, 'id' | 'createdAt'>;
  timestamp: number;
  synced: boolean;
}

// ─── Service Interface ────────────────────────────────────────────────────────

export interface ICrmService {
  login(req: LoginRequest & { serverUrl: string }): Promise<LoginResponse>;
  getCustomers(): Promise<Customer[]>;
  addCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer>;
  updateCustomer(id: string, data: Partial<Omit<Customer, 'id' | 'createdAt'>>): Promise<Customer>;
  deleteCustomer(id: string): Promise<void>;
  getCalls(): Promise<CallRecord[]>;
  addCall(data: Omit<CallRecord, 'id' | 'createdAt'>): Promise<CallRecord>;
  getRemarks(): Promise<Remark[]>;
  addRemark(data: Omit<Remark, 'id' | 'createdAt'>): Promise<Remark>;
  updateRemark(id: string, text: string): Promise<Remark>;
  getReminders(): Promise<Reminder[]>;
  addReminder(data: Omit<Reminder, 'id' | 'createdAt'>): Promise<Reminder>;
  updateReminderStatus(id: string, status: Reminder['status']): Promise<Reminder>;
  deleteReminder(id: string): Promise<void>;
  getAgents?(): Promise<Agent[]>;
}
