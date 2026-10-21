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
};
