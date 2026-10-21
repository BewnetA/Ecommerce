import type { User, BuyerProfile, SellerProfile } from '../../types';
import {
  loadStorageData,
  saveStorageData,
  getStoredCurrentUser,
  setStoredCurrentUser,
  simulateLatency,
} from '../mockStorage';

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
    const data = loadStorageData();
    const user = data.users.find(
      (u) => u.email.toLowerCase() === credentials.email.trim().toLowerCase()
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
    setStoredCurrentUser(null);
    return simulateLatency(undefined, 50);
  },

  async registerBuyer(buyerData: RegisterBuyerData): Promise<User> {
    const data = loadStorageData();

    if (!buyerData.name.trim() || !buyerData.email.trim() || !buyerData.phone.trim()) {
      throw new Error('Please fill out all required fields (Name, Email, Phone).');
    }

    const emailExists = data.users.some(
      (u) => u.email.toLowerCase() === buyerData.email.trim().toLowerCase()
    );
    if (emailExists) {
      throw new Error('An account with this email address already exists.');
    }

    const userId = `user-buyer-${Date.now()}`;
    const newUser: User = {
      id: userId,
      name: buyerData.name.trim(),
      email: buyerData.email.trim().toLowerCase(),
      phone: buyerData.phone.trim(),
      role: 'buyer',
      status: 'active',
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80`,
      createdAt: new Date().toISOString(),
    };

    const newProfile: BuyerProfile = {
      userId,
      bio: '',
      deliveryAddress: '',
      deliveryCity: 'Addis Ababa',
      updatedAt: new Date().toISOString(),
    };

    data.users.push(newUser);
    data.buyerProfiles.push(newProfile);
    data.activityLogs.unshift({
      id: `act-${Date.now()}`,
      actorName: newUser.name,
      actorRole: 'buyer',
      action: 'REGISTER_BUYER',
      details: `New buyer registered: ${newUser.name} (${newUser.email})`,
      createdAt: new Date().toISOString(),
    });

    saveStorageData(data);
    setStoredCurrentUser(newUser);
    return simulateLatency(newUser, 200);
  },

  async registerSeller(sellerData: RegisterSellerData): Promise<{ user: User; profile: SellerProfile }> {
    const data = loadStorageData();

    if (!sellerData.name.trim() || !sellerData.phone.trim() || !sellerData.storeName.trim() || !sellerData.location.trim()) {
      throw new Error('Full name, phone, store name, and store location are required.');
    }

    const sellerEmail = sellerData.email?.trim() || `seller-${Date.now()}@marketplace.et`;
    const emailExists = data.users.some(
      (u) => u.email.toLowerCase() === sellerEmail.toLowerCase()
    );
    if (emailExists) {
      throw new Error('An account with this email address already exists.');
    }

    const userId = `user-seller-${Date.now()}`;
    const newUser: User = {
      id: userId,
      name: sellerData.name.trim(),
      email: sellerEmail.toLowerCase(),
      phone: sellerData.phone.trim(),
      role: 'seller',
      status: 'pending', // Starts in pending status according to specification!
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80`,
      createdAt: new Date().toISOString(),
    };

    const newProfile: SellerProfile = {
      id: userId,
      userId,
      storeName: sellerData.storeName.trim(),
      businessDescription: sellerData.businessDescription.trim() || 'Trusted marketplace merchant.',
      phone: sellerData.phone.trim(),
      email: sellerEmail,
      location: sellerData.location.trim(),
      logoUrl: `https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80`,
      status: 'pending', // Starts in pending status!
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    data.users.push(newUser);
    data.sellerProfiles.push(newProfile);

    // Notify Administrator
    data.notifications.unshift({
      id: `notif-${Date.now()}`,
      userId: 'user-admin',
      title: 'New Seller Registration Pending',
      message: `Seller "${newProfile.storeName}" (${newUser.name}) registered and is awaiting admin approval.`,
      type: 'system',
      isRead: false,
      linkTo: '/admin/sellers/approvals',
      createdAt: new Date().toISOString(),
    });

    data.activityLogs.unshift({
      id: `act-${Date.now()}`,
      actorName: newUser.name,
      actorRole: 'seller',
      action: 'REGISTER_SELLER',
      details: `New seller application submitted for "${newProfile.storeName}". Status: Pending Review`,
      createdAt: new Date().toISOString(),
    });

    saveStorageData(data);
    setStoredCurrentUser(newUser);
    return simulateLatency({ user: newUser, profile: newProfile }, 200);
  },

  async quickSwitchUser(userId: string): Promise<User> {
    const data = loadStorageData();
    const user = data.users.find((u) => u.id === userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found.`);
    }
    setStoredCurrentUser(user);
    return simulateLatency(user, 100);
  },

  async getDemoUsers(): Promise<{ user: User; label: string; description: string; sellerStatus?: string }[]> {
    const data = loadStorageData();
    const result: { user: User; label: string; description: string; sellerStatus?: string }[] = [];

    const admin = data.users.find((u) => u.role === 'admin');
    if (admin) {
      result.push({
        user: admin,
        label: 'Platform Administrator',
        description: 'Full moderation privileges, seller/product approval, metrics',
      });
    }

    const approvedSellerUser = data.users.find((u) => u.id === 'user-seller-approved');
    if (approvedSellerUser) {
      result.push({
        user: approvedSellerUser,
        label: 'Approved Seller (BlueNile Tech)',
        description: 'Can add, edit, and manage products and chat with buyers',
        sellerStatus: 'approved',
      });
    }

    const pendingSellerUser = data.users.find((u) => u.id === 'user-seller-pending');
    if (pendingSellerUser) {
      result.push({
        user: pendingSellerUser,
        label: 'Pending Seller (Habesha Crafts)',
        description: 'Awaiting admin review; cannot publish products yet',
        sellerStatus: 'pending',
      });
    }

    const rejectedSellerUser = data.users.find((u) => u.id === 'user-seller-rejected');
    if (rejectedSellerUser) {
      result.push({
        user: rejectedSellerUser,
        label: 'Rejected Seller (QuickDeals)',
        description: 'Application rejected with documented moderation reason',
        sellerStatus: 'rejected',
      });
    }

    const suspendedSellerUser = data.users.find((u) => u.id === 'user-seller-suspended');
    if (suspendedSellerUser) {
      result.push({
        user: suspendedSellerUser,
        label: 'Suspended Seller (Shady Imports)',
        description: 'Store suspended by admin due to reported policy violations',
        sellerStatus: 'suspended',
      });
    }

    const buyerUser = data.users.find((u) => u.id === 'user-buyer-1');
    if (buyerUser) {
      result.push({
        user: buyerUser,
        label: 'Buyer (Sara Mengistu)',
        description: 'Browse products, message sellers, share delivery location',
      });
    }

    return simulateLatency(result, 50);
  },
};
