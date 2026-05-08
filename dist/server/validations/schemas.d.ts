import { z } from 'zod';
export declare const registerSchema: z.ZodObject<{
    ownerName: z.ZodString;
    username: z.ZodString;
    businessName: z.ZodString;
    contact: z.ZodString;
    password: z.ZodString;
    confirmPassword: z.ZodString;
}, z.core.$strip>;
export declare const loginSchema: z.ZodObject<{
    username: z.ZodString;
    businessName: z.ZodString;
    password: z.ZodString;
}, z.core.$strip>;
export declare const createUserSchema: z.ZodObject<{
    ownerName: z.ZodString;
    username: z.ZodString;
    contact: z.ZodString;
    role: z.ZodEnum<{
        Admin: "Admin";
        Accountant: "Accountant";
        Viewer: "Viewer";
    }>;
    tempPassword: z.ZodString;
}, z.core.$strip>;
export declare const updateUserSchema: z.ZodObject<{
    ownerName: z.ZodOptional<z.ZodString>;
    contact: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<{
        Admin: "Admin";
        Accountant: "Accountant";
        Viewer: "Viewer";
    }>>;
}, z.core.$strip>;
export declare const createCategorySchema: z.ZodObject<{
    name: z.ZodString;
    type: z.ZodEnum<{
        sale: "sale";
        purchase: "purchase";
        expense: "expense";
    }>;
}, z.core.$strip>;
export declare const createInventorySchema: z.ZodObject<{
    name: z.ZodString;
    sku: z.ZodString;
    unitCost: z.ZodNumber;
    unitPrice: z.ZodNumber;
    quantity: z.ZodNumber;
    lowStockThreshold: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export declare const updateInventorySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    sku: z.ZodOptional<z.ZodString>;
    unitCost: z.ZodOptional<z.ZodNumber>;
    unitPrice: z.ZodOptional<z.ZodNumber>;
    quantity: z.ZodOptional<z.ZodNumber>;
    lowStockThreshold: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const createTransactionSchema: z.ZodObject<{
    type: z.ZodEnum<{
        sale: "sale";
        purchase: "purchase";
        expense: "expense";
    }>;
    date: z.ZodString;
    category: z.ZodString;
    amount: z.ZodNumber;
    description: z.ZodString;
    itemId: z.ZodOptional<z.ZodString>;
    quantity: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const updateTransactionSchema: z.ZodObject<{
    type: z.ZodOptional<z.ZodEnum<{
        sale: "sale";
        purchase: "purchase";
        expense: "expense";
    }>>;
    date: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    amount: z.ZodOptional<z.ZodNumber>;
    description: z.ZodOptional<z.ZodString>;
    itemId: z.ZodOptional<z.ZodString>;
    quantity: z.ZodOptional<z.ZodNumber>;
}, z.core.$strip>;
export declare const approveSchema: z.ZodObject<{
    reviewNotes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const rejectSchema: z.ZodObject<{
    reason: z.ZodString;
}, z.core.$strip>;
export declare const generateReportSchema: z.ZodObject<{
    type: z.ZodEnum<{
        inventory: "inventory";
        sales: "sales";
        financial: "financial";
        custom: "custom";
    }>;
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
//# sourceMappingURL=schemas.d.ts.map