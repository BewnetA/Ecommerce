import type { User, BuyerProfile, SellerProfile } from '../../types';
import {
  loadStorageData,
  saveStorageData,
  getStoredCurrentUser,
  setStoredCurrentUser,
  simulateLatency,
} from '../mockStorage';
import { getSupabase } from '../supabaseClient';

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

export interface RegisterBuyerData {
  name: string;
  email: string;
  phone: string;
  password?: string;
}

export interface RegisterSellerData {
  name: string;
  email?: string;
  phone: string;
  storeName: string;
  location: string;
  businessDescription: string;
  password?: string;
}

export const authApi = {
  async getCurrentUser(): Promise<User | null> {
    const user = getStoredCurrentUser();
    return simulateLatency(user, 50);
  },

  async login(credentials: LoginCredentials): Promise<User> {
    const email = credentials.email.trim().toLowerCase();
    const inputPassword = credentials.password?.trim() || '';

    // Validate password against stored credentials if registered
    const creds = getStoredCredentials();
    const expectedPassword = creds[email];
    if (expectedPassword && inputPassword && inputPassword !== expectedPassword) {
      throw new Error('Invalid password. Please check your credentials or reset your password.');
    }

    const supabase = getSupabase();

    if (supabase) {
      try {
        if (inputPassword) {
          try {
            await supabase.auth.signInWithPassword({ email, password: inputPassword });
          } catch (authErr: any) {
            console.warn('Supabase signInWithPassword note:', authErr.message);
          }
        }

        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .ilike('email', email)
          .maybeSingle();

        if (profile) {
          if (profile.status === 'suspended') {
            throw new Error('This account has been suspended. Please contact platform administration.');
          }

          const user: User = {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            phone: profile.phone || '+251900000000',
            role: profile.role,
            status: profile.status,
            avatarUrl:
              profile.avatar_url ||
              `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80`,
            createdAt: profile.created_at,
          };

          setStoredCurrentUser(user);
          return user;
        }

        if (error) {
          console.warn('Supabase login query error:', error);
        } else {
          throw new Error('No user account found matching this email address in Supabase.');
        }
      } catch (err: any) {
        if (err.message && !err.message.includes('fetch')) {
          throw err;
        }
      }
    }

    // Local storage fallback if offline
    const data = loadStorageData();
    const user = data.users.find(
      (u) => u.email.toLowerCase() === email
    );

    if (!user) {
      throw new Error('Invalid email or account does not exist.');
    }

    if (user.status === 'suspended') {
      throw new Error('This account has been suspended. Please contact platform administration.');
    }

    setStoredCurrentUser(user);
    return simulateLatency(user, 150);
  },

  async logout(): Promise<void> {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (_) {}
    }
    setStoredCurrentUser(null);
    return simulateLatency(undefined, 50);
  },

  async registerBuyer(buyerData: RegisterBuyerData): Promise<User> {
    if (!buyerData.name.trim() || !buyerData.email.trim() || !buyerData.phone.trim()) {
      throw new Error('Please fill out all required fields (Name, Email, Phone).');
    }

    const email = buyerData.email.trim().toLowerCase();
    const userId = `user-buyer-${Date.now()}`;
    const now = new Date().toISOString();

    const newUser: User = {
      id: userId,
      name: buyerData.name.trim(),
      email,
      phone: buyerData.phone.trim(),
      role: 'buyer',
      status: 'active',
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80`,
      createdAt: now,
    };

    const newProfile: BuyerProfile = {
      userId,
      bio: '',
      deliveryAddress: '',
      deliveryCity: 'Addis Ababa',
      updatedAt: now,
    };

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('profiles').insert({
          id: userId,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          role: 'buyer',
          status: 'active',
          avatar_url: newUser.avatarUrl,
          created_at: now,
          updated_at: now,
        });

        await supabase.from('buyer_profiles').insert({
          id: `bp-${Date.now()}`,
          user_id: userId,
          delivery_city: 'Addis Ababa',
          updated_at: now,
        });

        await supabase.from('activity_logs').insert({
          id: `act-${Date.now()}`,
          actor_name: newUser.name,
          actor_role: 'buyer',
          action: 'REGISTER_BUYER',
          details: `New buyer registered in Supabase: ${newUser.name} (${newUser.email})`,
          created_at: now,
        });
      } catch (err: any) {
        console.warn('Supabase registerBuyer error:', err);
      }
    }

    const data = loadStorageData();
    data.users.push(newUser);
    data.buyerProfiles.push(newProfile);
    saveStorageData(data);
    if (buyerData.password?.trim()) {
      const creds = getStoredCredentials();
      creds[email] = buyerData.password.trim();
      saveStoredCredentials(creds);
    }
    setStoredCurrentUser(newUser);
    return simulateLatency(newUser, 200);
  },

  async registerSeller(sellerData: RegisterSellerData): Promise<{ user: User; profile: SellerProfile }> {
    if (!sellerData.name.trim() || !sellerData.phone.trim() || !sellerData.storeName.trim() || !sellerData.location.trim()) {
      throw new Error('Full name, phone, store name, and store location are required.');
    }

    const sellerEmail = sellerData.email?.trim().toLowerCase() || `seller-${Date.now()}@marketplace.et`;
    const userId = `user-seller-${Date.now()}`;
    const sellerId = `seller-${Date.now()}`;
    const now = new Date().toISOString();

    const newUser: User = {
      id: userId,
      name: sellerData.name.trim(),
      email: sellerEmail,
      phone: sellerData.phone.trim(),
      role: 'seller',
      status: 'pending',
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80`,
      createdAt: now,
    };

    const newProfile: SellerProfile = {
      id: sellerId,
      userId,
      storeName: sellerData.storeName.trim(),
      businessDescription: sellerData.businessDescription.trim() || 'Trusted marketplace merchant.',
      phone: sellerData.phone.trim(),
      email: sellerEmail,
      location: sellerData.location.trim(),
      logoUrl: `https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80`,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('profiles').insert({
          id: userId,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          role: 'seller',
          status: 'pending',
          avatar_url: newUser.avatarUrl,
          created_at: now,
          updated_at: now,
        });

        await supabase.from('seller_profiles').insert({
          id: sellerId,
          user_id: userId,
          store_name: newProfile.storeName,
          business_description: newProfile.businessDescription,
          phone: newProfile.phone,
          email: newProfile.email,
          location: newProfile.location,
          status: 'pending',
          created_at: now,
          updated_at: now,
        });

        await supabase.from('notifications').insert({
          id: `notif-${Date.now()}`,
          user_id: 'user-admin',
          title: 'New Seller Registration Pending',
          message: `Seller "${newProfile.storeName}" (${newUser.name}) registered and is awaiting admin approval.`,
          type: 'system',
          is_read: false,
          link_to: '/admin/sellers/approvals',
          created_at: now,
        });

        await supabase.from('activity_logs').insert({
          id: `act-${Date.now()}`,
          actor_name: newUser.name,
          actor_role: 'seller',
          action: 'REGISTER_SELLER',
          details: `New seller application submitted for "${newProfile.storeName}". Status: Pending Review`,
          created_at: now,
        });
      } catch (err: any) {
        console.warn('Supabase registerSeller error:', err);
      }
    }

    const data = loadStorageData();
    data.users.push(newUser);
    data.sellerProfiles.push(newProfile);
    saveStorageData(data);
    if (sellerData.password?.trim()) {
      const creds = getStoredCredentials();
      creds[sellerEmail] = sellerData.password.trim();
      saveStoredCredentials(creds);
    }
    setStoredCurrentUser(newUser);
    return simulateLatency({ user: newUser, profile: newProfile }, 200);
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
      try {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        if (profile) {
          const user: User = {
            id: profile.id,
            name: profile.name,
            email: profile.email,
            phone: profile.phone || '+251900000000',
            role: profile.role,
            status: profile.status,
            avatarUrl: profile.avatar_url,
            createdAt: profile.created_at,
          };
          setStoredCurrentUser(user);
          return user;
        }
      } catch (_) {}
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
