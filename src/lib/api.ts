/// <reference types="vite/client" />

import type {
  User,
  Category,
  InventoryItem,
  Transaction,
  TransactionType,
  PendingApproval,
  AuthSession
} from '../types';

// ─── Helper function for API calls ────────────────────────────────────────────
const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3000' : '';

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<{ data?: T; error?: string }> {
  try {
    const url = `${API_BASE_URL}/api${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
        // Include auth token if available
        ...(localStorage.getItem('tw_access_token') && {
          Authorization: `Bearer ${localStorage.getItem('tw_access_token')}`,
        }),
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }));
      return { error: errorData.error || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('API call failed:', error);
    return { error: 'Network error' };
  }
}

// ─── Auth API ──────────────────────────────────────────────────────────────────
export const authApi = {
  login: (username: string, businessName: string, password: string) =>
    fetchApi<{ user: AuthSession; accessToken: string; refreshToken: string; message: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, businessName, password }),
    }),

  register: (data: {
    ownerName: string;
    username: string;
    businessName: string;
    contact: string;
    password: string;
    confirmPassword: string;
  }) =>
    fetchApi<{ user: AuthSession; accessToken: string; refreshToken: string; message: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMe: () => fetchApi<{ session: AuthSession }>('/auth/me'),

  refreshTokens: (refreshToken: string) =>
    fetchApi<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  logout: (refreshToken: string) =>
    fetchApi<{ message: string }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    fetchApi<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
};

// ─── Users API ─────────────────────────────────────────────────────────────────
export const usersApi = {
  list: () => fetchApi<{ users: User[]; count: number }>('/users'),

  create: (data: {
    ownerName: string;
    username: string;
    contact: string;
    role: 'Admin' | 'Accountant' | 'Viewer';
    tempPassword: string;
  }) =>
    fetchApi<{ user: User; message: string }>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (userId: string, data: Partial<Pick<User, 'ownerName' | 'contact' | 'role'>>) =>
    fetchApi<{ user: User; message: string }>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (userId: string) =>
    fetchApi<{ message: string }>(`/users/${userId}`, {
      method: 'DELETE',
    }),

  resetPassword: (userId: string, tempPassword: string) =>
    fetchApi<{ message: string }>(`/users/${userId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ tempPassword }),
    }),
};

// ─── Categories API ────────────────────────────────────────────────────────────
export const categoriesApi = {
  list: (businessKey?: string) => {
    const params = businessKey ? `?businessKey=${encodeURIComponent(businessKey)}` : '';
    return fetchApi<{ categories: Category[] }>(`/categories${params}`);
  },

  create: (data: Omit<Category, 'id'>) =>
    fetchApi<{ category: Category; message: string }>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Omit<Category, 'id'>>) =>
    fetchApi<{ category: Category; message: string }>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<{ message: string }>(`/categories/${id}`, {
      method: 'DELETE',
    }),
};

// ─── Inventory API ─────────────────────────────────────────────────────────────
export const inventoryApi = {
  list: (businessKey?: string) => {
    const params = businessKey ? `?businessKey=${encodeURIComponent(businessKey)}` : '';
    return fetchApi<{ inventory: InventoryItem[] }>(`/inventory${params}`);
  },

  create: (data: Omit<InventoryItem, 'id'>) =>
    fetchApi<{ item: InventoryItem; message: string }>('/inventory', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Omit<InventoryItem, 'id'>>) =>
    fetchApi<{ item: InventoryItem; message: string }>(`/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    fetchApi<{ message: string }>(`/inventory/${id}`, {
      method: 'DELETE',
    }),
};

// ─── Transactions API ──────────────────────────────────────────────────────────
export const transactionsApi = {
  list: (params?: {
    type?: TransactionType;
    category?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    const query = searchParams.toString();
    return fetchApi<{ transactions: Transaction[]; pagination: { total: number; limit: number; offset: number; hasMore: boolean } }>(
      `/transactions${query ? `?${query}` : ''}`
    );
  },

  get: (txId: string) => fetchApi<{ transaction: Transaction }>(`/transactions/${txId}`),

  create: (data: {
    type: TransactionType;
    date: string;
    category: string;
    amount: number;
    description: string;
    itemId?: string;
    quantity?: number;
  }) =>
    fetchApi<{ transaction: Transaction; message: string; queued: boolean; approvalId?: string }>('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (txId: string, data: Partial<Omit<Transaction, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'created_by'>>) =>
    fetchApi<{ transaction: Transaction; message: string; queued: boolean; approvalId?: string }>(`/transactions/${txId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (txId: string) =>
    fetchApi<{ message: string; queued: boolean; approvalId?: string }>(`/transactions/${txId}`, {
      method: 'DELETE',
    }),
};

// ─── Approvals API ─────────────────────────────────────────────────────────────
export const approvalsApi = {
  list: (status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending') =>
    fetchApi<{ approvals: PendingApproval[]; count: number }>(`/approvals/${status}`),

  get: (approvalId: string) => fetchApi<{ approval: PendingApproval }>(`/approvals/${approvalId}`),

  approve: (approvalId: string, reviewNotes?: string) =>
    fetchApi<{ message: string }>(`/approvals/${approvalId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ reviewNotes }),
    }),

  reject: (approvalId: string, reason: string) =>
    fetchApi<{ message: string }>(`/approvals/${approvalId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

// ─── Token refresh helper ──────────────────────────────────────────────────────
export const refreshAuthTokens = async (): Promise<boolean> => {
  const refreshToken = localStorage.getItem('tw_refresh_token');
  if (!refreshToken) return false;

  const result = await authApi.refreshTokens(refreshToken);
  if (result.error || !result.data) return false;

  localStorage.setItem('tw_access_token', result.data.accessToken);
  localStorage.setItem('tw_refresh_token', result.data.refreshToken);
  return true;
};