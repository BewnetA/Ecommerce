import type { SellerProfile, SellerApprovalStatus, User } from '../../types';
import { loadStorageData, saveStorageData, simulateLatency } from '../mockStorage';
import { getSupabase } from '../supabaseClient';

export interface SellerWithDetails extends SellerProfile {
  userName: string;
  userEmail: string;
  productCount: number;
  approvedProductCount: number;
}

function mapSupabaseSeller(s: any): SellerProfile {
  return {
    id: s.id,
    userId: s.user_id,
    storeName: s.store_name,
    businessDescription: s.business_description || '',
    phone: s.phone || '',
    email: s.email || '',
    location: s.location || `${s.sub_city || 'Bole'}, ${s.city || 'Addis Ababa'}`,
    logoUrl: s.logo_url,
    status: s.status as SellerApprovalStatus,
    rejectionReason: s.rejection_reason,
    createdAt: s.created_at,
    updatedAt: s.updated_at || s.created_at,
  };
}

export const sellerApi = {
  async getAllSellers(
    statusFilter?: SellerApprovalStatus,
    limit: number = 50,
    offset: number = 0
  ): Promise<SellerWithDetails[]> {
    const supabase = getSupabase();

    if (supabase) {
      try {
        let query = supabase.from('seller_profiles').select('*');
        if (statusFilter) {
          query = query.eq('status', statusFilter);
        }

        const { data: sellersData, error } = await query
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) {
          console.error('Supabase getAllSellers error:', error);
          return [];
        }

        if (sellersData) {
          // Fetch product counts
          const { data: prods } = await supabase.from('products').select('seller_id, status');
          const productCounts: Record<string, { total: number; approved: number }> = {};
          (prods || []).forEach((p: any) => {
            if (!productCounts[p.seller_id]) productCounts[p.seller_id] = { total: 0, approved: 0 };
            productCounts[p.seller_id].total += 1;
            if (p.status === 'approved') productCounts[p.seller_id].approved += 1;
          });

          // Fetch user details
          const { data: profiles } = await supabase.from('profiles').select('id, name, email');
          const userMap: Record<string, { name: string; email: string }> = {};
          (profiles || []).forEach((u: any) => {
            userMap[u.id] = { name: u.name, email: u.email };
          });

          return sellersData.map((s: any) => {
            const mapped = mapSupabaseSeller(s);
            const userInfo = userMap[s.user_id] || { name: s.store_name, email: s.email || '' };
            const counts = productCounts[s.user_id] || productCounts[s.id] || { total: 0, approved: 0 };
            return {
              ...mapped,
              userName: userInfo.name,
              userEmail: userInfo.email,
              productCount: counts.total,
              approvedProductCount: counts.approved,
            };
          });
        }
        return [];
      } catch (err) {
        console.error('Supabase getAllSellers error:', err);
        return [];
      }
    }

    const data = loadStorageData();

    const result = data.sellerProfiles
      .filter((s) => (statusFilter ? s.status === statusFilter : true))
      .map((seller) => {
        const user = data.users.find((u) => u.id === seller.userId);
        const products = data.products.filter((p) => p.sellerId === seller.userId);
        const approvedProducts = products.filter((p) => p.status === 'approved');

        return {
          ...seller,
          userName: user?.name || seller.storeName,
          userEmail: user?.email || seller.email || '',
          productCount: products.length,
          approvedProductCount: approvedProducts.length,
        };
      });

    return simulateLatency(result.slice(offset, offset + limit), 150);
  },

  async getSellerById(sellerId: string): Promise<SellerWithDetails | null> {
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data: s, error } = await supabase
          .from('seller_profiles')
          .select('*')
          .or(`user_id.eq.${sellerId},id.eq.${sellerId}`)
          .maybeSingle();

        if (error || !s) {
          return null;
        }

        const { data: prods } = await supabase.from('products').select('status').eq('seller_id', s.user_id);
        const total = prods?.length || 0;
        const approved = prods?.filter((p: any) => p.status === 'approved').length || 0;

        const { data: prof } = await supabase.from('profiles').select('name, email').eq('id', s.user_id).maybeSingle();

        return {
          ...mapSupabaseSeller(s),
          userName: prof?.name || s.store_name,
          userEmail: prof?.email || s.email || '',
          productCount: total,
          approvedProductCount: approved,
        };
      } catch (err) {
        console.error('Supabase getSellerById error:', err);
        return null;
      }
    }

    const data = loadStorageData();
    let seller = data.sellerProfiles.find((s) => s.userId === sellerId || s.id === sellerId);
    if (!seller) {
      const user = data.users.find((u) => u.id === sellerId);
      if (user?.role === 'admin') {
        seller = {
          id: user.id,
          userId: user.id,
          storeName: 'Addis Repair Official Store',
          businessDescription: 'Official store managed by Addis Repair platform administrators, featuring verified electronics, equipment, and repair services.',
          phone: user.phone || '+251900000000',
          email: user.email || 'admin@marketplace.com',
          location: 'Addis Ababa, Bole Sub-City',
          logoUrl: user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
          status: 'approved',
          createdAt: user.createdAt,
          updatedAt: new Date().toISOString(),
        };
        data.sellerProfiles.push(seller);
        saveStorageData(data);
      } else {
        return simulateLatency(null, 100);
      }
    }

    const user = data.users.find((u) => u.id === seller.userId);
    const products = data.products.filter((p) => p.sellerId === seller.userId);
    const approvedProducts = products.filter((p) => p.status === 'approved');

    return simulateLatency(
      {
        ...seller,
        userName: user?.name || seller.storeName,
        userEmail: user?.email || seller.email || '',
        productCount: products.length,
        approvedProductCount: approvedProducts.length,
      },
      100
    );
  },

  async updateSellerProfile(
    userId: string,
    updates: Partial<Omit<SellerProfile, 'id' | 'userId' | 'status' | 'rejectionReason' | 'createdAt'>>
  ): Promise<SellerProfile> {
    const supabase = getSupabase();
    const now = new Date().toISOString();

    if (supabase) {
      try {
        const payload: any = { updated_at: now };
        if (updates.storeName) payload.store_name = updates.storeName;
        if (updates.businessDescription) payload.business_description = updates.businessDescription;
        if (updates.phone) payload.phone = updates.phone;
        if (updates.email) payload.email = updates.email;
        if (updates.location) payload.location = updates.location;
        if (updates.logoUrl) payload.logo_url = updates.logoUrl;

        await supabase.from('seller_profiles').update(payload).or(`user_id.eq.${userId},id.eq.${userId}`);
      } catch (err) {
        console.warn('Supabase updateSellerProfile error:', err);
      }
    }

    const data = loadStorageData();
    const index = data.sellerProfiles.findIndex((s) => s.userId === userId || s.id === userId);
    if (index === -1) {
      throw new Error('Seller profile not found.');
    }

    const current = data.sellerProfiles[index];
    const updated: SellerProfile = {
      ...current,
      ...updates,
      updatedAt: now,
    };

    data.sellerProfiles[index] = updated;

    const userIndex = data.users.findIndex((u) => u.id === userId);
    if (userIndex !== -1) {
      if (updates.phone) data.users[userIndex].phone = updates.phone;
      if (updates.logoUrl) data.users[userIndex].avatarUrl = updates.logoUrl;
    }

    data.products.forEach((p) => {
      if (p.sellerId === userId) {
        if (updates.storeName) p.sellerName = updates.storeName;
        if (updates.phone) p.sellerPhone = updates.phone;
        if (updates.location) p.sellerLocation = updates.location;
      }
    });

    saveStorageData(data);
    return simulateLatency(updated, 150);
  },

  async approveSeller(sellerId: string, adminUser?: User): Promise<SellerProfile> {
    const supabase = getSupabase();
    const now = new Date().toISOString();

    if (supabase) {
      await supabase
        .from('seller_profiles')
        .update({ status: 'approved', rejection_reason: null, updated_at: now })
        .or(`user_id.eq.${sellerId},id.eq.${sellerId}`);

      await supabase.from('profiles').update({ status: 'active' }).eq('id', sellerId);

      await supabase.from('notifications').insert({
        id: `notif-${Date.now()}`,
        user_id: sellerId,
        title: 'Seller Application Approved!',
        message: 'Your store has been approved! You can now publish products on the marketplace.',
        type: 'seller_approved',
        is_read: false,
        link_to: '/seller/dashboard',
        created_at: now,
      });

      await supabase.from('activity_logs').insert({
        id: `act-${Date.now()}`,
        actor_name: adminUser?.name || 'Administrator',
        actor_role: 'admin',
        action: 'APPROVE_SELLER',
        details: `Approved seller (${sellerId}) in Supabase.`,
        created_at: now,
      });

      const { data: updatedSeller } = await supabase
        .from('seller_profiles')
        .select('*')
        .or(`user_id.eq.${sellerId},id.eq.${sellerId}`)
        .single();

      return mapSupabaseSeller(updatedSeller);
    }

    const data = loadStorageData();
    const index = data.sellerProfiles.findIndex((s) => s.userId === sellerId || s.id === sellerId);
    if (index === -1) {
      throw new Error('Seller not found.');
    }

    data.sellerProfiles[index].status = 'approved';
    data.sellerProfiles[index].rejectionReason = undefined;
    data.sellerProfiles[index].updatedAt = now;

    const userIndex = data.users.findIndex((u) => u.id === sellerId);
    if (userIndex !== -1) {
      data.users[userIndex].status = 'active';
    }

    data.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: sellerId,
      title: 'Seller Application Approved!',
      message: `Your store "${data.sellerProfiles[index].storeName}" has been approved! You can now publish products on the marketplace.`,
      type: 'seller_approved',
      isRead: false,
      linkTo: '/seller/dashboard',
      createdAt: now,
    });

    data.activityLogs.unshift({
      id: `act-${Date.now()}`,
      actorName: adminUser?.name || 'Administrator',
      actorRole: 'admin',
      action: 'APPROVE_SELLER',
      details: `Approved seller "${data.sellerProfiles[index].storeName}" (${sellerId})`,
      createdAt: now,
    });

    saveStorageData(data);
    return simulateLatency(data.sellerProfiles[index], 150);
  },

  async rejectSeller(sellerId: string, reason: string, adminUser?: User): Promise<SellerProfile> {
    if (!reason.trim()) {
      throw new Error('A reason for rejection must be provided.');
    }

    const supabase = getSupabase();
    const now = new Date().toISOString();

    if (supabase) {
      await supabase
        .from('seller_profiles')
        .update({ status: 'rejected', rejection_reason: reason.trim(), updated_at: now })
        .or(`user_id.eq.${sellerId},id.eq.${sellerId}`);

      await supabase.from('profiles').update({ status: 'rejected' }).eq('id', sellerId);

      await supabase.from('notifications').insert({
        id: `notif-${Date.now()}`,
        user_id: sellerId,
        title: 'Seller Application Not Approved',
        message: `Your seller application was rejected: ${reason}`,
        type: 'seller_rejected',
        is_read: false,
        link_to: '/seller/dashboard',
        created_at: now,
      });

      await supabase.from('activity_logs').insert({
        id: `act-${Date.now()}`,
        actor_name: adminUser?.name || 'Administrator',
        actor_role: 'admin',
        action: 'REJECT_SELLER',
        details: `Rejected seller (${sellerId}). Reason: ${reason}`,
        created_at: now,
      });

      const { data: updatedSeller } = await supabase
        .from('seller_profiles')
        .select('*')
        .or(`user_id.eq.${sellerId},id.eq.${sellerId}`)
        .single();

      return mapSupabaseSeller(updatedSeller);
    }

    const data = loadStorageData();
    const index = data.sellerProfiles.findIndex((s) => s.userId === sellerId || s.id === sellerId);
    if (index === -1) {
      throw new Error('Seller not found.');
    }

    data.sellerProfiles[index].status = 'rejected';
    data.sellerProfiles[index].rejectionReason = reason.trim();
    data.sellerProfiles[index].updatedAt = now;

    const userIndex = data.users.findIndex((u) => u.id === sellerId);
    if (userIndex !== -1) {
      data.users[userIndex].status = 'rejected';
    }

    data.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: sellerId,
      title: 'Seller Application Not Approved',
      message: `Your seller application for "${data.sellerProfiles[index].storeName}" was rejected: ${reason}`,
      type: 'seller_rejected',
      isRead: false,
      linkTo: '/seller/dashboard',
      createdAt: now,
    });

    data.activityLogs.unshift({
      id: `act-${Date.now()}`,
      actorName: adminUser?.name || 'Administrator',
      actorRole: 'admin',
      action: 'REJECT_SELLER',
      details: `Rejected seller "${data.sellerProfiles[index].storeName}". Reason: ${reason}`,
      createdAt: now,
    });

    saveStorageData(data);
    return simulateLatency(data.sellerProfiles[index], 150);
  },

  async suspendSeller(sellerId: string, reason: string, adminUser?: User): Promise<SellerProfile> {
    const supabase = getSupabase();
    const now = new Date().toISOString();

    if (supabase) {
      try {
        await supabase
          .from('seller_profiles')
          .update({ status: 'suspended', rejection_reason: reason.trim(), updated_at: now })
          .or(`user_id.eq.${sellerId},id.eq.${sellerId}`);

        await supabase.from('profiles').update({ status: 'suspended' }).eq('id', sellerId);
      } catch (err) {
        console.warn('Supabase suspendSeller error:', err);
      }
    }

    const data = loadStorageData();
    const index = data.sellerProfiles.findIndex((s) => s.userId === sellerId || s.id === sellerId);
    if (index === -1) {
      throw new Error('Seller not found.');
    }

    data.sellerProfiles[index].status = 'suspended';
    data.sellerProfiles[index].rejectionReason = reason.trim();
    data.sellerProfiles[index].updatedAt = now;

    const userIndex = data.users.findIndex((u) => u.id === sellerId);
    if (userIndex !== -1) {
      data.users[userIndex].status = 'suspended';
    }

    data.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: sellerId,
      title: 'Store Suspended',
      message: `Your store "${data.sellerProfiles[index].storeName}" has been suspended: ${reason}`,
      type: 'seller_suspended',
      isRead: false,
      linkTo: '/seller/dashboard',
      createdAt: now,
    });

    data.activityLogs.unshift({
      id: `act-${Date.now()}`,
      actorName: adminUser?.name || 'Administrator',
      actorRole: 'admin',
      action: 'SUSPEND_SELLER',
      details: `Suspended seller "${data.sellerProfiles[index].storeName}". Reason: ${reason}`,
      createdAt: now,
    });

    saveStorageData(data);
    return simulateLatency(data.sellerProfiles[index], 150);
  },

  async reinstateSeller(sellerId: string, adminUser?: User): Promise<SellerProfile> {
    const supabase = getSupabase();
    const now = new Date().toISOString();

    if (supabase) {
      try {
        await supabase
          .from('seller_profiles')
          .update({ status: 'approved', rejection_reason: null, updated_at: now })
          .or(`user_id.eq.${sellerId},id.eq.${sellerId}`);

        await supabase.from('profiles').update({ status: 'active' }).eq('id', sellerId);
      } catch (err) {
        console.warn('Supabase reinstateSeller error:', err);
      }
    }

    const data = loadStorageData();
    const index = data.sellerProfiles.findIndex((s) => s.userId === sellerId || s.id === sellerId);
    if (index === -1) {
      throw new Error('Seller not found.');
    }

    data.sellerProfiles[index].status = 'approved';
    data.sellerProfiles[index].rejectionReason = undefined;
    data.sellerProfiles[index].updatedAt = now;

    const userIndex = data.users.findIndex((u) => u.id === sellerId);
    if (userIndex !== -1) {
      data.users[userIndex].status = 'active';
    }

    data.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: sellerId,
      title: 'Store Reinstated',
      message: `Your store "${data.sellerProfiles[index].storeName}" has been reinstated by the administrator.`,
      type: 'seller_reinstated',
      isRead: false,
      linkTo: '/seller/dashboard',
      createdAt: now,
    });

    data.activityLogs.unshift({
      id: `act-${Date.now()}`,
      actorName: adminUser?.name || 'Administrator',
      actorRole: 'admin',
      action: 'REINSTATE_SELLER',
      details: `Reinstated seller "${data.sellerProfiles[index].storeName}"`,
      createdAt: now,
    });

    saveStorageData(data);
    return simulateLatency(data.sellerProfiles[index], 150);
  },
};
