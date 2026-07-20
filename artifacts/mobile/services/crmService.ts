/**
 * CRM Service Factory
 *
 * Usage:
 *   import { CrmService } from '@/services/crmService';
 *
 *   // After login with a server URL → switches to remote + falls back to local
 *   CrmService.configure({ mode: 'remote', serverUrl: 'http://192.168.1.1:3000' });
 *
 *   // Offline / demo mode
 *   CrmService.configure({ mode: 'local' });
 *
 *   const customers = await CrmService.getCustomers();
 *
 * The active adapter is a module-level singleton so any part of the app can
 * import and use it without prop-drilling.
 *
 * When mode is 'remote', every call first tries the remote adapter.
 * If it throws (network error, timeout, etc.) the local adapter is used as
 * a transparent fallback, keeping the app functional offline.
 */

import { localAdapter } from './localAdapter';
import { createRemoteAdapter, pingServer } from './remoteAdapter';
import type { ICrmService } from './types';

type ServiceMode = 'local' | 'remote';

interface Config {
  mode: ServiceMode;
  serverUrl?: string;
}

let _mode: ServiceMode = 'local';
let _remote: ICrmService | null = null;

/** Configure the service layer (call after login or settings change) */
function configure(cfg: Config): void {
  _mode = cfg.mode;
  _remote = cfg.mode === 'remote' && cfg.serverUrl
    ? createRemoteAdapter(cfg.serverUrl)
    : null;
}

/** Current mode */
function getMode(): ServiceMode {
  return _mode;
}

/** Wraps every method: tries remote first, falls back to local transparently */
function withFallback<A extends unknown[], R>(
  fn: (adapter: ICrmService, ...args: A) => Promise<R>,
  ...args: A
): Promise<R> {
  if (_mode === 'remote' && _remote) {
    return (fn(_remote, ...args) as Promise<R>).catch(() =>
      fn(localAdapter, ...args) as Promise<R>,
    );
  }
  return fn(localAdapter, ...args) as Promise<R>;
}

/** The unified service object — use this everywhere in the app */
export const CrmService: ICrmService & {
  configure: typeof configure;
  getMode: typeof getMode;
  pingServer: typeof pingServer;
} = {
  configure,
  getMode,
  pingServer,

  login:   (req)     => withFallback((a) => a.login(req)),
  getCustomers:  ()  => withFallback((a) => a.getCustomers()),
  addCustomer:   (d) => withFallback((a) => a.addCustomer(d)),
  updateCustomer:(id, d) => withFallback((a) => a.updateCustomer(id, d)),
  deleteCustomer:(id)=> withFallback((a) => a.deleteCustomer(id)),
  getCalls:      ()  => withFallback((a) => a.getCalls()),
  addCall:       (d) => withFallback((a) => a.addCall(d)),
  getRemarks:    ()  => withFallback((a) => a.getRemarks()),
  addRemark:     (d) => withFallback((a) => a.addRemark(d)),
  updateRemark: (id, t) => withFallback((a) => a.updateRemark(id, t)),
  getReminders:  ()  => withFallback((a) => a.getReminders()),
  addReminder:   (d) => withFallback((a) => a.addReminder(d)),
  updateReminderStatus: (id, s) => withFallback((a) => a.updateReminderStatus(id, s)),
  deleteReminder:(id)=> withFallback((a) => a.deleteReminder(id)),
};
