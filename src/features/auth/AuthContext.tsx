import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, SellerProfile, BuyerProfile } from '../../types';
import { authApi, sellerApi, userApi } from '../../services/api';
import type { LoginCredentials, RegisterBuyerData, RegisterSellerData } from '../../services/api';
import { resetStorageToDefaults } from '../../services/mockStorage';

interface DemoUserOption {
  user: User;
  label: string;
  description: string;
  sellerStatus?: string;
}

interface AuthContextType {
  user: User | null;
  sellerProfile: SellerProfile | null;
  buyerProfile: BuyerProfile | null;
  isLoading: boolean;
  demoUsers: DemoUserOption[];
  login: (credentials: LoginCredentials) => Promise<User>;
  registerBuyer: (data: RegisterBuyerData) => Promise<User>;
  registerSeller: (data: RegisterSellerData) => Promise<{ user: User; profile: SellerProfile }>;
  logout: () => Promise<void>;
  switchUser: (userId: string) => Promise<User>;
  refreshUser: () => Promise<void>;
  resetAllDemoData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [sellerProfile, setSellerProfile] = useState<SellerProfile | null>(null);
  const [buyerProfile, setBuyerProfile] = useState<BuyerProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [demoUsers, setDemoUsers] = useState<DemoUserOption[]>([]);

  const loadProfilesForUser = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setSellerProfile(null);
      setBuyerProfile(null);
      return;
    }

    try {
      if (currentUser.role === 'seller') {
        const profile = await sellerApi.getSellerById(currentUser.id);
        setSellerProfile(profile);
      } else {
        setSellerProfile(null);
      }

      if (currentUser.role === 'buyer') {
        const { profile } = await userApi.getBuyerProfile(currentUser.id);
        setBuyerProfile(profile);
      } else {
        setBuyerProfile(null);
      }
    } catch (err) {
      console.error('Error loading role profiles for user:', err);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      await loadProfilesForUser(currentUser);
      const demos = await authApi.getDemoUsers();
      setDemoUsers(demos);
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  }, [loadProfilesForUser]);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        const currentUser = await authApi.getCurrentUser();
        setUser(currentUser);
        await loadProfilesForUser(currentUser);
        const demos = await authApi.getDemoUsers();
        setDemoUsers(demos);
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [loadProfilesForUser]);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const loggedIn = await authApi.login(credentials);
      setUser(loggedIn);
      await loadProfilesForUser(loggedIn);
      return loggedIn;
    } finally {
      setIsLoading(false);
    }
  };

  const registerBuyer = async (data: RegisterBuyerData) => {
    setIsLoading(true);
    try {
      const newUser = await authApi.registerBuyer(data);
      setUser(newUser);
      await loadProfilesForUser(newUser);
      const demos = await authApi.getDemoUsers();
      setDemoUsers(demos);
      return newUser;
    } finally {
      setIsLoading(false);
    }
  };

  const registerSeller = async (data: RegisterSellerData) => {
    setIsLoading(true);
    try {
      const res = await authApi.registerSeller(data);
      setUser(res.user);
      setSellerProfile(res.profile);
      const demos = await authApi.getDemoUsers();
      setDemoUsers(demos);
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
      setUser(null);
      setSellerProfile(null);
      setBuyerProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const switchUser = async (userId: string) => {
    setIsLoading(true);
    try {
      const switched = await authApi.quickSwitchUser(userId);
      setUser(switched);
      await loadProfilesForUser(switched);
      return switched;
    } finally {
      setIsLoading(false);
    }
  };

  const resetAllDemoData = async () => {
    setIsLoading(true);
    try {
      resetStorageToDefaults();
      // Keep admin as default or clear user
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      await loadProfilesForUser(currentUser);
      const demos = await authApi.getDemoUsers();
      setDemoUsers(demos);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        sellerProfile,
        buyerProfile,
        isLoading,
        demoUsers,
        login,
        registerBuyer,
        registerSeller,
        logout,
        switchUser,
        refreshUser,
        resetAllDemoData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
