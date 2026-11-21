import type {
  User,
  MemberProfile,
  Product,
  Conversation,
  Message,
  Notification,
  ReportedItem,
  ActivityLog,
} from '../types';

import {
  INITIAL_USERS,
  INITIAL_MEMBER_PROFILES,
  INITIAL_PRODUCTS,
  INITIAL_CONVERSATIONS,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS,
  INITIAL_REPORTED_ITEMS,
  INITIAL_ACTIVITY_LOGS,
} from '../data/seedData';
import { normalizeMemberStatus, normalizeRole } from '../utils/members';
import { isSupabaseConfigured } from './supabaseClient';

// v3: unified-member data shape (one member account, no buyer/seller split).
// Older v2 data used separate buyer and seller records and is not reused.
const STORAGE_KEY = 'agora_marketplace_data_v3';
const CURRENT_USER_KEY = 'agora_marketplace_current_user_v2';

export interface StorageSchema {
  users: User[];
  memberProfiles: MemberProfile[];
  products: Product[];
  conversations: Conversation[];
  messages: Message[];
  notifications: Notification[];
  reportedItems: ReportedItem[];
  activityLogs: ActivityLog[];
}

function getInitialState(): StorageSchema {
  return {
    users: [...INITIAL_USERS],
    memberProfiles: [...INITIAL_MEMBER_PROFILES],
    products: [...INITIAL_PRODUCTS],
    conversations: [...INITIAL_CONVERSATIONS],
    messages: [...INITIAL_MESSAGES],
    notifications: [...INITIAL_NOTIFICATIONS],
    reportedItems: [...INITIAL_REPORTED_ITEMS],
    activityLogs: [...INITIAL_ACTIVITY_LOGS],
  };
}

export function loadStorageData(): StorageSchema {
  // Safety net: when a Supabase project is configured, no code path may read
  // or write the local demo data.
  if (isSupabaseConfigured()) {
    throw new Error('Local demo data is disabled because Supabase is configured.');
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialState();
      saveStorageData(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as StorageSchema;
    // Basic verification of schema integrity
    if (!parsed.products || !parsed.users || !parsed.memberProfiles) {
      const reset = getInitialState();
      saveStorageData(reset);
      return reset;
    }
    return parsed;
  } catch (err) {
    console.error('Failed to load storage data, initializing defaults', err);
    const initial = getInitialState();
    saveStorageData(initial);
    return initial;
  }
}

export function saveStorageData(data: StorageSchema): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to save to localStorage', err);
  }
}

export function resetStorageToDefaults(): StorageSchema {
  const defaults = getInitialState();
  saveStorageData(defaults);
  return defaults;
}

/**
 * Reads the cached signed-in user. Sessions cached by the previous
 * buyer/seller version are normalized; the cache can never grant approval on
 * its own — the stored record (or backend) is the source of truth.
 */
export function getStoredCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as User;
    const role = normalizeRole(cached.role);
    // With Supabase the cache is only a session hint; authApi re-reads the
    // account from Supabase. Demo data is never consulted.
    if (isSupabaseConfigured()) {
      return {
        ...cached,
        role,
        status:
          role === 'admin'
            ? cached.status === 'suspended'
              ? 'suspended'
              : 'approved'
            : normalizeMemberStatus(cached.status),
      };
    }
    const data = loadStorageData();
    const stored = data.users.find((u) => u.id === cached.id);
    if (stored) {
      return { ...cached, ...stored, role: normalizeRole(stored.role) };
    }
    return {
      ...cached,
      role,
      status: role === 'admin' ? 'approved' : normalizeMemberStatus(cached.status),
    };
  } catch {
    return null;
  }
}

export function setStoredCurrentUser(user: User | null): void {
  try {
    if (!user) {
      localStorage.removeItem(CURRENT_USER_KEY);
    } else {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    }
  } catch (err) {
    console.error('Failed to update current user in storage', err);
  }
}

export function simulateLatency<T>(result: T, delayMs = 150): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(result), delayMs));
}
