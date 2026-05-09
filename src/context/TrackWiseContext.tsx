import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Transaction, InventoryItem, Category, PendingApproval } from '../types';
import { useAuth } from './AuthContext';
import {
  transactionsApi,
  inventoryApi,
  categoriesApi,
  approvalsApi,
} from '../lib/api';

const parseNumber = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeTransaction = (tx: any): Transaction => ({
  id: tx.id,
  type: tx.type,
  date: tx.date,
  category: tx.category,
  amount: parseNumber(tx.amount),
  description: tx.description,
  itemId: tx.itemId ?? tx.item_id,
  quantity: tx.quantity !== undefined ? parseNumber(tx.quantity) : undefined,
});

const normalizeInventoryItem = (item: any): InventoryItem => ({
  id: item.id,
  name: item.name,
  sku: item.sku,
  unitCost: parseNumber(item.unitCost ?? item.unit_cost),
  unitPrice: parseNumber(item.unitPrice ?? item.unit_price),
  quantity: parseNumber(item.quantity),
  lowStockThreshold: parseNumber(item.lowStockThreshold ?? item.low_stock_threshold),
  salesCount: parseNumber(item.salesCount ?? item.sales_count),
  revenue: parseNumber(item.revenue),
  cogs: parseNumber(item.cogs),
  measurementUnit: item.measurementUnit ?? item.measurement_unit ?? 'Pieces',
});

export type MutationResult = { ok: true; queued: boolean; message: string } | { ok: false; message: string };

interface TrackWiseContextProps {
  transactions: Transaction[];
  inventory: InventoryItem[];
  categories: Category[];
  approvals: PendingApproval[];
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Loading states
  isLoading: boolean;
  isSubmitting: boolean;

  // Transaction mutations (role-aware)
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<MutationResult>;
  updateTransaction: (id: string, tx: Transaction) => Promise<MutationResult>;
  deleteTransaction: (id: string) => Promise<MutationResult>;

  // Inventory mutations (role-aware)
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'salesCount' | 'revenue' | 'cogs'>) => Promise<MutationResult>;
  updateInventoryItem: (id: string, item: Partial<InventoryItem>) => Promise<MutationResult>;
  deleteInventoryItem: (id: string) => Promise<MutationResult>;

  // Category mutations (admin-only by UI)
  addCategory: (name: string, type: 'sale' | 'expense' | 'purchase') => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Approval review (admin)
  approveRequest: (id: string) => Promise<MutationResult>;
  rejectRequest: (id: string, reason?: string) => Promise<MutationResult>;

  // Refresh data from server
  refreshAll: () => Promise<void>;
}

const TrackWiseContext = createContext<TrackWiseContextProps | undefined>(undefined);

