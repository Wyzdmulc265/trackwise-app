import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  ownerName: z.string().min(1, 'Owner name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  businessName: z.string().min(1, 'Business name is required'),
  contact: z.string().min(1, 'Contact is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  businessName: z.string().min(1, 'Business name is required'),
  password: z.string().min(1, 'Password is required'),
});

// User management schemas (admin only)
export const createUserSchema = z.object({
  ownerName: z.string().min(1, 'Owner name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  contact: z.string().min(1, 'Contact is required'),
  role: z.enum(['Admin', 'Accountant', 'Viewer']),
  tempPassword: z.string().min(6, 'Temporary password must be at least 6 characters'),
});

export const updateUserSchema = z.object({
  ownerName: z.string().min(1).optional(),
  contact: z.string().min(1).optional(),
  role: z.enum(['Admin', 'Accountant', 'Viewer']).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

// Category schemas
export const createCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required'),
  type: z.enum(['sale', 'purchase', 'expense']),
});

// Inventory schemas
export const createInventorySchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  sku: z.string().min(1, 'SKU is required'),
  unitCost: z.number().min(0, 'Unit cost must be positive'),
  unitPrice: z.number().min(0, 'Unit price must be positive'),
  quantity: z.number().int().min(0, 'Quantity must be non-negative'),
  lowStockThreshold: z.number().int().min(0, 'Threshold must be non-negative').default(5),
});

export const updateInventorySchema = z.object({
  name: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  unitCost: z.number().min(0).optional(),
  unitPrice: z.number().min(0).optional(),
  quantity: z.number().int().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

// Transaction schemas
export const createTransactionSchema = z.object({
  type: z.enum(['sale', 'purchase', 'expense']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  category: z.string().min(1, 'Category is required'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  itemId: z.string().optional(),
  quantity: z.number().int().positive().optional(),
}).refine(data => {
  if ((data.itemId && !data.quantity) || (!data.itemId && data.quantity)) {
    return false;
  }
  return true;
}, {
  message: 'Both itemId and quantity must be provided together, or both omitted',
});

export const updateTransactionSchema = z.object({
  type: z.enum(['sale', 'purchase', 'expense']).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  category: z.string().min(1, 'Category is required').optional(),
  amount: z.number().positive('Amount must be positive').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  itemId: z.string().optional(),
  quantity: z.number().int().positive().optional(),
}).refine(
  data => !(data.itemId && !data.quantity) && !(!data.itemId && data.quantity),
  { message: 'Both itemId and quantity must be provided together, or both omitted' }
).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided',
});

// Approval schemas
export const approveSchema = z.object({
  reviewNotes: z.string().optional(),
});

export const rejectSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
});

// Report schemas
export const generateReportSchema = z.object({
  type: z.enum(['sales', 'inventory', 'financial', 'custom']),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: z.string().optional(),
});
