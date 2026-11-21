import type { User, MemberStatus } from '../../types';
import { loadStorageData, saveStorageData, simulateLatency } from '../mockStorage';
import { getSupabase } from '../supabaseClient';
import { mapSupabaseUser } from './memberApi';
import { memberStatusToDb } from '../../utils/members';

/**
 * Account administration (all accounts, and administrator management).
 * Member profiles and one-time verification live in memberApi.
 */
export const userApi = {
  async getAllUsers(limit: number = 50, offset: number = 0): Promise<User[]> {
    const supabase = getSupabase();

    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);
      if (error) {
        console.warn('Supabase getAllUsers error:', error);
        return [];
      }
      return (data || []).map(mapSupabaseUser);
    }

    const data = loadStorageData();
    return simulateLatency([...data.users].slice(offset, offset + limit), 100);
  },

  async updateUserStatus(userId: string, status: MemberStatus, adminUser?: User): Promise<User> {
    const supabase = getSupabase();
    const now = new Date().toISOString();

    if (supabase) {
      const { data: updated, error } = await supabase
        .from('profiles')
        .update({ status: memberStatusToDb(status), updated_at: now })
        .eq('id', userId)
        .select('*')
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!updated) throw new Error('User not found.');

      const { error: logError } = await supabase.from('activity_logs').insert({
        id: `act-${Date.now()}`,
        actor_name: adminUser?.name || 'Administrator',
        actor_role: 'admin',
        action: 'UPDATE_USER_STATUS',
        details: `Updated user status of "${updated.name || userId}" to ${status}.`,
        created_at: now,
      });
      if (logError) console.warn('Supabase activity log note:', logError.message);

      return mapSupabaseUser(updated);
    }

    const data = loadStorageData();
    const index = data.users.findIndex((u) => u.id === userId);
    if (index === -1) throw new Error('User not found.');

    data.users[index].status = status;

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
      status: 'approved',
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
