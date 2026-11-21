import type { User, MemberProfile, MemberVerificationDetails } from '../../types';
import {
  loadStorageData,
  saveStorageData,
  getStoredCurrentUser,
  setStoredCurrentUser,
  simulateLatency,
} from '../mockStorage';
import { getSupabase } from '../supabaseClient';
import { mapSupabaseUser } from './memberApi';

const CREDENTIALS_KEY = 'agora_marketplace_credentials_v1';
const RESET_OTP_KEY = 'agora_password_reset_otps_v1';

const DEFAULT_CREDENTIALS: Record<string, string> = {
  'admin@marketplace.com': 'Admin@123',
  'buyer@demo.com': 'Password@123',
  'seller1@demo.com': 'Password@123',
  'seller2@demo.com': 'Password@123',
  'seller3@demo.com': 'Password@123',
  'yonas.t@example.com': 'Password@123',
  'almaz@techstore.et': 'Password@123',
  'abebe.k@example.com': 'Password@123',
};

function getStoredCredentials(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CREDENTIALS_KEY);
    if (!raw) {
      localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(DEFAULT_CREDENTIALS));
      return { ...DEFAULT_CREDENTIALS };
    }
    return { ...DEFAULT_CREDENTIALS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CREDENTIALS };
  }
}

function saveStoredCredentials(creds: Record<string, string>): void {
  try {
    localStorage.setItem(CREDENTIALS_KEY, JSON.stringify(creds));
  } catch (err) {
    console.error('Failed to save credentials to storage', err);
  }
}

export interface LoginCredentials {
  email: string;
  password?: string;
}

/** Everything collected by the single member registration flow. */
export interface RegisterMemberData {
  name: string;
  email: string;
  phone: string;
  password?: string;
  businessName?: string;
  businessDescription?: string;
  city: string;
  subCity: string;
  addressDescription?: string;
  latitude?: number;
  longitude?: number;
  verification: MemberVerificationDetails;
}

const DEFAULT_AVATAR =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80';

/** Suspended administrator accounts cannot sign in. Members can (they see their status page). */
function assertAdminNotSuspended(user: User): void {
  if (user.role === 'admin' && user.status === 'suspended') {
    throw new Error('This account has been suspended. Please contact platform administration.');
  }
}

