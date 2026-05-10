import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { User, AuthSession, UserRole } from '../types';
import { authApi, usersApi, refreshAuthTokens } from '../lib/api';

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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session from stored tokens
  useEffect(() => {
    const initAuth = async () => {
      const accessToken = localStorage.getItem('tw_access_token');
      const refreshToken = localStorage.getItem('tw_refresh_token');

      if (!accessToken || !refreshToken) {
        setIsLoading(false);
        return;
      }

      // Try to get current session
      const result = await authApi.getMe();
      if (result.data) {
        setSession(result.data.session);
      } else {
        // Try to refresh tokens
        const refreshed = await refreshAuthTokens();
        if (refreshed) {
          const retryResult = await authApi.getMe();
          if (retryResult.data) {
            setSession(retryResult.data.session);
          }
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (username: string, businessName: string, password: string) => {
    setIsLoading(true);
    try {
      const result = await authApi.login(username, businessName, password);
      if (result.error) {
        return { success: false, error: result.error };
      }

      if (result.data) {
        localStorage.setItem('tw_access_token', result.data.accessToken);
        localStorage.setItem('tw_refresh_token', result.data.refreshToken);
        setSession(result.data.user);
        return { success: true };
      }

      return { success: false, error: 'Login failed' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    setIsLoading(true);
    try {
      const result = await authApi.register(data);
      if (result.error) {
        return { success: false, error: result.error };
      }

      if (result.data) {
        localStorage.setItem('tw_access_token', result.data.accessToken);
        localStorage.setItem('tw_refresh_token', result.data.refreshToken);
        setSession(result.data.user);
        return { success: true };
      }

      return { success: false, error: 'Registration failed' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('tw_refresh_token');
    if (refreshToken) {
      await authApi.logout(refreshToken);
    }

    localStorage.removeItem('tw_access_token');
    localStorage.removeItem('tw_refresh_token');
    setSession(null);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const result = await authApi.changePassword(currentPassword, newPassword);
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true };
  }, []);

  const listBusinessUsers = useCallback(async (): Promise<User[]> => {
    const result = await usersApi.list();
    if (result.error) throw new Error(result.error);
    return result.data?.users || [];
  }, []);

  const createUser = useCallback(async (data: CreateUserData) => {
    const result = await usersApi.create(data);
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true };
  }, []);

  const updateUser = useCallback(async (userId: string, fields: Partial<Pick<User, 'ownerName' | 'contact' | 'role'>>) => {
    const result = await usersApi.update(userId, fields);
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true };
  }, []);

  const deleteUser = useCallback(async (userId: string) => {
    const result = await usersApi.delete(userId);
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true };
  }, []);

  const resetUserPassword = useCallback(async (userId: string, tempPassword: string) => {
    const result = await usersApi.resetPassword(userId, tempPassword);
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true };
  }, []);

  const value: AuthContextProps = {
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};