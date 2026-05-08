import { Router } from 'express';
import { z } from 'zod';
import { query, queryExecute, withTransaction } from '../db/client';
import { authenticate, requireAdmin, requireTenant } from '../middleware/auth';
import { NotFoundError } from '../middleware/errorHandler';
const router = Router();
// ─── GET all approvals ───────────────────────────────────────────────────────
router.get('/', authenticate, requireAdmin, requireTenant, async (req, res) => {
    try {
        const { businessKey } = req.params;
        const statusParam = req.params.status || 'pending';
        const validStatus = ['pending', 'approved', 'rejected', 'all'];
        const statusFilter = validStatus.includes(statusParam) && statusParam !== 'all'
            ? statusParam
            : null;
        let sql = `SELECT id, tenant_id, kind, action, payload, target_id, target_snapshot, requested_by, requested_at, status, reviewed_by, reviewed_at, review_notes
               FROM pending_approvals WHERE tenant_id = $1`;
        const params = [businessKey];
        if (statusFilter) {
            sql += ` AND status = $${params.length + 1}`;
            params.push(statusFilter);
        }
        sql += ` ORDER BY requested_at DESC`;
        const approvals = await query(sql, params);
        const parsed = approvals.map((apr) => ({
            ...apr,
            payload: typeof apr.payload === 'string' ? JSON.parse(apr.payload) : apr.payload,
            target_snapshot: typeof apr.target_snapshot === 'string' ? JSON.parse(apr.target_snapshot) : apr.target_snapshot,
        }));
        res.json({ approvals: parsed, count: parsed.length });
    }
    catch (error) {
        console.error('List approvals error:', error);
        res.status(500).json({ error: 'Failed to fetch approvals' });
    }
});
// ─── GET single approval ─────────────────────────────────────────────────────
router.get('/:approvalId', authenticate, requireAdmin, requireTenant, async (req, res) => {
    try {
        const { businessKey, approvalId } = req.params;
        const aprList = await query(`SELECT id, tenant_id, kind, action, payload, target_id, target_snapshot, requested_by, requested_at, status, reviewed_by, reviewed_at, review_notes
       FROM pending_approvals WHERE id = $1 AND tenant_id = $2`, [approvalId, businessKey]);
        if (aprList.length === 0) {
            throw new NotFoundError('Approval request');
        }
        const apr = aprList[0];
        res.json({
            approval: {
                ...apr,
                payload: typeof apr.payload === 'string' ? JSON.parse(apr.payload) : apr.payload,
                target_snapshot: typeof apr.target_snapshot === 'string' ? JSON.parse(apr.target_snapshot) : apr.target_snapshot,
            },
        });
    }
    catch (error) {
        if (error instanceof NotFoundError) {
            res.status(404).json({ error: error.message });
        }
        else {
            console.error('Get approval error:', error);
            res.status(500).json({ error: 'Failed to fetch approval' });
        }
    }
});
// ─── Approve request ──────────────────────────────────────────────────────────
router.post('/:approvalId/approve', authenticate, requireAdmin, requireTenant, async (req, res) => {
    try {
        const user = req.user;
        const { businessKey, approvalId } = req.params;
        const { reviewNotes } = z.object({ reviewNotes: z.string().optional() }).parse(req.body);
        await withTransaction(async (client) => {
            const aprResult = await client.query(`SELECT * FROM pending_approvals WHERE id = $1 AND tenant_id = $2 AND status = 'pending'`, [approvalId, businessKey]);
            if (aprResult.rows.length === 0) {
                throw new NotFoundError('Approval request');
            }
            const apr = aprResult.rows[0];
            const payload = typeof apr.payload === 'string' ? JSON.parse(apr.payload) : apr.payload;
            if (apr.kind === 'transaction') {
                if (apr.action === 'create') {
                    const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                    await client.query(`INSERT INTO transactions (id, tenant_id, type, date, category, amount, description, item_id, quantity, created_by, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`, [txId, businessKey, payload.type, payload.date, payload.category, payload.amount, payload.description, payload.itemId || null, payload.quantity || null, apr.requested_by]);
                    if (payload.itemId && payload.quantity) {
                        if (payload.type === 'sale') {
                            await client.query(`UPDATE inventory_items SET quantity = GREATEST(0, quantity - $1), revenue = revenue + $2 WHERE id = $3`, [payload.quantity, payload.amount, payload.itemId]);
                        }
                        else if (payload.type === 'purchase') {
                            await client.query(`UPDATE inventory_items SET quantity = quantity + $1 WHERE id = $2`, [payload.quantity, payload.itemId]);
                        }
                    }
                }
                else if (apr.action === 'update' && apr.target_id) {
                    const currentTxResult = await client.query('SELECT * FROM transactions WHERE id = $1', [apr.target_id]);
                    if (currentTxResult.rows.length === 0)
                        throw new NotFoundError('Target transaction');
                    const currentTx = currentTxResult.rows[0];
                    const setClause = [];
                    const values = [];
                    if (payload.type) {
                        setClause.push(`type = $${values.length + 1}`);
                        values.push(payload.type);
                    }
                    if (payload.date) {
                        setClause.push(`date = $${values.length + 1}`);
                        values.push(payload.date);
                    }
                    if (payload.category) {
                        setClause.push(`category = $${values.length + 1}`);
                        values.push(payload.category);
                    }
                    if (payload.amount !== undefined) {
                        setClause.push(`amount = $${values.length + 1}`);
                        values.push(payload.amount);
                    }
                    if (payload.description) {
                        setClause.push(`description = $${values.length + 1}`);
                        values.push(payload.description);
                    }
                    if (payload.itemId !== undefined) {
                        setClause.push(`item_id = $${values.length + 1}`);
                        values.push(payload.itemId || null);
                    }
                    if (payload.quantity !== undefined) {
                        setClause.push(`quantity = $${values.length + 1}`);
                        values.push(payload.quantity || null);
                    }
                    setClause.push(`updated_at = NOW()`);
                    values.push(apr.target_id);
                    await client.query(`UPDATE transactions SET ${setClause.join(', ')} WHERE id = $${values.length}`, values);
                    // Inventory delta
                    const oldItemId = currentTx.item_id;
                    const oldQty = currentTx.quantity;
                    const oldType = currentTx.type;
                    const oldAmount = currentTx.amount;
                    const newItemId = payload.itemId ?? currentTx.item_id;
                    const newQty = payload.quantity ?? currentTx.quantity;
                    const newType = payload.type ?? currentTx.type;
                    const newAmount = payload.amount ?? currentTx.amount;
                    if (oldItemId !== newItemId || oldQty !== newQty || oldType !== newType) {
                        if (oldItemId && oldQty) {
                            if (oldType === 'sale') {
                                await client.query(`UPDATE inventory_items SET quantity = quantity + $1, revenue = revenue - $2 WHERE id = $3`, [oldQty, oldAmount, oldItemId]);
                            }
                            else if (oldType === 'purchase') {
                                await client.query(`UPDATE inventory_items SET quantity = quantity - $1 WHERE id = $2`, [oldQty, oldItemId]);
                            }
                        }
                        if (newItemId && newQty) {
                            if (newType === 'sale') {
                                await client.query(`UPDATE inventory_items SET quantity = GREATEST(0, quantity - $1), revenue = revenue + $2 WHERE id = $3`, [newQty, newAmount, newItemId]);
                            }
                            else if (newType === 'purchase') {
                                await client.query(`UPDATE inventory_items SET quantity = quantity + $1 WHERE id = $2`, [newQty, newItemId]);
                            }
                        }
                    }
                }
                else if (apr.action === 'delete' && apr.target_id) {
                    const txToDeleteResult = await client.query('SELECT * FROM transactions WHERE id = $1', [apr.target_id]);
                    if (txToDeleteResult.rows.length > 0) {
                        const txToDelete = txToDeleteResult.rows[0];
                        if (txToDelete.item_id && txToDelete.quantity) {
                            if (txToDelete.type === 'sale') {
                                await client.query(`UPDATE inventory_items SET quantity = quantity + $1, revenue = revenue - $2, sales_count = sales_count - $3 WHERE id = $4`, [txToDelete.quantity, txToDelete.amount, txToDelete.quantity, txToDelete.item_id]);
                            }
                            else if (txToDelete.type === 'purchase') {
                                await client.query(`UPDATE inventory_items SET quantity = quantity - $1 WHERE id = $2`, [txToDelete.quantity, txToDelete.item_id]);
                            }
                        }
                    }
                    await client.query('DELETE FROM transactions WHERE id = $1', [apr.target_id]);
                }
            }
            else if (apr.kind === 'inventory') {
                if (apr.action === 'create') {
                    const itemId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                    await client.query(`INSERT INTO inventory_items (id, tenant_id, name, sku, unit_cost, unit_price, quantity, low_stock_threshold, sales_count, revenue, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 0, NOW(), NOW())`, [itemId, businessKey, payload.name, payload.sku, payload.unitCost, payload.unitPrice, payload.quantity, payload.lowStockThreshold || 5]);
                }
                else if (apr.action === 'update' && apr.target_id) {
                    const updatesClause = [];
                    const updateVals = [];
                    if (payload.name) {
                        updatesClause.push(`name = $${updateVals.length + 1}`);
                        updateVals.push(payload.name);
                    }
                    if (payload.sku) {
                        updatesClause.push(`sku = $${updateVals.length + 1}`);
                        updateVals.push(payload.sku);
                    }
                    if (payload.unitCost !== undefined) {
                        updatesClause.push(`unit_cost = $${updateVals.length + 1}`);
                        updateVals.push(payload.unitCost);
                    }
                    if (payload.unitPrice !== undefined) {
                        updatesClause.push(`unit_price = $${updateVals.length + 1}`);
                        updateVals.push(payload.unitPrice);
                    }
                    if (payload.quantity !== undefined) {
                        updatesClause.push(`quantity = $${updateVals.length + 1}`);
                        updateVals.push(payload.quantity);
                    }
                    if (payload.lowStockThreshold !== undefined) {
                        updatesClause.push(`low_stock_threshold = $${updateVals.length + 1}`);
                        updateVals.push(payload.lowStockThreshold);
                    }
                    updatesClause.push(`updated_at = NOW()`);
                    updateVals.push(apr.target_id);
                    await client.query(`UPDATE inventory_items SET ${updatesClause.join(', ')} WHERE id = $${updateVals.length}`, updateVals);
                }
                else if (apr.action === 'delete' && apr.target_id) {
                    await client.query('DELETE FROM inventory_items WHERE id = $1', [apr.target_id]);
                }
            }
            await client.query(`UPDATE pending_approvals SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), review_notes = $2 WHERE id = $3`, [user.username, reviewNotes || null, approvalId]);
        });
        res.json({ message: 'Approval granted and action executed' });
    }
    catch (error) {
        if (error instanceof NotFoundError) {
            res.status(404).json({ error: error.message });
        }
        else {
            console.error('Approve error:', error);
            res.status(500).json({ error: 'Failed to approve request' });
        }
    }
});
// ─── Reject request ───────────────────────────────────────────────────────────
router.post('/:approvalId/reject', authenticate, requireAdmin, requireTenant, async (req, res) => {
    try {
        const user = req.user;
        const { businessKey, approvalId } = req.params;
        const { reason } = z.object({ reason: z.string().min(1) }).parse(req.body);
        await queryExecute(`UPDATE pending_approvals SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), review_notes = $2 WHERE id = $3 AND tenant_id = $4 AND status = 'pending'`, [user.username, reason, approvalId, businessKey]);
        res.json({ message: 'Approval rejected' });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Invalid request' });
        }
        else {
            console.error('Reject error:', error);
            res.status(500).json({ error: 'Failed to reject approval' });
        }
    }
});
export default router;
//# sourceMappingURL=approvals.js.map