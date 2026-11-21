import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, MemberProfile } from '../../types';
import { authApi, memberApi } from '../../services/api';
import type { LoginCredentials, RegisterMemberData } from '../../services/api';
import { resetStorageToDefaults } from '../../services/mockStorage';

interface DemoUserOption {
  user: User;
  label: string;
  description: string;
  sellerStatus?: string;
}

interface AuthContextType {
  user: User | null;
  /** The single member profile (business details + locations). */
  memberProfile: MemberProfile | null;
  isLoading: boolean;
  demoUsers: DemoUserOption[];
  login: (credentials: LoginCredentials) => Promise<User>;
  registerMember: (data: RegisterMemberData) => Promise<User>;
  logout: () => Promise<void>;
  switchUser: (userId: string) => Promise<User>;
  refreshUser: () => Promise<void>;
  resetAllDemoData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [memberProfile, setMemberProfile] = useState<MemberProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [demoUsers, setDemoUsers] = useState<DemoUserOption[]>([]);

  const loadProfileForUser = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setMemberProfile(null);
      return;
    }

    try {
      const profile = await memberApi.getMemberProfile(currentUser.id);
      setMemberProfile(profile);
    } catch (err) {
      console.error('Error loading member profile:', err);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      await loadProfileForUser(currentUser);
      const demos = await authApi.getDemoUsers();
      setDemoUsers(demos);
    } catch (err) {
      console.error('Failed to refresh user:', err);
    }
  }, [loadProfileForUser]);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      try {
        const currentUser = await authApi.getCurrentUser();
        setUser(currentUser);
        await loadProfileForUser(currentUser);
        const demos = await authApi.getDemoUsers();
        setDemoUsers(demos);
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [loadProfileForUser]);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const loggedIn = await authApi.login(credentials);
      setUser(loggedIn);
      await loadProfileForUser(loggedIn);
      return loggedIn;
    } finally {
      setIsLoading(false);
    }
  };

  const registerMember = async (data: RegisterMemberData) => {
    setIsLoading(true);
    try {
      const newUser = await authApi.registerMember(data);
      setUser(newUser);
      await loadProfileForUser(newUser);
      const demos = await authApi.getDemoUsers();
      setDemoUsers(demos);
      return newUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
      setUser(null);
      setMemberProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const switchUser = async (userId: string) => {
    setIsLoading(true);
    try {
      const switched = await authApi.quickSwitchUser(userId);
      setUser(switched);
      await loadProfileForUser(switched);
      return switched;
    } finally {
      setIsLoading(false);
    }
  };

  const resetAllDemoData = async () => {
    setIsLoading(true);
    try {
      resetStorageToDefaults();
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      await loadProfileForUser(currentUser);
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
        memberProfile,
        isLoading,
        demoUsers,
        login,
        registerMember,
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
