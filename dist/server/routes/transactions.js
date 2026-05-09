import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne, queryExecute, withTransaction } from '../db/client.js';
import { authenticate, requireTenant } from '../middleware/auth.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';
const router = Router();
// ─── GET all transactions for tenant ─────────────────────────────────────────
router.get('/', authenticate, requireTenant, async (req, res) => {
    try {
        const { businessKey } = req.params;
        const { limit = 100, offset = 0, type, category, startDate, endDate } = req.query;
        let querySQL = `
      SELECT id, tenant_id, type, date, category, amount, description, item_id, quantity, created_at, created_by, updated_at
      FROM transactions WHERE tenant_id = $1
    `;
        const params = [businessKey];
        if (type) {
            querySQL += ` AND type = $${params.length + 1}`;
            params.push(type);
        }
        if (category) {
            querySQL += ` AND category = $${params.length + 1}`;
            params.push(category);
        }
        if (startDate) {
            querySQL += ` AND date >= $${params.length + 1}`;
            params.push(startDate);
        }
        if (endDate) {
            querySQL += ` AND date <= $${params.length + 1}`;
            params.push(endDate);
        }
        querySQL += ` ORDER BY date DESC, created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(parseInt(limit) || 100, parseInt(offset) || 0);
        const transactions = await query(querySQL, params);
        let countSQL = `SELECT COUNT(*) FROM transactions WHERE tenant_id = $1`;
        const countParams = [businessKey];
        if (type) {
            countSQL += ` AND type = $${countParams.length + 1}`;
            countParams.push(type);
        }
        if (category) {
            countSQL += ` AND category = $${countParams.length + 1}`;
            countParams.push(category);
        }
        if (startDate) {
            countSQL += ` AND date >= $${countParams.length + 1}`;
            countParams.push(startDate);
        }
        if (endDate) {
            countSQL += ` AND date <= $${countParams.length + 1}`;
            countParams.push(endDate);
        }
        const countResult = await queryOne(countSQL, countParams);
        const total = parseInt(countResult?.count || '0');
        res.json({
            transactions,
            pagination: { total, limit: parseInt(limit) || 100, offset: parseInt(offset) || 0, hasMore: total > (parseInt(offset) || 0) + (parseInt(limit) || 100) },
        });
    }
    catch (error) {
        console.error('List transactions error:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});
// ─── GET single transaction ───────────────────────────────────────────────────
router.get('/:txId', authenticate, requireTenant, async (req, res) => {
    try {
        const { businessKey, txId } = req.params;
        const tx = await queryOne(`SELECT id, tenant_id, type, date, category, amount, description, item_id, quantity, created_at, created_by, updated_at
       FROM transactions WHERE id = $1 AND tenant_id = $2`, [txId, businessKey]);
        if (!tx) {
            throw new NotFoundError('Transaction');
        }
        res.json({ transaction: tx });
    }
    catch (error) {
        if (error instanceof NotFoundError) {
            res.status(404).json({ error: error.message });
        }
        else {
            console.error('Get transaction error:', error);
            res.status(500).json({ error: 'Failed to fetch transaction' });
        }
    }
});
// ─── CREATE transaction ───────────────────────────────────────────────────────
router.post('/', authenticate, requireTenant, async (req, res) => {
    try {
        const user = req.user;
        const { businessKey } = req.params;
        const { type, date, category, amount, description, itemId, quantity } = z.object({
            type: z.enum(['sale', 'purchase', 'expense']),
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            category: z.string().min(1),
            amount: z.number().positive(),
            description: z.string().min(1),
            itemId: z.string().optional(),
            quantity: z.number().int().positive().optional(),
        }).parse(req.body);
        if ((itemId && !quantity) || (!itemId && quantity)) {
            throw new ValidationError('Both itemId and quantity must be provided together, or both omitted');
        }
        if (itemId && quantity) {
            const item = await queryOne('SELECT id, quantity FROM inventory_items WHERE id = $1 AND tenant_id = $2', [itemId, businessKey]);
            if (!item) {
                throw new ValidationError('Linked inventory item not found');
            }
            if (type === 'sale' && item.quantity < quantity) {
                throw new ValidationError(`Insufficient stock. Only ${item.quantity} units available`);
            }
        }
        if (user.role === 'Accountant') {
            const approvalId = `apr_${Date.now()}`;
            await queryExecute(`INSERT INTO pending_approvals (id, tenant_id, kind, action, payload, requested_by, requested_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`, [approvalId, businessKey, 'transaction', 'create', JSON.stringify({ type, date, category, amount, description, itemId, quantity }), user.username, 'pending']);
            return res.status(202).json({
                message: 'Transaction submitted for admin approval',
                queued: true,
                approvalId,
            });
        }
        const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        await withTransaction(async (client) => {
            await client.query(`INSERT INTO transactions (id, tenant_id, type, date, category, amount, description, item_id, quantity, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`, [txId, businessKey, type, date, category, amount, description, itemId || null, quantity || null, user.username]);
            if (itemId && quantity) {
                if (type === 'sale') {
                    await client.query(`UPDATE inventory_items
               SET quantity = GREATEST(0, quantity - $1),
                   sales_count = sales_count + $1,
                   revenue = revenue + $2,
                   cogs = cogs + ($1 * unit_cost),
                   updated_at = NOW()
             WHERE id = $3`, [quantity, amount, itemId]);
                }
                else if (type === 'purchase') {
                    await client.query(`UPDATE inventory_items SET quantity = quantity + $1, updated_at = NOW() WHERE id = $2`, [quantity, itemId]);
                }
            }
        });
        const tx = await queryOne('SELECT * FROM transactions WHERE id = $1', [txId]);
        res.status(201).json({ transaction: tx, message: 'Transaction recorded successfully', queued: false });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Invalid request', details: error.issues });
        }
        else if (error instanceof ValidationError) {
            res.status(400).json({ error: error.message });
        }
        else {
            console.error('Create transaction error:', error);
            res.status(500).json({ error: 'Failed to create transaction' });
        }
    }
});
// ─── UPDATE transaction ───────────────────────────────────────────────────────
router.put('/:txId', authenticate, requireTenant, async (req, res) => {
    try {
        const user = req.user;
        const { businessKey } = req.params;
        const { txId } = req.params;
        const updates = z.object({
            type: z.enum(['sale', 'purchase', 'expense']).optional(),
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
            category: z.string().min(1).optional(),
            amount: z.number().positive().optional(),
            description: z.string().min(1).optional(),
            itemId: z.string().optional(),
            quantity: z.number().int().positive().optional(),
        }).parse(req.body);
        if (Object.keys(updates).length === 0) {
            res.status(400).json({ error: 'No fields to update' });
            return;
        }
        const existingTx = await queryOne('SELECT * FROM transactions WHERE id = $1 AND tenant_id = $2', [txId, businessKey]);
        if (!existingTx) {
            throw new NotFoundError('Transaction');
        }
        if (user.role === 'Accountant') {
            const approvalId = `apr_${Date.now()}`;
            await queryExecute(`INSERT INTO pending_approvals (id, tenant_id, kind, action, payload, target_id, target_snapshot, requested_by, requested_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)`, [approvalId, businessKey, 'transaction', 'update', JSON.stringify(updates), txId, JSON.stringify(existingTx), user.username, 'pending']);
            return res.status(202).json({
                message: 'Transaction update submitted for admin approval',
                queued: true,
                approvalId,
            });
        }
        const setClause = [];
        const values = [];
        if (updates.type) {
            setClause.push(`type = $${values.length + 1}`);
            values.push(updates.type);
        }
        if (updates.date) {
            setClause.push(`date = $${values.length + 1}`);
            values.push(updates.date);
        }
        if (updates.category) {
            setClause.push(`category = $${values.length + 1}`);
            values.push(updates.category);
        }
        if (updates.amount !== undefined) {
            setClause.push(`amount = $${values.length + 1}`);
            values.push(updates.amount);
        }
        if (updates.description) {
            setClause.push(`description = $${values.length + 1}`);
            values.push(updates.description);
        }
        if (updates.itemId !== undefined) {
            setClause.push(`item_id = $${values.length + 1}`);
            values.push(updates.itemId || null);
        }
        if (updates.quantity !== undefined) {
            setClause.push(`quantity = $${values.length + 1}`);
            values.push(updates.quantity || null);
        }
        setClause.push(`updated_at = NOW()`);
        values.push(txId);
        await withTransaction(async (client) => {
            await client.query(`UPDATE transactions SET ${setClause.join(', ')} WHERE id = $${values.length}`, values);
            // Handle inventory adjustments
            const oldItemId = existingTx.item_id;
            const oldQty = existingTx.quantity;
            const oldType = existingTx.type;
            const oldAmount = existingTx.amount;
            const newItemId = updates.itemId ?? existingTx.item_id;
            const newQty = updates.quantity ?? existingTx.quantity;
            const newType = updates.type ?? existingTx.type;
            const newAmount = updates.amount ?? existingTx.amount;
            if (oldItemId !== newItemId || oldQty !== newQty || oldType !== newType) {
                if (oldItemId && oldQty) {
                    if (oldType === 'sale') {
                        await client.query(`UPDATE inventory_items
                 SET quantity = quantity + $1,
                     sales_count = GREATEST(0, sales_count - $1),
                     revenue = revenue - $2,
                     cogs = cogs - ($1 * unit_cost)
               WHERE id = $3`, [oldQty, oldAmount, oldItemId]);
                    }
                    else if (oldType === 'purchase') {
                        await client.query(`UPDATE inventory_items SET quantity = quantity - $1 WHERE id = $2`, [oldQty, oldItemId]);
                    }
                }
                if (newItemId && newQty) {
                    if (newType === 'sale') {
                        await client.query(`UPDATE inventory_items
                 SET quantity = GREATEST(0, quantity - $1),
                     sales_count = sales_count + $1,
                     revenue = revenue + $2,
                     cogs = cogs + ($1 * unit_cost)
               WHERE id = $3`, [newQty, newAmount, newItemId]);
                    }
                    else if (newType === 'purchase') {
                        await client.query(`UPDATE inventory_items SET quantity = quantity + $1 WHERE id = $2`, [newQty, newItemId]);
                    }
                }
            }
            else if (oldItemId && oldQty && oldType === 'sale' && newItemId && newQty && newType === 'sale' && oldItemId === newItemId && oldQty === newQty && oldAmount !== newAmount) {
                await client.query(`UPDATE inventory_items SET revenue = revenue + $1 WHERE id = $2`, [newAmount - oldAmount, newItemId]);
            }
        });
        const updated = await queryOne('SELECT * FROM transactions WHERE id = $1', [txId]);
        res.json({ transaction: updated, message: 'Transaction updated successfully', queued: false });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Invalid request', details: error.issues });
        }
        else if (error instanceof ValidationError) {
            res.status(400).json({ error: error.message });
        }
        else if (error instanceof NotFoundError) {
            res.status(404).json({ error: error.message });
        }
        else {
            console.error('Update transaction error:', error);
            res.status(500).json({ error: 'Failed to update transaction' });
        }
    }
});
// ─── DELETE transaction ───────────────────────────────────────────────────────
router.delete('/:txId', authenticate, requireTenant, async (req, res) => {
    try {
        const user = req.user;
        const { businessKey } = req.params;
        const { txId } = req.params;
        const existingTx = await queryOne('SELECT * FROM transactions WHERE id = $1 AND tenant_id = $2', [txId, businessKey]);
        if (!existingTx) {
            throw new NotFoundError('Transaction');
        }
        if (user.role === 'Accountant') {
            const approvalId = `apr_${Date.now()}`;
            await queryExecute(`INSERT INTO pending_approvals (id, tenant_id, kind, action, payload, target_id, target_snapshot, requested_by, requested_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)`, [approvalId, businessKey, 'transaction', 'delete', JSON.stringify(null), txId, JSON.stringify(existingTx), user.username, 'pending']);
            return res.status(202).json({
                message: 'Transaction deletion submitted for admin approval',
                queued: true,
                approvalId,
            });
        }
        await withTransaction(async (client) => {
            if (existingTx.item_id && existingTx.quantity) {
                if (existingTx.type === 'sale') {
                    await client.query(`UPDATE inventory_items
             SET quantity = quantity + $1,
                 revenue = revenue - $2,
                 sales_count = sales_count - $3,
                   cogs = cogs - ($1 * unit_cost)
           WHERE id = $4`, [existingTx.quantity, existingTx.amount, existingTx.quantity, existingTx.item_id]);
                }
                else if (existingTx.type === 'purchase') {
                    await client.query(`UPDATE inventory_items SET quantity = quantity - $1 WHERE id = $2`, [existingTx.quantity, existingTx.item_id]);
                }
            }
            await client.query('DELETE FROM transactions WHERE id = $1', [txId]);
        });
        res.json({ message: 'Transaction deleted successfully', queued: false });
    }
    catch (error) {
        if (error instanceof NotFoundError) {
            res.status(404).json({ error: error.message });
        }
        else {
            console.error('Delete transaction error:', error);
            res.status(500).json({ error: 'Failed to delete transaction' });
        }
    }
});
export default router;
//# sourceMappingURL=transactions.js.map