import type {
  User,
  BuyerProfile,
  SellerProfile,
  Category,
  Product,
  Conversation,
  Message,
  Notification,
  ReportedItem,
  ActivityLog,
} from '../types';

import {
  INITIAL_CATEGORIES,
  INITIAL_USERS,
  INITIAL_BUYER_PROFILES,
  INITIAL_SELLER_PROFILES,
  INITIAL_PRODUCTS,
  INITIAL_CONVERSATIONS,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS,
  INITIAL_REPORTED_ITEMS,
  INITIAL_ACTIVITY_LOGS,
} from '../data/seedData';

const STORAGE_KEY = 'agora_marketplace_data_v2';
const CURRENT_USER_KEY = 'agora_marketplace_current_user_v2';

export interface StorageSchema {
  categories: Category[];
  users: User[];
  buyerProfiles: BuyerProfile[];
  sellerProfiles: SellerProfile[];
  products: Product[];
  conversations: Conversation[];
  messages: Message[];
  notifications: Notification[];
  reportedItems: ReportedItem[];
  activityLogs: ActivityLog[];
}

function getInitialState(): StorageSchema {
  return {
    categories: [...INITIAL_CATEGORIES],
    users: [...INITIAL_USERS],
    buyerProfiles: [...INITIAL_BUYER_PROFILES],
    sellerProfiles: [...INITIAL_SELLER_PROFILES],
    products: [...INITIAL_PRODUCTS],
    conversations: [...INITIAL_CONVERSATIONS],
    messages: [...INITIAL_MESSAGES],
    notifications: [...INITIAL_NOTIFICATIONS],
    reportedItems: [...INITIAL_REPORTED_ITEMS],
    activityLogs: [...INITIAL_ACTIVITY_LOGS],
  };
}

export function loadStorageData(): StorageSchema {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = getInitialState();
      saveStorageData(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as StorageSchema;
    // Basic verification of schema integrity
    if (!parsed.products || !parsed.users || !parsed.categories) {
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

export function getStoredCurrentUser(): User | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
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
