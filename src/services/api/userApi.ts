import type { User, BuyerProfile, AccountStatus } from '../../types';
import { loadStorageData, saveStorageData, simulateLatency } from '../mockStorage';
import { getSupabase } from '../supabaseClient';

export interface BuyerWithDetails {
  user: User;
  profile: BuyerProfile;
  inquiryCount: number;
}

function mapSupabaseUser(u: any): User {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone || '+251900000000',
    role: u.role || 'buyer',
    status: u.status || 'active',
    avatarUrl: u.avatar_url || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80`,
    createdAt: u.created_at || new Date().toISOString(),
  };
}

export const userApi = {
  async getBuyerProfile(userId: string): Promise<{ user: User; profile: BuyerProfile }> {
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data: u, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        if (error) throw new Error(error.message);
        if (!u) throw new Error('User not found.');

        const user = mapSupabaseUser(u);
        const { data: bp } = await supabase.from('buyer_profiles').select('*').eq('user_id', userId).maybeSingle();

        const profile: BuyerProfile = {
          userId,
          bio: bp?.bio,
          deliveryAddress: bp?.delivery_address,
          deliveryCity: bp?.delivery_city || u.city || 'Addis Ababa',
          deliverySubcity: bp?.delivery_subcity || u.sub_city || 'Bole',
          deliveryNotes: bp?.delivery_notes,
          locationCoordinates:
            bp?.latitude && bp?.longitude ? { latitude: bp.latitude, longitude: bp.longitude } : undefined,
          updatedAt: bp?.updated_at || u.updated_at || new Date().toISOString(),
        };

        return { user, profile };
      } catch (err) {
        console.error('Supabase getBuyerProfile error:', err);
        throw err;
      }
    }

    const data = loadStorageData();
    const user = data.users.find((u) => u.id === userId);
    if (!user) throw new Error('User not found.');

    let profile = data.buyerProfiles.find((p) => p.userId === userId);
    if (!profile) {
      profile = {
        userId,
        deliveryCity: 'Addis Ababa',
        updatedAt: new Date().toISOString(),
      };
      data.buyerProfiles.push(profile);
      saveStorageData(data);
    }

    return simulateLatency({ user, profile }, 100);
  },

  async updateBuyerProfile(
    userId: string,
    params: {
      name?: string;
      phone?: string;
      avatarUrl?: string;
      bio?: string;
      deliveryAddress?: string;
      deliveryCity?: string;
      deliverySubcity?: string;
      deliveryNotes?: string;
      locationCoordinates?: { latitude: number; longitude: number };
    }
  ): Promise<{ user: User; profile: BuyerProfile }> {
    const supabase = getSupabase();
    const now = new Date().toISOString();

    if (supabase) {
      try {
        const profileUpdates: any = { updated_at: now };
        if (params.name) profileUpdates.name = params.name.trim();
        if (params.phone) profileUpdates.phone = params.phone.trim();
        if (params.avatarUrl) profileUpdates.avatar_url = params.avatarUrl;
        if (params.locationCoordinates) {
          profileUpdates.latitude = params.locationCoordinates.latitude;
          profileUpdates.longitude = params.locationCoordinates.longitude;
        }

        await supabase.from('profiles').update(profileUpdates).eq('id', userId);

        const buyerUpdates: any = {
          user_id: userId,
          bio: params.bio,
          delivery_address: params.deliveryAddress,
          delivery_city: params.deliveryCity,
          delivery_subcity: params.deliverySubcity,
          delivery_notes: params.deliveryNotes,
          latitude: params.locationCoordinates?.latitude,
          longitude: params.locationCoordinates?.longitude,
          updated_at: now,
        };

        await supabase.from('buyer_profiles').upsert(buyerUpdates);
      } catch (err) {
        console.warn('Supabase updateBuyerProfile error:', err);
      }
    }

    const data = loadStorageData();
    const userIndex = data.users.findIndex((u) => u.id === userId);
    if (userIndex === -1) throw new Error('User not found.');

    if (params.name) data.users[userIndex].name = params.name.trim();
    if (params.phone) data.users[userIndex].phone = params.phone.trim();
    if (params.avatarUrl) data.users[userIndex].avatarUrl = params.avatarUrl;

    let profileIndex = data.buyerProfiles.findIndex((p) => p.userId === userId);
    if (profileIndex === -1) {
      data.buyerProfiles.push({
        userId,
        updatedAt: now,
      });
      profileIndex = data.buyerProfiles.length - 1;
    }

    data.buyerProfiles[profileIndex] = {
      ...data.buyerProfiles[profileIndex],
      bio: params.bio !== undefined ? params.bio : data.buyerProfiles[profileIndex].bio,
      deliveryAddress:
        params.deliveryAddress !== undefined
          ? params.deliveryAddress
          : data.buyerProfiles[profileIndex].deliveryAddress,
      deliveryCity:
        params.deliveryCity !== undefined
          ? params.deliveryCity
          : data.buyerProfiles[profileIndex].deliveryCity,
      deliverySubcity:
        params.deliverySubcity !== undefined
          ? params.deliverySubcity
          : data.buyerProfiles[profileIndex].deliverySubcity,
      deliveryNotes:
        params.deliveryNotes !== undefined
          ? params.deliveryNotes
          : data.buyerProfiles[profileIndex].deliveryNotes,
      locationCoordinates:
        params.locationCoordinates !== undefined
          ? params.locationCoordinates
          : data.buyerProfiles[profileIndex].locationCoordinates,
      updatedAt: now,
    };

    saveStorageData(data);
    return simulateLatency(
      {
        user: data.users[userIndex],
        profile: data.buyerProfiles[profileIndex],
      },
      120
    );
  },

  async getAllBuyers(limit: number = 50, offset: number = 0): Promise<BuyerWithDetails[]> {
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data: users, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'buyer')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          console.error('Supabase getAllBuyers error:', error);
          return [];
        }

        if (users) {
          const { data: buyerProfiles } = await supabase.from('buyer_profiles').select('*');
          const bpMap: Record<string, any> = {};
          (buyerProfiles || []).forEach((b: any) => {
            bpMap[b.user_id] = b;
          });

          const { data: convs } = await supabase.from('conversations').select('buyer_id');
          const convMap: Record<string, number> = {};
          (convs || []).forEach((c: any) => {
            convMap[c.buyer_id] = (convMap[c.buyer_id] || 0) + 1;
          });

          return users.map((u: any) => {
            const user = mapSupabaseUser(u);
            const bp = bpMap[u.id];
            const profile: BuyerProfile = {
              userId: u.id,
              bio: bp?.bio,
              deliveryAddress: bp?.delivery_address,
              deliveryCity: bp?.delivery_city || u.city || 'Addis Ababa',
              deliverySubcity: bp?.delivery_subcity || u.sub_city || 'Bole',
              deliveryNotes: bp?.delivery_notes,
              locationCoordinates:
                bp?.latitude && bp?.longitude ? { latitude: bp.latitude, longitude: bp.longitude } : undefined,
              updatedAt: bp?.updated_at || u.updated_at || u.created_at,
            };

            return {
              user,
              profile,
              inquiryCount: convMap[u.id] || 0,
            };
          });
        }
        return [];
      } catch (err) {
        console.error('Supabase getAllBuyers error:', err);
        return [];
      }
    }

    const data = loadStorageData();
    const buyers = data.users.filter((u) => u.role === 'buyer');

    const result = buyers.map((user) => {
      let profile = data.buyerProfiles.find((p) => p.userId === user.id);
      if (!profile) {
        profile = {
          userId: user.id,
          deliveryCity: 'Addis Ababa',
          updatedAt: user.createdAt,
        };
      }
      const inquiryCount = data.conversations.filter((c) => c.buyerId === user.id).length;

      return {
        user,
        profile,
        inquiryCount,
      };
    });

    return simulateLatency(result.slice(offset, offset + limit), 120);
  },

  async getAllUsers(limit: number = 50, offset: number = 0): Promise<User[]> {
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        if (!error && data) {
          return data.map(mapSupabaseUser);
        }
      } catch (err) {
        console.warn('Supabase getAllUsers error:', err);
      }
    }

    const data = loadStorageData();
    return simulateLatency([...data.users].slice(offset, offset + limit), 100);
  },

  async updateUserStatus(userId: string, status: AccountStatus, adminUser?: User): Promise<User> {
    const supabase = getSupabase();
    const now = new Date().toISOString();

    if (supabase) {
      try {
        await supabase.from('profiles').update({ status, updated_at: now }).eq('id', userId);
        await supabase.from('seller_profiles').update({ status, updated_at: now }).eq('user_id', userId);

        await supabase.from('activity_logs').insert({
          id: `act-${Date.now()}`,
          actor_name: adminUser?.name || 'Administrator',
          actor_role: 'admin',
          action: 'UPDATE_USER_STATUS',
          details: `Updated user status of (${userId}) to ${status} in Supabase.`,
          created_at: now,
        });
      } catch (err) {
        console.warn('Supabase updateUserStatus error:', err);
      }
    }

    const data = loadStorageData();
    const index = data.users.findIndex((u) => u.id === userId);
    if (index === -1) throw new Error('User not found.');

    data.users[index].status = status;

    if (data.users[index].role === 'seller') {
      const sellerProfile = data.sellerProfiles.find((s) => s.userId === userId);
      if (sellerProfile) {
        sellerProfile.status = status as any;
      }
    }

    data.activityLogs.unshift({
      id: `act-${Date.now()}`,
      actorName: adminUser?.name || 'Administrator',
      actorRole: 'admin',
      action: 'UPDATE_USER_STATUS',
      details: `Updated user status of "${data.users[index].name}" to ${status}.`,
      createdAt: now,
    });

    saveStorageData(data);
    return simulateLatency(data.users[index], 120);
  },

  async getAllAdmins(): Promise<User[]> {
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('role', 'admin');
        if (error) {
          console.error('Supabase getAllAdmins error:', error);
          return [];
        }
        return (data || []).map(mapSupabaseUser);
      } catch (err) {
        console.error('Supabase getAllAdmins error:', err);
        return [];
      }
    }

    const data = loadStorageData();
    const admins = data.users.filter((u) => u.role === 'admin');
    return simulateLatency(admins, 100);
  },

  async createAdmin(params: {
    name: string;
    email: string;
    phone?: string;
    password?: string;
  }): Promise<User> {
    if (!params.name.trim() || !params.email.trim()) {
      throw new Error('Name and email are required to create an admin account.');
    }

    const now = new Date().toISOString();
    const newAdmin: User = {
      id: `user-admin-${Date.now()}`,
      name: params.name.trim(),
      email: params.email.trim().toLowerCase(),
      phone: params.phone?.trim() || '+251900000000',
      role: 'admin',
      status: 'active',
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80`,
      createdAt: now,
    };

    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('profiles').insert({
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        phone: newAdmin.phone,
        role: 'admin',
        status: 'active',
        avatar_url: newAdmin.avatarUrl,
        created_at: now,
        updated_at: now,
      });

      if (error) {
        throw new Error(error.message);
      }

      await supabase.from('activity_logs').insert({
        id: `act-${Date.now()}`,
        actor_name: 'Administrator',
        actor_role: 'admin',
        action: 'CREATE_ADMIN',
        details: `Created new administrator account for "${newAdmin.name}" (${newAdmin.email}) in Supabase.`,
        created_at: now,
      });

      return newAdmin;
    }

    const data = loadStorageData();
    data.users.unshift(newAdmin);
    data.activityLogs.unshift({
      id: `act-${Date.now()}`,
      actorName: 'Administrator',
      actorRole: 'admin',
      action: 'CREATE_ADMIN',
      details: `Created new administrator account for "${newAdmin.name}" (${newAdmin.email}).`,
      createdAt: now,
    });

    saveStorageData(data);
    return simulateLatency(newAdmin, 120);
  },

  async deleteAdmin(adminId: string, currentAdminId?: string): Promise<void> {
    if (adminId === currentAdminId) {
      throw new Error('You cannot delete your own active administrator account.');
    }

    const supabase = getSupabase();
    if (supabase) {
      const { error } = await supabase.from('profiles').delete().eq('id', adminId);
      if (error) {
        throw new Error(error.message);
      }
      return;
    }

    const data = loadStorageData();
    const adminIndex = data.users.findIndex((u) => u.id === adminId && u.role === 'admin');
    if (adminIndex === -1) {
      throw new Error('Admin not found.');
    }

    const removed = data.users.splice(adminIndex, 1)[0];
    data.activityLogs.unshift({
      id: `act-${Date.now()}`,
      actorName: 'Administrator',
      actorRole: 'admin',
      action: 'DELETE_ADMIN',
      details: `Removed administrator account "${removed.name}" (${removed.email}).`,
      createdAt: new Date().toISOString(),
    });

    saveStorageData(data);
    return simulateLatency(undefined, 100);
  },
};
