/**
 * AuthContext — handles login/logout, persists session, and configures CrmService.
 *
 * Login flow:
 *  1. If serverUrl looks like a real URL → ping the server first.
 *  2. If server responds → use remote adapter (REST API).
 *  3. If server is unreachable OR no URL → use local adapter (AsyncStorage / demo).
 *  4. On success → persist User to AsyncStorage and configure CrmService mode.
 */

import React, {
  createContext, useCallback, useContext, useEffect, useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { CrmService } from '@/services/crmService';
import { seedLocalStorageOnce } from '@/services/localAdapter';
import { cacheAuthToken } from '@/modules/phone-state';

export type UserRole = 'admin' | 'agent';

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  serverUrl: string;
  /** Whether this session is syncing with a remote server */
  isRemote: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isRemote: boolean;
  login: (
    username: string,
    password: string,
    role: UserRole,
    serverUrl: string,
  ) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const USER_KEY = '@netzone_user';

/** Returns true if the URL looks like a real server (not localhost placeholder) */
function looksLikeServer(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed || trimmed.length < 10) return false;
  // Skip common placeholder values
  const placeholders = ['192.168.1.1', '0.0.0.0', 'localhost', '127.0.0.1'];
  return !placeholders.some(p => trimmed.includes(p));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Restore session on mount ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        await seedLocalStorageOnce();
        const raw = await AsyncStorage.getItem(USER_KEY);
        if (raw) {
          const saved: User = JSON.parse(raw);
          setUser(saved);
          // Restore CrmService mode
          if (saved.isRemote && saved.serverUrl) {
            CrmService.configure({ mode: 'remote', serverUrl: saved.serverUrl });
          } else {
            CrmService.configure({ mode: 'local' });
          }
        }
      } catch {
        /* ignore */
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (
    username: string,
    password: string,
    role: UserRole,
    serverUrl: string,
  ): Promise<boolean> => {
    const useRemote = looksLikeServer(serverUrl) &&
      await CrmService.pingServer(serverUrl);

    if (useRemote) {
      CrmService.configure({ mode: 'remote', serverUrl });
    } else {
      CrmService.configure({ mode: 'local' });
    }

    const result = await CrmService.login({ username, password, role, serverUrl });
    if (!result.ok || !result.user) return false;

    const sessionUser: User = {
      id: result.user.id,
      name: result.user.name,
      username: result.user.username,
      role: result.user.role,
      serverUrl,
      isRemote: useRemote,
    };

    setUser(sessionUser);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(sessionUser));

    // Cache token + URL in SharedPreferences so native modules (CallSyncService,
    // IncomingCallActivity) can make API calls without the RN bridge.
    if (useRemote && result.token && Platform.OS === 'android') {
      await cacheAuthToken(result.token, serverUrl).catch(() => {});
    }

    return true;
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await AsyncStorage.removeItem(USER_KEY);
    CrmService.configure({ mode: 'local' });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      isRemote: user?.isRemote ?? false,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