export const TrackWiseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all data from API
  const refreshAll = useCallback(async () => {
    if (!session) return;

    setIsLoading(true);
    try {
      const [txRes, invRes, catRes, aprRes] = await Promise.all([
        transactionsApi.list(),
        inventoryApi.list(),
        categoriesApi.list(),
        approvalsApi.list('pending'),
      ]);

      if (txRes.data) setTransactions(txRes.data.transactions.map(normalizeTransaction));
      if (invRes.data) setInventory(invRes.data.inventory.map(normalizeInventoryItem));
      if (catRes.data) setCategories(catRes.data.categories);
      if (aprRes.data) setApprovals(aprRes.data.approvals);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // Initial data load
  useEffect(() => {
    if (session) {
      // Avoid calling admin-only approvals endpoint for non-admin users
      if (session.role === 'Admin') {
        refreshAll();
      } else {
        // Only load non-approval data
        setIsLoading(true);
        Promise.all([transactionsApi.list(), inventoryApi.list(), categoriesApi.list()])
          .then(([txRes, invRes, catRes]) => {
            if (txRes.data) setTransactions(txRes.data.transactions.map(normalizeTransaction));
            if (invRes.data) setInventory(invRes.data.inventory.map(normalizeInventoryItem));
            if (catRes.data) setCategories(catRes.data.categories);
            setApprovals([]); // no admin approvals for accountants
          })
          .catch((error) => console.error('Failed to load data:', error))
          .finally(() => setIsLoading(false));
      }
    } else {
      setTransactions([]);
      setInventory([]);
      setCategories([]);
      setApprovals([]);
    }
  }, [session, refreshAll]);

  // Real-time-ish sync for approvals: keep pending approvals updated across sessions
  useEffect(() => {
    // NOTE:
    // GET /api/approvals/pending is admin-only (403 for accountants).
    // Poll only when the logged-in user is an Admin.
    if (!session) return;
    if (session.role !== 'Admin') return;

    let cancelled = false;

    let inFlight = false;

    const syncPendingApprovals = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const aprRes = await approvalsApi.list('pending');
        if (cancelled) return;
        if (aprRes.data) setApprovals(aprRes.data.approvals);
      } catch (e) {
        console.error('Failed to sync pending approvals:', e);
      } finally {
        inFlight = false;
      }
    };

    // Do an immediate sync (so it feels instant when switching tabs/users)
    syncPendingApprovals();

    // Poll less frequently to stay under the global 100-request / 15-minute API rate limit.
    const intervalMs = 30_000;
    const id = window.setInterval(syncPendingApprovals, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [session]);


  // ─── Transaction mutations ────────────────────────────────────────────────
  const addTransaction = useCallback(async (data: Omit<Transaction, 'id'>): Promise<MutationResult> => {
    if (!session) return { ok: false, message: 'Not authenticated' };

    setIsSubmitting(true);
    try {
      const result = await transactionsApi.create(data);

      if (result.error) {
        return { ok: false, message: result.error };
      }

      if (result.data?.queued) {
        // Refresh approvals list to show new pending request
        const aprRes = await approvalsApi.list('pending');
        if (aprRes.data) setApprovals(aprRes.data.approvals);
        return { ok: true, queued: true, message: result.data.message || 'Submitted for admin approval.' };
      }

      // Direct creation - add to local state
      if (result.data?.transaction) {
        setTransactions((prev) => [normalizeTransaction(result.data!.transaction), ...prev]);
        // Also update inventory if item linked
        if (data.itemId && data.quantity !== undefined) {
          const itemId = data.itemId;
          const qty = data.quantity;
          setInventory((prev) =>
            prev.map((item) => {
              if (item.id !== itemId) return item;
              let q = item.quantity;
              let sc = item.salesCount;
              let rev = item.revenue;
              if (data.type === 'sale') {
                q = Math.max(0, q - qty);
                sc += qty;
                rev += data.amount;
              } else if (data.type === 'purchase') {
                q += qty;
              }
              return normalizeInventoryItem({ ...item, quantity: q, salesCount: sc, revenue: rev });
            })
          );
        }
      }

      return { ok: true, queued: false, message: 'Transaction recorded.' };
    } finally {
      setIsSubmitting(false);
    }
  }, [session]);

  const updateTransaction = useCallback(async (id: string, updatedTx: Transaction): Promise<MutationResult> => {
    if (!session) return { ok: false, message: 'Not authenticated' };

    setIsSubmitting(true);
    try {
      const result = await transactionsApi.update(id, updatedTx);

      if (result.error) {
        return { ok: false, message: result.error };
      }

      if (result.data?.queued) {
        const aprRes = await approvalsApi.list('pending');
        if (aprRes.data) setApprovals(aprRes.data.approvals);
        return { ok: true, queued: true, message: result.data.message || 'Edit submitted for admin approval.' };
      }

      if (result.data?.transaction) {
        setTransactions((prev) => prev.map((tx) => (tx.id === id ? normalizeTransaction(result.data!.transaction) : tx)));
      }

      return { ok: true, queued: false, message: 'Transaction updated.' };
    } finally {
      setIsSubmitting(false);
    }
  }, [session]);

  const deleteTransaction = useCallback(async (id: string): Promise<MutationResult> => {
    if (!session) return { ok: false, message: 'Not authenticated' };

    setIsSubmitting(true);
    try {
      const result = await transactionsApi.delete(id);

      if (result.error) {
        return { ok: false, message: result.error };
      }

      if (result.data?.queued) {
        const aprRes = await approvalsApi.list('pending');
        if (aprRes.data) setApprovals(aprRes.data.approvals);
        return { ok: true, queued: true, message: result.data.message || 'Delete request submitted for admin approval.' };
      }

      setTransactions((prev) => prev.filter((tx) => tx.id !== id));
      return { ok: true, queued: false, message: 'Transaction deleted.' };
    } finally {
      setIsSubmitting(false);
    }
  }, [session]);

  // ─── Inventory mutations ───────────────────────────────────────────────────
  const addInventoryItem = useCallback(async (data: Omit<InventoryItem, 'id' | 'salesCount' | 'revenue' | 'cogs'>): Promise<MutationResult> => {
    if (!session) return { ok: false, message: 'Not authenticated' };

    setIsSubmitting(true);
    try {
      const result = await inventoryApi.create(data);

      if (result.error) {
        return { ok: false, message: result.error };
      }

      if (result.data?.queued) {
        const aprRes = await approvalsApi.list('pending');
        if (aprRes.data) setApprovals(aprRes.data.approvals);
        return { ok: true, queued: true, message: result.data.message || 'New product submitted for admin approval.' };
      }

      if (result.data?.item) {
        setInventory((prev) => [...prev, normalizeInventoryItem(result.data!.item)]);
      }

      return { ok: true, queued: false, message: 'Product added to inventory.' };
    } finally {
      setIsSubmitting(false);
    }
  }, [session]);

  const updateInventoryItem = useCallback(async (id: string, fields: Partial<InventoryItem>): Promise<MutationResult> => {
    if (!session) return { ok: false, message: 'Not authenticated' };

    setIsSubmitting(true);
    try {
      const result = await inventoryApi.update(id, fields);

      if (result.error) {
        return { ok: false, message: result.error };
      }

      if (result.data?.queued) {
        const aprRes = await approvalsApi.list('pending');
        if (aprRes.data) setApprovals(aprRes.data.approvals);
        return { ok: true, queued: true, message: result.data.message || 'Inventory edit submitted for admin approval.' };
      }

      if (result.data?.item) {
        setInventory((prev) => prev.map((item) => (item.id === id ? normalizeInventoryItem(result.data!.item) : item)));
      }

      return { ok: true, queued: false, message: 'Inventory updated.' };
    } finally {
      setIsSubmitting(false);
    }
  }, [session]);

  const deleteInventoryItem = useCallback(async (id: string): Promise<MutationResult> => {
    if (!session) return { ok: false, message: 'Not authenticated' };

    setIsSubmitting(true);
    try {
      const result = await inventoryApi.delete(id);

      if (result.error) {
        return { ok: false, message: result.error };
      }

      if (result.data?.queued) {
        const aprRes = await approvalsApi.list('pending');
        if (aprRes.data) setApprovals(aprRes.data.approvals);
        return { ok: true, queued: true, message: result.data.message || 'Delete request submitted for admin approval.' };
      }

      setInventory((prev) => prev.filter((item) => item.id !== id));
      return { ok: true, queued: false, message: 'Product deleted.' };
    } finally {
      setIsSubmitting(false);
    }
  }, [session]);

  // ─── Categories ────────────────────────────────────────────────────────────
  const addCategory = useCallback(async (name: string, type: 'sale' | 'expense' | 'purchase') => {
    const result = await categoriesApi.create(name, type);
    if (!result.error && result.data?.category) {
      setCategories((prev) => [...prev, result.data!.category]);
    }
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    const result = await categoriesApi.delete(id);
    if (!result.error) {
      setCategories((prev) => prev.filter((cat) => cat.id !== id));
    }
  }, []);

  // ─── Approval review ────────────────────────────────────────────────────────
  const approveRequest = useCallback(async (id: string): Promise<MutationResult> => {
    if (!session) return { ok: false, message: 'Not authenticated' };

    setIsSubmitting(true);
    try {
      const result = await approvalsApi.approve(id);

      if (result.error) {
        return { ok: false, message: result.error };
      }

      // Refresh everything (since approval may have created/updated/deleted data)
      await refreshAll();
      return { ok: true, queued: false, message: 'Approval granted.' };
    } finally {
      setIsSubmitting(false);
    }
  }, [session, refreshAll]);

  const rejectRequest = useCallback(async (id: string, reason?: string): Promise<MutationResult> => {
    if (!session) return { ok: false, message: 'Not authenticated' };

    setIsSubmitting(true);
    try {
      const result = await approvalsApi.reject(id, reason || 'No reason provided');

      if (result.error) {
        return { ok: false, message: result.error };
      }

      // Refresh approvals
      const aprRes = await approvalsApi.list('pending');
      if (aprRes.data) setApprovals(aprRes.data.approvals);

      return { ok: true, queued: false, message: 'Approval rejected.' };
    } finally {
      setIsSubmitting(false);
    }
  }, [session]);

  return (
    <TrackWiseContext.Provider
      value={{
        transactions,
        inventory,
        categories,
        approvals,
        activeTab,
        setActiveTab,
        isLoading,
        isSubmitting,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addInventoryItem,
        updateInventoryItem,
        deleteInventoryItem,
        addCategory,
        deleteCategory,
        approveRequest,
        rejectRequest,
        refreshAll,
      }}
    >
      {children}
    </TrackWiseContext.Provider>
  );
};

export const useTrackWise = () => {
  const ctx = useContext(TrackWiseContext);
  if (!ctx) throw new Error('useTrackWise must be used within TrackWiseProvider');
  return ctx;
};
