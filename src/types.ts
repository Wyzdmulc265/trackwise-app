export type TransactionType = 'sale' | 'purchase' | 'expense';

export type UserRole = 'Admin' | 'Accountant' | 'Viewer';

export interface User {
  id: string;
  ownerName: string;
  username: string;
  businessName: string;
  businessKey: string; // shared across all users of the same business
  contact: string;
  passwordHash: string;
  role: UserRole;
  mustChangePassword: boolean;
  createdAt: string;
  createdBy?: string; // username of admin who created this account
}

export interface AuthSession {
  userId: string;
  username: string;
  businessName: string;
  ownerName: string;
  role: UserRole;
  businessKey: string;
  mustChangePassword: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: 'sale' | 'expense' | 'purchase';
  isCustom?: boolean;
}

export interface InventoryItem {
   id: string;
   name: string;
   sku: string;
   unitCost: number;
   unitPrice: number;
   quantity: number;
   lowStockThreshold: number;
   salesCount: number;
   revenue: number;
   cogs: number;
   measurementUnit: string;
 }

export interface Transaction {
  id: string;
  type: TransactionType;
  date: string;
  category: string;
  amount: number;
  description: string;
  itemId?: string;
  quantity?: number;
}

export type TimeFilter = 'today' | 'week' | 'month' | 'all';

export interface DashboardSummary {
  sales: number;
  purchases: number;
  expenses: number;
  netProfit: number;
}

// ─── Approval system ─────────────────────────────────────────────────────────
export type ApprovalKind = 'transaction' | 'inventory';
export type ApprovalAction = 'create' | 'update' | 'delete';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export type TransactionCreateApprovalPayload = Omit<Transaction, 'id'>;
export type TransactionUpdateApprovalPayload = Transaction;
export type TransactionDeleteApprovalPayload = null;

export type InventoryCreateApprovalPayload = Omit<InventoryItem, 'id' | 'salesCount' | 'revenue'>;
export type InventoryUpdateApprovalPayload = Partial<InventoryItem>;
export type InventoryDeleteApprovalPayload = null;

export type PendingApprovalPayload =
  | TransactionCreateApprovalPayload
  | TransactionUpdateApprovalPayload
  | TransactionDeleteApprovalPayload
  | InventoryCreateApprovalPayload
  | InventoryUpdateApprovalPayload
  | InventoryDeleteApprovalPayload;

export type ApprovalQueueEntry = Omit<PendingApproval, 'id' | 'requestedAt' | 'status'>;

export interface PendingApproval {
  id: string;
  kind: ApprovalKind;
  action: ApprovalAction;
  payload: PendingApprovalPayload;
  targetId?: string;
  targetSnapshot?: Transaction | InventoryItem | null;
  requestedBy: string;
  requestedAt: string;
  status: ApprovalStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  summary: string;
}