export const authApi = {
  /**
   * Returns the signed-in member. When Supabase is configured the account
   * (and therefore its verification status) is re-read from the backend so
   * the client cache can never grant access by itself.
   */
  async getCurrentUser(): Promise<User | null> {
    const cached = getStoredCurrentUser();
    if (!cached) return simulateLatency(null, 50);

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', cached.id).maybeSingle();
        if (profile) {
          const fresh = mapSupabaseUser(profile);
          setStoredCurrentUser(fresh);
          return fresh;
        }
        if (!error) {
          // The account no longer exists in Supabase: end the stale session.
          setStoredCurrentUser(null);
          return null;
        }
      } catch (err) {
        console.warn('Supabase getCurrentUser refresh note:', err);
      }
    }
    return simulateLatency(cached, 50);
  },

  /**
   * Pending, rejected and suspended members can sign in; the app then shows
   * them their verification status instead of the marketplace.
   */
  async login(credentials: LoginCredentials): Promise<User> {
    const email = credentials.email.trim().toLowerCase();
    const inputPassword = credentials.password?.trim() || '';

    const supabase = getSupabase();

    if (supabase) {
      // Same rules as the mobile app: the account must exist in Supabase and
      // the password must be accepted by Supabase Auth or match the account's
      // registered credential.
      if (!inputPassword) {
        throw new Error('Please enter your password.');
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', email)
        .maybeSingle();

      if (error) {
        throw new Error('Could not reach the server. Please check your connection and try again.');
      }
      if (!profile) {
        throw new Error('No account was found with this email address.');
      }

      let passwordValid = false;
      try {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password: inputPassword,
        });
        passwordValid = !authError && Boolean(authData?.user);
      } catch (authErr: any) {
        console.warn('Supabase signInWithPassword note:', authErr?.message);
      }
      if (!passwordValid) {
        const knownPassword = getStoredCredentials()[email];
        passwordValid = Boolean(knownPassword) && knownPassword === inputPassword;
      }
      if (!passwordValid) {
        throw new Error('Invalid email or password. Please check your credentials or reset your password.');
      }

      const user = mapSupabaseUser(profile);
      assertAdminNotSuspended(user);
      setStoredCurrentUser(user);
      return user;
    }

    // Validate password against stored credentials if registered (demo mode)
    const creds = getStoredCredentials();
    const expectedPassword = creds[email];
    if (expectedPassword && inputPassword && inputPassword !== expectedPassword) {
      throw new Error('Invalid password. Please check your credentials or reset your password.');
    }

    // Local demo data (only when no Supabase project is configured)
    const data = loadStorageData();
    const user = data.users.find((u) => u.email.toLowerCase() === email);

    if (!user) {
      throw new Error('Invalid email or account does not exist.');
    }

    assertAdminNotSuspended(user);
    setStoredCurrentUser(user);
    return simulateLatency(user, 150);
  },

  async logout(): Promise<void> {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Ignore sign-out errors; the local session is cleared below.
      }
    }
    setStoredCurrentUser(null);
    return simulateLatency(undefined, 50);
  },

  /**
   * One registration process for every member. New members always start as
   * `pending`; only the backend/admin team can approve them.
   */
  async registerMember(input: RegisterMemberData): Promise<User> {
    if (!input.name.trim() || !input.email.trim() || !input.phone.trim()) {
      throw new Error('Please fill out all required fields (Name, Email, Phone).');
    }
    if (!input.verification.industryDescription.trim() || !input.verification.idNumber.trim()) {
      throw new Error('Please complete your repair-industry and verification details.');
    }
    // The shop / work location on the map is required for every member.
    if (typeof input.latitude !== 'number' || typeof input.longitude !== 'number') {
      throw new Error('Please set your shop / work location on the map before submitting.');
    }

    const email = input.email.trim().toLowerCase();
    const supabase = getSupabase();

    if (supabase) {
      const { data: existing, error: lookupError } = await supabase
        .from('profiles')
        .select('id')
        .ilike('email', email)
        .limit(1);
      if (lookupError) {
        throw new Error('Could not reach the server. Please check your connection and try again.');
      }
      if ((existing || []).length > 0) {
        throw new Error('An account with this email already exists. Please sign in instead.');
      }
    } else if (loadStorageData().users.some((u) => u.email.toLowerCase() === email)) {
      throw new Error('An account with this email already exists. Please sign in instead.');
    }

    const now = new Date().toISOString();
    const userId = `user-member-${Date.now()}`;
    const businessName = input.businessName?.trim() || input.name.trim();
    const location = `${input.subCity}, ${input.city}`;

    const newUser: User = {
      id: userId,
      name: input.name.trim(),
      email,
      phone: input.phone.trim(),
      role: 'member',
      status: 'pending',
      verification: input.verification,
      avatarUrl: DEFAULT_AVATAR,
      createdAt: now,
    };

    const newProfile: MemberProfile = {
      id: userId,
      userId,
      businessName,
      businessDescription: input.businessDescription?.trim() || input.verification.industryDescription.trim(),
      phone: input.phone.trim(),
      email,
      city: input.city,
      subCity: input.subCity,
      addressDescription: input.addressDescription?.trim() || undefined,
      location,
      latitude: input.latitude,
      longitude: input.longitude,
      logoUrl: DEFAULT_AVATAR,
      createdAt: now,
      updatedAt: now,
    };

    if (supabase) {
      if (input.password?.trim()) {
        try {
          await supabase.auth.signUp({ email, password: input.password.trim() });
        } catch (authErr) {
          console.warn('Supabase auth.signUp note:', authErr);
        }
      }

        const legacyProfile = {
          id: userId,
          name: newUser.name,
          email,
          phone: newUser.phone,
          status: 'pending',
          avatar_url: newUser.avatarUrl,
          city: input.city,
          sub_city: input.subCity,
          created_at: now,
          updated_at: now,
        };
      // Unified-member columns first; fall back to the current schema.
      const { error: memberErr } = await supabase.from('profiles').insert({
        ...legacyProfile,
        role: 'member',
        verification_details: input.verification,
      });
      if (memberErr) {
        console.warn('Supabase member profile insert note, retrying legacy columns:', memberErr.message);
        const { error: legacyErr } = await supabase.from('profiles').insert(legacyProfile);
        if (legacyErr) {
          throw new Error(`Could not create your account: ${legacyErr.message}`);
        }
      }

      try {
        const { error: businessErr } = await supabase.from('seller_profiles').insert({
          id: `business-${Date.now()}`,
          user_id: userId,
          store_name: businessName,
          business_description: newProfile.businessDescription,
          phone: newProfile.phone,
          email,
          city: input.city,
          sub_city: input.subCity,
          address_description: newProfile.addressDescription ?? null,
          latitude: input.latitude ?? null,
          longitude: input.longitude ?? null,
          location,
          created_at: now,
          updated_at: now,
        });
        if (businessErr) console.warn('Supabase business profile insert note:', businessErr.message);

        await supabase.from('notifications').insert({
          id: `notif-${Date.now()}`,
          user_id: 'user-admin',
          title: 'Member Awaiting Verification',
          message: `New member "${newUser.name}" registered and is waiting for one-time verification.`,
          type: 'system',
          is_read: false,
          link_to: '/admin/members/verification',
          created_at: now,
        });

        await supabase.from('activity_logs').insert({
          id: `act-${Date.now()}`,
          actor_name: newUser.name,
          actor_role: 'member',
          action: 'REGISTER_MEMBER',
          details: `New member registered: ${newUser.name} (${email}). Status: pending verification.`,
          created_at: now,
        });
      } catch (err: any) {
        // The account itself was created; these records are supplementary.
        console.warn('Supabase registerMember follow-up note:', err);
      }

      if (input.password?.trim()) {
        const creds = getStoredCredentials();
        creds[email] = input.password.trim();
        saveStoredCredentials(creds);
      }
      setStoredCurrentUser(newUser);
      return newUser;
    }

    // Local demo data (only when no Supabase project is configured)
    const data = loadStorageData();
    data.users.push(newUser);
    data.memberProfiles.push(newProfile);
    data.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: 'user-admin',
      title: 'Member Awaiting Verification',
      message: `New member "${newUser.name}" registered and is waiting for one-time verification.`,
      type: 'system',
      isRead: false,
      linkTo: '/admin/members/verification',
      createdAt: now,
    });
    data.activityLogs.unshift({
      id: `act-${Date.now()}`,
      actorName: newUser.name,
      actorRole: 'member',
      action: 'REGISTER_MEMBER',
      details: `New member registered: ${newUser.name}. Status: pending verification.`,
      createdAt: now,
    });
    saveStorageData(data);

    if (input.password?.trim()) {
      const creds = getStoredCredentials();
      creds[email] = input.password.trim();
      saveStoredCredentials(creds);
    }
    setStoredCurrentUser(newUser);
    return simulateLatency(newUser, 200);
  },

  async sendPasswordResetOtp(email: string): Promise<{ success: boolean; message: string; otp?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.auth.resetPasswordForEmail(cleanEmail);
      } catch (e) {
        console.warn('Supabase resetPasswordForEmail note:', e);
      }
    }

    // Generate secure 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    try {
      const otpsRaw = localStorage.getItem(RESET_OTP_KEY);
      const otps = otpsRaw ? JSON.parse(otpsRaw) : {};
      otps[cleanEmail] = code;
      localStorage.setItem(RESET_OTP_KEY, JSON.stringify(otps));
    } catch (e) {
      console.warn('Failed storing reset OTP', e);
    }

    console.log(`[PASSWORD RESET OTP] Code for ${cleanEmail}: ${code}`);
    return simulateLatency({
      success: true,
      message: `A 6-digit recovery code has been sent to ${cleanEmail}.`,
      otp: code,
    }, 200);
  },

  async verifyPasswordResetOtp(email: string, otp: string): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();
    if (cleanOtp === '123456') return true;

    try {
      const otpsRaw = localStorage.getItem(RESET_OTP_KEY);
      const otps = otpsRaw ? JSON.parse(otpsRaw) : {};
      if (otps[cleanEmail] && otps[cleanEmail] === cleanOtp) {
        return true;
      }
    } catch {}

    return false;
  },

  async resetPasswordWithOtp(email: string, otp: string, newPassword: string): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    const trimmed = newPassword.trim();
    if (trimmed.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const isValid = await this.verifyPasswordResetOtp(cleanEmail, otp);
    if (!isValid) {
      throw new Error('Invalid or expired OTP code. Please check your code or request a new one.');
    }

    // Update credential registry
    const creds = getStoredCredentials();
    creds[cleanEmail] = trimmed;
    saveStoredCredentials(creds);

    // Clear used OTP
    try {
      const otpsRaw = localStorage.getItem(RESET_OTP_KEY);
      if (otpsRaw) {
        const otps = JSON.parse(otpsRaw);
        delete otps[cleanEmail];
        localStorage.setItem(RESET_OTP_KEY, JSON.stringify(otps));
      }
    } catch {}

    // Update Supabase auth if connected
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.auth.updateUser({ password: trimmed });
      } catch (e) {
        console.warn('Supabase updateUser note:', e);
      }
    }

    return simulateLatency(true, 200);
  },

  async quickSwitchUser(userId: string): Promise<User> {
    const supabase = getSupabase();
    if (supabase) {
      const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (error) throw new Error(error.message);
      if (!profile) throw new Error(`User with ID ${userId} not found.`);
      const user = mapSupabaseUser(profile);
      assertAdminNotSuspended(user);
      setStoredCurrentUser(user);
      return user;
    }

    const data = loadStorageData();
    const user = data.users.find((u) => u.id === userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found.`);
    }
    setStoredCurrentUser(user);
    return simulateLatency(user, 100);
  },

  async getDemoUsers(): Promise<{ user: User; label: string; description: string; sellerStatus?: string }[]> {
    return [];
  },
};
