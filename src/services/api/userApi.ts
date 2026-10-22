import type { User, BuyerProfile, AccountStatus } from '../../types';
import { loadStorageData, saveStorageData, simulateLatency } from '../mockStorage';

export interface BuyerWithDetails {
  user: User;
  profile: BuyerProfile;
  inquiryCount: number;
}

export const userApi = {
  async getBuyerProfile(userId: string): Promise<{ user: User; profile: BuyerProfile }> {
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
        updatedAt: new Date().toISOString(),
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
      updatedAt: new Date().toISOString(),
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

  async getAllBuyers(): Promise<BuyerWithDetails[]> {
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

    return simulateLatency(result, 120);
  },

  async getAllUsers(): Promise<User[]> {
    const data = loadStorageData();
    return simulateLatency([...data.users], 100);
  },

  async updateUserStatus(userId: string, status: AccountStatus, adminUser?: User): Promise<User> {
    const data = loadStorageData();
    const index = data.users.findIndex((u) => u.id === userId);
    if (index === -1) throw new Error('User not found.');

    data.users[index].status = status;

    // If user is a seller, also update sellerProfile status
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
      createdAt: new Date().toISOString(),
    });

    saveStorageData(data);
    return simulateLatency(data.users[index], 120);
  },

  async getAllAdmins(): Promise<User[]> {
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
    const data = loadStorageData();

    if (!params.name.trim() || !params.email.trim()) {
      throw new Error('Name and email are required to create an admin account.');
    }

    const emailExists = data.users.some(
      (u) => u.email.toLowerCase() === params.email.trim().toLowerCase()
    );
    if (emailExists) {
      throw new Error('An account with this email address already exists.');
    }

    const newAdmin: User = {
      id: `user-admin-${Date.now()}`,
      name: params.name.trim(),
      email: params.email.trim().toLowerCase(),
      phone: params.phone?.trim() || '+251900000000',
      role: 'admin',
      status: 'active',
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80`,
      createdAt: new Date().toISOString(),
    };

    data.users.unshift(newAdmin);
    data.activityLogs.unshift({
      id: `act-${Date.now()}`,
      actorName: 'Administrator',
      actorRole: 'admin',
      action: 'CREATE_ADMIN',
      details: `Created new administrator account for "${newAdmin.name}" (${newAdmin.email}).`,
      createdAt: new Date().toISOString(),
    });

    saveStorageData(data);
    return simulateLatency(newAdmin, 120);
  },

  async deleteAdmin(adminId: string, currentAdminId?: string): Promise<void> {
    const data = loadStorageData();
    if (adminId === currentAdminId) {
      throw new Error('You cannot delete your own active administrator account.');
    }

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
