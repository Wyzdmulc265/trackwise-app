// Shared types between server and client
// This file mirrors src/types.ts but with PostgreSQL-specific additions

export type TransactionType = 'sale' | 'purchase' | 'expense';
export type UserRole = 'Admin' | 'Accountant' | 'Viewer';
export type ApprovalKind = 'transaction' | 'inventory';
export type ApprovalAction = 'create' | 'update' | 'delete';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

// Database entities with IDs
export interface User {
  id: string;
  tenant_id: string; // business/tenant UUID
  owner_name: string;
  username: string;
  business_name: string;
  contact: string;
  password_hash: string;
  role: UserRole;
  must_change_password: boolean;
  created_at: string;
  created_by?: string;
  updated_at: string;
}

export interface Category {
  id: string;
  tenant_id: string;
  name: string;
  type: TransactionType;
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: string;
  tenant_id: string;
  name: string;
  sku: string;
  unit_cost: number;
  unit_price: number;
  quantity: number;
  low_stock_threshold: number;
  sales_count: number;
  revenue: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  tenant_id: string;
  type: TransactionType;
  date: string;
  category: string;
  amount: number;
  description: string;
  item_id?: string;
  quantity?: number;
  created_at: string;
  created_by: string;
  updated_at: string;
}

export interface PendingApproval {
  id: string;
  tenant_id: string;
  kind: ApprovalKind;
  action: ApprovalAction;
  payload: unknown; // JSONB - varies by kind/action
  target_id?: string;
  target_snapshot?: unknown; // JSONB - snapshot of target before change
  requested_by: string;
  requested_at: string;
  status: ApprovalStatus;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
}

export interface HistoryLog {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  old_values?: unknown;
  new_values?: unknown;
  changed_by: string;
  changed_at: string;
  ip_address?: string;
  user_agent?: string;
}

export interface Report {
  id: string;
  tenant_id: string;
  name: string;
  type: string;
  parameters?: unknown;
  data?: unknown;
  generated_by: string;
  generated_at: string;
  expires_at?: string;
  is_template: boolean;
}

// Refresh token storage
export interface RefreshToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  created_at: string;
  revoked: boolean;
}

// Auth session payload (JWT claims)
export interface AuthPayload {
  userId: string;
  username: string;
  businessName: string;
  ownerName: string;
  role: UserRole;
  businessKey: string;
  tenantId: string;
  mustChangePassword: boolean;
}

// API Request/Response types
export interface ApiError {
  error: string;
  details?: string;
  code?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Business/Tenant
export interface Business {
  id: string;
  tenant_id: string;
  name: string;
  owner_name: string;
  contact: string;
  created_at: string;
  updated_at: string;
}
