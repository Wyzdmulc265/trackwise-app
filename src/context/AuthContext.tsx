import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, AuthSession, UserRole } from '../types';
import { authApi, refreshAuthTokens, usersApi } from '../lib/api';

interface AuthContextProps {
  session: AuthSession | null;
  isLoading: boolean;
  login: (username: string, businessName: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  // User management (admin)
  listBusinessUsers: () => Promise<User[]>;
  createUser: (data: CreateUserData) => Promise<{ success: boolean; error?: string }>;
  updateUser: (userId: string, fields: Partial<Pick<User, 'ownerName' | 'contact' | 'role'>>) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (userId: string) => Promise<{ success: boolean; error?: string }>;
  resetUserPassword: (userId: string, tempPassword: string) => Promise<{ success: boolean; error?: string }>;
}

export interface RegisterData {
  ownerName: string;
  username: string;
  businessName: string;
  contact: string;
  password: string;
  confirmPassword: string;
}

export interface CreateUserData {
  ownerName: string;
  username: string;
  contact: string;
  role: UserRole;
  tempPassword: string;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('tw_access_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Try to fetch current session
      const result = await authApi.getMe();
      if (result.data?.session) {
        setSession(result.data.session);
      } else {
        // Token might be expired, try refresh
        const refreshed = await refreshAuthTokens();
        if (refreshed) {
          const retry = await authApi.getMe();
          if (retry.data?.session) {
            setSession(retry.data.session);
            setIsLoading(false);
            return;
          }
        }
        // Clear invalid tokens
        localStorage.removeItem('tw_access_token');
        localStorage.removeItem('tw_refresh_token');
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const storeTokens = (accessToken: string, refreshToken: string) => {
    localStorage.setItem('tw_access_token', accessToken);
    localStorage.setItem('tw_refresh_token', refreshToken);
  };

  const clearTokens = () => {
    localStorage.removeItem('tw_access_token');
    localStorage.removeItem('tw_refresh_token');
  };

  const register = useCallback(async (data: RegisterData): Promise<{ success: boolean; error?: string }> => {
    const result = await authApi.register(data);
    if (result.error || !result.data) {
      return { success: false, error: result.error || 'Registration failed' };
    }

    // Store tokens and session
    storeTokens(result.data.accessToken, result.data.refreshToken);
    setSession(result.data.user);
    return { success: true };
  }, []);

  const login = useCallback(async (username: string, businessName: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const result = await authApi.login(username, businessName, password);
    if (result.error || !result.data) {
      return { success: false, error: result.error || 'Login failed' };
    }

    storeTokens(result.data.accessToken, result.data.refreshToken);
    setSession(result.data.user);
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    const refreshToken = localStorage.getItem('tw_refresh_token');
    if (refreshToken) {
      authApi.logout(refreshToken).catch(console.error);
    }
    clearTokens();
    setSession(null);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    const result = await authApi.changePassword(currentPassword, newPassword);
    if (result.error) {
      return { success: false, error: result.error };
    }
    // Force logout all devices on password change
    clearTokens();
    setSession(null);
    return { success: true };
  }, []);

  const listBusinessUsers = useCallback(async (): Promise<User[]> => {
    if (!session) return [];
    const result = await usersApi.list();
    if (result.error || !result.data) {
      console.error('Failed to fetch users:', result.error);
      return [];
    }
    return result.data.users;
  }, [session]);

  const createUser = useCallback(async (data: CreateUserData): Promise<{ success: boolean; error?: string }> => {
    const result = await usersApi.create(data);
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true };
  }, []);

  const updateUser = useCallback(async (userId: string, fields: Partial<Pick<User, 'ownerName' | 'contact' | 'role'>>): Promise<{ success: boolean; error?: string }> => {
    const result = await usersApi.update(userId, fields);
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true };
  }, []);

  const deleteUser = useCallback(async (userId: string): Promise<{ success: boolean; error?: string }> => {
    const result = await usersApi.delete(userId);
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true };
  }, []);

  const resetUserPassword = useCallback(async (userId: string, tempPassword: string): Promise<{ success: boolean; error?: string }> => {
    const result = await usersApi.resetPassword(userId, tempPassword);
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        login,
        register,
        logout,
        changePassword,
        listBusinessUsers,
        createUser,
        updateUser,
        deleteUser,
        resetUserPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
