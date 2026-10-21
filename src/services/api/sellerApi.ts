import type { SellerProfile, SellerApprovalStatus, User } from '../../types';
import { loadStorageData, saveStorageData, simulateLatency } from '../mockStorage';

export interface SellerWithDetails extends SellerProfile {
  userName: string;
  userEmail: string;
  productCount: number;
  approvedProductCount: number;
}

export const sellerApi = {
  async getAllSellers(statusFilter?: SellerApprovalStatus): Promise<SellerWithDetails[]> {
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

    return simulateLatency(result, 150);
  },

  async getSellerById(sellerId: string): Promise<SellerWithDetails | null> {
    const data = loadStorageData();
    const seller = data.sellerProfiles.find((s) => s.userId === sellerId || s.id === sellerId);
    if (!seller) return simulateLatency(null, 100);

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
    const data = loadStorageData();
    const index = data.sellerProfiles.findIndex((s) => s.userId === userId || s.id === userId);
    if (index === -1) {
      throw new Error('Seller profile not found.');
    }

    const current = data.sellerProfiles[index];
    const updated: SellerProfile = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    data.sellerProfiles[index] = updated;

    // Update user record phone/name if provided
    const userIndex = data.users.findIndex((u) => u.id === userId);
    if (userIndex !== -1) {
      if (updates.phone) data.users[userIndex].phone = updates.phone;
      if (updates.logoUrl) data.users[userIndex].avatarUrl = updates.logoUrl;
    }

    // Update seller info on all existing products
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
    const data = loadStorageData();
    const index = data.sellerProfiles.findIndex((s) => s.userId === sellerId || s.id === sellerId);
    if (index === -1) {
      throw new Error('Seller not found.');
    }

    data.sellerProfiles[index].status = 'approved';
    data.sellerProfiles[index].rejectionReason = undefined;
    data.sellerProfiles[index].updatedAt = new Date().toISOString();

    const userIndex = data.users.findIndex((u) => u.id === sellerId);
    if (userIndex !== -1) {
      data.users[userIndex].status = 'active';
    }

    // Notification to seller
    data.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: sellerId,
      title: 'Seller Application Approved!',
      message: `Your store "${data.sellerProfiles[index].storeName}" has been approved! You can now publish products on the marketplace.`,
      type: 'seller_approved',
      isRead: false,
      linkTo: '/seller/dashboard',
      createdAt: new Date().toISOString(),
    });

    data.activityLogs.unshift({
      id: `act-${Date.now()}`,
      actorName: adminUser?.name || 'Administrator',
      actorRole: 'admin',
      action: 'APPROVE_SELLER',
      details: `Approved seller "${data.sellerProfiles[index].storeName}" (${sellerId})`,
      createdAt: new Date().toISOString(),
    });

    saveStorageData(data);
    return simulateLatency(data.sellerProfiles[index], 150);
  },

  async rejectSeller(sellerId: string, reason: string, adminUser?: User): Promise<SellerProfile> {
    const data = loadStorageData();
    const index = data.sellerProfiles.findIndex((s) => s.userId === sellerId || s.id === sellerId);
    if (index === -1) {
      throw new Error('Seller not found.');
    }

    if (!reason.trim()) {
      throw new Error('A reason for rejection must be provided.');
    }

    data.sellerProfiles[index].status = 'rejected';
    data.sellerProfiles[index].rejectionReason = reason.trim();
    data.sellerProfiles[index].updatedAt = new Date().toISOString();

    const userIndex = data.users.findIndex((u) => u.id === sellerId);
    if (userIndex !== -1) {
      data.users[userIndex].status = 'rejected';
    }

    // Notification to seller
    data.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: sellerId,
      title: 'Seller Application Not Approved',
      message: `Your seller application for "${data.sellerProfiles[index].storeName}" was rejected: ${reason}`,
      type: 'seller_rejected',
      isRead: false,
      linkTo: '/seller/dashboard',
      createdAt: new Date().toISOString(),
    });

    data.activityLogs.unshift({
      id: `act-${Date.now()}`,
      actorName: adminUser?.name || 'Administrator',
      actorRole: 'admin',
      action: 'REJECT_SELLER',
      details: `Rejected seller "${data.sellerProfiles[index].storeName}". Reason: ${reason}`,
      createdAt: new Date().toISOString(),
    });

    saveStorageData(data);
    return simulateLatency(data.sellerProfiles[index], 150);
  },

  async suspendSeller(sellerId: string, reason: string, adminUser?: User): Promise<SellerProfile> {
    const data = loadStorageData();
    const index = data.sellerProfiles.findIndex((s) => s.userId === sellerId || s.id === sellerId);
    if (index === -1) {
      throw new Error('Seller not found.');
    }

    data.sellerProfiles[index].status = 'suspended';
    data.sellerProfiles[index].rejectionReason = reason.trim();
    data.sellerProfiles[index].updatedAt = new Date().toISOString();

    const userIndex = data.users.findIndex((u) => u.id === sellerId);
    if (userIndex !== -1) {
      data.users[userIndex].status = 'suspended';
    }

    // Notification to seller
    data.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: sellerId,
      title: 'Store Suspended',
      message: `Your store "${data.sellerProfiles[index].storeName}" has been suspended: ${reason}`,
      type: 'seller_suspended',
      isRead: false,
      linkTo: '/seller/dashboard',
      createdAt: new Date().toISOString(),
    });

    data.activityLogs.unshift({
      id: `act-${Date.now()}`,
      actorName: adminUser?.name || 'Administrator',
      actorRole: 'admin',
      action: 'SUSPEND_SELLER',
      details: `Suspended seller "${data.sellerProfiles[index].storeName}". Reason: ${reason}`,
      createdAt: new Date().toISOString(),
    });

    saveStorageData(data);
    return simulateLatency(data.sellerProfiles[index], 150);
  },

  async reinstateSeller(sellerId: string, adminUser?: User): Promise<SellerProfile> {
    const data = loadStorageData();
    const index = data.sellerProfiles.findIndex((s) => s.userId === sellerId || s.id === sellerId);
    if (index === -1) {
      throw new Error('Seller not found.');
    }

    data.sellerProfiles[index].status = 'approved';
    data.sellerProfiles[index].rejectionReason = undefined;
    data.sellerProfiles[index].updatedAt = new Date().toISOString();

    const userIndex = data.users.findIndex((u) => u.id === sellerId);
    if (userIndex !== -1) {
      data.users[userIndex].status = 'active';
    }

    // Notification to seller
    data.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: sellerId,
      title: 'Store Reinstated',
      message: `Your store "${data.sellerProfiles[index].storeName}" has been reinstated by the administrator.`,
      type: 'seller_reinstated',
      isRead: false,
      linkTo: '/seller/dashboard',
      createdAt: new Date().toISOString(),
    });

    data.activityLogs.unshift({
      id: `act-${Date.now()}`,
      actorName: adminUser?.name || 'Administrator',
      actorRole: 'admin',
      action: 'REINSTATE_SELLER',
      details: `Reinstated seller "${data.sellerProfiles[index].storeName}"`,
      createdAt: new Date().toISOString(),
    });

    saveStorageData(data);
    return simulateLatency(data.sellerProfiles[index], 150);
  },
};
