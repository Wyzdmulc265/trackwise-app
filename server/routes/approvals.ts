import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PoolClient } from 'pg';
import { query, queryExecute, withTransaction } from '../db/client.js';
import { authenticate, requireAdmin, requireTenant } from '../middleware/auth.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { AuthPayload } from '../types.js';

const router = Router();

const parseJsonValue = (value: unknown) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const createApprovalSummary = (approval: any): string => {
  const { action, kind, payload, targetId } = approval;
  if (action === 'create') {
    if (kind === 'transaction' && payload?.type && payload?.category) {
      return `Create ${payload.type} transaction for ${payload.category}`;
    }
    if (kind === 'inventory' && payload?.name) {
      return `Add inventory item ${payload.name}`;
    }
  }
  if (action === 'update') {
    return `Update ${kind} ${targetId ?? ''}`.trim();
  }
  if (action === 'delete') {
    return `Delete ${kind} ${targetId ?? ''}`.trim();
  }
  return `${action} ${kind}`;
};

const normalizeApproval = (apr: any) => {
  const parsedPayload = parseJsonValue(apr.payload);
  const parsedTargetSnapshot = parseJsonValue(apr.target_snapshot);
  const approval = {
    id: apr.id,
    tenantId: apr.tenant_id,
    kind: apr.kind,
    action: apr.action,
    payload: parsedPayload,
    targetId: apr.target_id,
    targetSnapshot: parsedTargetSnapshot,
    requestedBy: apr.requested_by,
    requestedAt: apr.requested_at,
    status: apr.status,
    reviewedBy: apr.reviewed_by,
    reviewedAt: apr.reviewed_at,
    rejectionReason: apr.review_notes,
  };
  return { ...approval, summary: createApprovalSummary(approval) };
};

// ─── GET all approvals ───────────────────────────────────────────────────────
router.get('/pending', authenticate, requireAdmin, requireTenant, async (req: Request, res: Response) => {
  try {
    const { businessKey } = req.params;

    const sql = `SELECT id, tenant_id, kind, action, payload, target_id, target_snapshot, requested_by, requested_at, status, reviewed_by, reviewed_at, review_notes
               FROM pending_approvals WHERE tenant_id = $1 AND status = 'pending'
               ORDER BY requested_at DESC`;

    const approvals = await query<any>(sql, [businessKey]);

    const parsed = approvals.map(normalizeApproval);

    res.json({ approvals: parsed, count: parsed.length });
  } catch (error) {
    console.error('List pending approvals error:', error);
    res.status(500).json({ error: 'Failed to fetch pending approvals' });
  }
});

// ——— GET all approvals ———
router.get('/', authenticate, requireAdmin, requireTenant, async (req: Request, res: Response) => {
  try {
    const { businessKey } = req.params;
    const statusParam = typeof req.query.status === 'string' ? req.query.status : 'pending';

    const validStatus = ['pending', 'approved', 'rejected', 'all'];
    const statusFilter = validStatus.includes(statusParam) && statusParam !== 'all'
      ? (statusParam as 'pending' | 'approved' | 'rejected' | 'all')
      : null;

    let sql = `SELECT id, tenant_id, kind, action, payload, target_id, target_snapshot, requested_by, requested_at, status, reviewed_by, reviewed_at, review_notes
               FROM pending_approvals WHERE tenant_id = $1`;
    const params: unknown[] = [businessKey];

    if (statusFilter) {
      sql += ` AND status = $${params.length + 1}`;
      params.push(statusFilter);
    }

    sql += ` ORDER BY requested_at DESC`;

    const approvals = await query<any>(sql, params);

    const parsed = approvals.map(normalizeApproval);

    res.json({ approvals: parsed, count: parsed.length });
  } catch (error) {
    console.error('List approvals error:', error);
    res.status(500).json({ error: 'Failed to fetch approvals' });
  }
});

// ─── GET single approval ─────────────────────────────────────────────────────
router.get('/:approvalId', authenticate, requireAdmin, requireTenant, async (req: Request, res: Response) => {
  try {
    const { businessKey, approvalId } = req.params;

    const aprList = await query<any>(
      `SELECT id, tenant_id, kind, action, payload, target_id, target_snapshot, requested_by, requested_at, status, reviewed_by, reviewed_at, review_notes
       FROM pending_approvals WHERE id = $1 AND tenant_id = $2`,
      [approvalId, businessKey]
    );

    if (aprList.length === 0) {
      throw new NotFoundError('Approval request');
    }

    const apr = aprList[0];

    res.json({ approval: normalizeApproval(apr) });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Get approval error:', error);
      res.status(500).json({ error: 'Failed to fetch approval' });
    }
  }
});

