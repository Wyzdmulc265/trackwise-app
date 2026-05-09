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

const API_BASE = import.meta.env.VITE_API_URL || '/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  details?: unknown;
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(localStorage.getItem('tw_access_token') && {
          Authorization: `Bearer ${localStorage.getItem('tw_access_token')}`,
        }),
        ...options.headers,
      } as HeadersInit,
    });

    const body = await response.json();

    if (!response.ok) {
      return { error: body.error || 'Request failed', details: body.details };
    }

    return { data: body as T };
  } catch (err) {
    return { error: 'Network error - failed to connect to server' };
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
  list: () => fetchApi<{ categories: Category[]; count: number }>('/categories'),

  listByType: (type: 'sale' | 'purchase' | 'expense') =>
    fetchApi<{ categories: Category[]; count: number }>(`/categories/type/${type}`),

  create: (name: string, type: 'sale' | 'purchase' | 'expense') =>
    fetchApi<{ category: Category; message: string }>('/categories', {
      method: 'POST',
      body: JSON.stringify({ name, type }),
    }),

  delete: (categoryId: string) =>
    fetchApi<{ message: string }>(`/categories/${categoryId}`, {
      method: 'DELETE',
    }),
};

// ─── Inventory API ─────────────────────────────────────────────────────────────
export const inventoryApi = {
  list: () => fetchApi<{ inventory: InventoryItem[]; count: number }>('/inventory'),

  get: (itemId: string) => fetchApi<{ item: InventoryItem }>(`/inventory/${itemId}`),

  getLowStock: () => fetchApi<{ lowStockItems: (InventoryItem & { quantity: number; lowStockThreshold: number })[]; count: number }>('/inventory/low-stock'),

  create: (data: {
    name: string;
    sku: string;
    unitCost: number;
    unitPrice: number;
    quantity: number;
    lowStockThreshold?: number;
  }) =>
    fetchApi<{ item: InventoryItem; message: string; queued: boolean; approvalId?: string }>('/inventory', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (itemId: string, data: Partial<Omit<InventoryItem, 'id' | 'tenant_id' | 'created_at' | 'updated_at' | 'salesCount' | 'revenue'>>) =>
    fetchApi<{ item: InventoryItem; message: string; queued: boolean; approvalId?: string }>(`/inventory/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (itemId: string) =>
    fetchApi<{ message: string; queued: boolean; approvalId?: string }>(`/inventory/${itemId}`, {
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

// Health check
export const checkHealth = () => fetchApi<{ status: string; timestamp: string; uptime: number }>('/health');
