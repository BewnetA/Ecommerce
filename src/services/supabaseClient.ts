import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables from Vite (can be set in Ecommerce/.env)
const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL?.trim();
const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY?.trim();

// Local storage override allowing users to enter keys directly in the browser if desired
const STORAGE_SUPABASE_URL = 'addisrepair_supabase_url';
const STORAGE_SUPABASE_KEY = 'addisrepair_supabase_anon_key';

export function getSupabaseCredentials(): { url: string; anonKey: string } {
  const localUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_SUPABASE_URL)?.trim() : null;
  const localKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_SUPABASE_KEY)?.trim() : null;

  return {
    url: localUrl || envUrl || '',
    anonKey: localKey || envKey || '',
  };
}

export function saveSupabaseCredentials(url: string, anonKey: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_SUPABASE_URL, url.trim());
    localStorage.setItem(STORAGE_SUPABASE_KEY, anonKey.trim());
  }
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseCredentials();
  return Boolean(url && anonKey && url.startsWith('http') && anonKey.length > 20);
}

let clientInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!clientInstance) {
    const { url, anonKey } = getSupabaseCredentials();
    clientInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  return clientInstance;
}