// ─── Approve request ──────────────────────────────────────────────────────────
router.post('/:approvalId/approve', authenticate, requireAdmin, requireTenant, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const { businessKey, approvalId } = req.params;

    const { reviewNotes } = z.object({ reviewNotes: z.string().optional() }).parse(req.body);

    await withTransaction(async (client: PoolClient) => {
      const aprResult = await client.query(
        `SELECT * FROM pending_approvals WHERE id = $1 AND tenant_id = $2 AND status = 'pending'`,
        [approvalId, businessKey]
      );

      if (aprResult.rows.length === 0) {
        throw new NotFoundError('Approval request');
      }

      const apr = aprResult.rows[0];
      const payload = typeof apr.payload === 'string' ? JSON.parse(apr.payload) : apr.payload;

      if (apr.kind === 'transaction') {
        if (apr.action === 'create') {
          const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          await client.query(
            `INSERT INTO transactions (id, tenant_id, type, date, category, amount, description, item_id, quantity, created_by, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
            [txId, businessKey, payload.type, payload.date, payload.category, payload.amount, payload.description, payload.itemId || null, payload.quantity || null, apr.requested_by]
          );

            if (payload.itemId && payload.quantity) {
            if (payload.type === 'sale') {
              await client.query(
                `UPDATE inventory_items
                   SET quantity = GREATEST(0, quantity - $1),
                       sales_count = sales_count + $1,
                       revenue = revenue + $2,
                       cogs = cogs + ($1 * unit_cost)
                 WHERE id = $3`,
                [payload.quantity, payload.amount, payload.itemId]
              );
            } else if (payload.type === 'purchase') {
              await client.query(
                `UPDATE inventory_items SET quantity = quantity + $1 WHERE id = $2`,
                [payload.quantity, payload.itemId]
              );
            }
          }
        } else if (apr.action === 'update' && apr.target_id) {
          const currentTxResult = await client.query('SELECT * FROM transactions WHERE id = $1', [apr.target_id]);
          if (currentTxResult.rows.length === 0) throw new NotFoundError('Target transaction');

          const currentTx = currentTxResult.rows[0];
          const setClause: string[] = [];
          const values: unknown[] = [];

          if (payload.type) { setClause.push(`type = $${values.length + 1}`); values.push(payload.type); }
          if (payload.date) { setClause.push(`date = $${values.length + 1}`); values.push(payload.date); }
          if (payload.category) { setClause.push(`category = $${values.length + 1}`); values.push(payload.category); }
          if (payload.amount !== undefined) { setClause.push(`amount = $${values.length + 1}`); values.push(payload.amount); }
          if (payload.description) { setClause.push(`description = $${values.length + 1}`); values.push(payload.description); }
          if (payload.itemId !== undefined) { setClause.push(`item_id = $${values.length + 1}`); values.push(payload.itemId || null); }
          if (payload.quantity !== undefined) { setClause.push(`quantity = $${values.length + 1}`); values.push(payload.quantity || null); }

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
                await client.query(
                  `UPDATE inventory_items
                     SET quantity = quantity + $1,
                         sales_count = GREATEST(0, sales_count - $1),
                         revenue = revenue - $2,
                         cogs = cogs - ($1 * unit_cost)
                   WHERE id = $3`,
                  [oldQty, oldAmount, oldItemId]
                );
              } else if (oldType === 'purchase') {
                await client.query(`UPDATE inventory_items SET quantity = quantity - $1 WHERE id = $2`, [oldQty, oldItemId]);
              }
            }

            if (newItemId && newQty) {
              if (newType === 'sale') {
                await client.query(
                  `UPDATE inventory_items
                     SET quantity = GREATEST(0, quantity - $1),
                         sales_count = sales_count + $1,
                         revenue = revenue + $2,
                         cogs = cogs + ($1 * unit_cost)
                   WHERE id = $3`,
                  [newQty, newAmount, newItemId]
                );
              } else if (newType === 'purchase') {
                await client.query(`UPDATE inventory_items SET quantity = quantity + $1 WHERE id = $2`, [newQty, newItemId]);
              }
            }
          } else if (oldItemId && oldQty && oldType === 'sale' && newItemId && newQty && newType === 'sale' && oldItemId === newItemId && oldQty === newQty && oldAmount !== newAmount) {
            await client.query(
              `UPDATE inventory_items SET revenue = revenue + $1 WHERE id = $2`,
              [newAmount - oldAmount, newItemId]
            );
          }
        } else if (apr.action === 'delete' && apr.target_id) {
          const txToDeleteResult = await client.query('SELECT * FROM transactions WHERE id = $1', [apr.target_id]);
          if (txToDeleteResult.rows.length > 0) {
            const txToDelete = txToDeleteResult.rows[0];
            if (txToDelete.item_id && txToDelete.quantity) {
              if (txToDelete.type === 'sale') {
                await client.query(
                  `UPDATE inventory_items
                     SET quantity = quantity + $1,
                         revenue = revenue - $2,
                         sales_count = sales_count - $3,
                         cogs = cogs - ($3 * unit_cost)
                   WHERE id = $4`,
                  [txToDelete.quantity, txToDelete.amount, txToDelete.quantity, txToDelete.item_id]
                );
              } else if (txToDelete.type === 'purchase') {
                await client.query(`UPDATE inventory_items SET quantity = quantity - $1 WHERE id = $2`, [txToDelete.quantity, txToDelete.item_id]);
              }
            }
          }

          await client.query('DELETE FROM transactions WHERE id = $1', [apr.target_id]);
        }
      } else if (apr.kind === 'inventory') {
        if (apr.action === 'create') {
          const itemId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          await client.query(
            `INSERT INTO inventory_items (id, tenant_id, name, sku, unit_cost, unit_price, quantity, low_stock_threshold, sales_count, revenue, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, 0, NOW(), NOW())`,
            [itemId, businessKey, payload.name, payload.sku, payload.unitCost, payload.unitPrice, payload.quantity, payload.lowStockThreshold || 5]
          );
        } else if (apr.action === 'update' && apr.target_id) {
          const updatesClause: string[] = [];
          const updateVals: unknown[] = [];

          if (payload.name) { updatesClause.push(`name = $${updateVals.length + 1}`); updateVals.push(payload.name); }
          if (payload.sku) { updatesClause.push(`sku = $${updateVals.length + 1}`); updateVals.push(payload.sku); }
          if (payload.unitCost !== undefined) { updatesClause.push(`unit_cost = $${updateVals.length + 1}`); updateVals.push(payload.unitCost); }
          if (payload.unitPrice !== undefined) { updatesClause.push(`unit_price = $${updateVals.length + 1}`); updateVals.push(payload.unitPrice); }
          if (payload.quantity !== undefined) { updatesClause.push(`quantity = $${updateVals.length + 1}`); updateVals.push(payload.quantity); }
          if (payload.lowStockThreshold !== undefined) { updatesClause.push(`low_stock_threshold = $${updateVals.length + 1}`); updateVals.push(payload.lowStockThreshold); }

          updatesClause.push(`updated_at = NOW()`);
          updateVals.push(apr.target_id);

          await client.query(`UPDATE inventory_items SET ${updatesClause.join(', ')} WHERE id = $${updateVals.length}`, updateVals);
        } else if (apr.action === 'delete' && apr.target_id) {
          await client.query('DELETE FROM inventory_items WHERE id = $1', [apr.target_id]);
        }
      }

      await client.query(
        `UPDATE pending_approvals SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), review_notes = $2 WHERE id = $3`,
        [user.username, reviewNotes || null, approvalId]
      );
    });

    res.json({ message: 'Approval granted and action executed' });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Approve error:', error);
      res.status(500).json({ error: 'Failed to approve request' });
    }
  }
});

// ─── Reject request ───────────────────────────────────────────────────────────
router.post('/:approvalId/reject', authenticate, requireAdmin, requireTenant, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const { businessKey, approvalId } = req.params;

    const { reason } = z.object({ reason: z.string().min(1) }).parse(req.body);

    await queryExecute(
      `UPDATE pending_approvals SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), review_notes = $2 WHERE id = $3 AND tenant_id = $4 AND status = 'pending'`,
      [user.username, reason, approvalId, businessKey]
    );

    res.json({ message: 'Approval rejected' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request' });
    } else {
      console.error('Reject error:', error);
      res.status(500).json({ error: 'Failed to reject approval' });
    }
  }
});

export default router;
