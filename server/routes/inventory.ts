import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne, queryExecute, withTransaction } from '../db/client.js';
import { authenticate, requireTenant } from '../middleware/auth.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';
import { AuthPayload } from '../types.js';

const router = Router();

// ─── GET all inventory items ──────────────────────────────────────────────────
router.get('/', authenticate, requireTenant, async (req: Request, res: Response) => {
  try {
    const { businessKey } = req.params;
    const items = await query<any>(
      `SELECT id, tenant_id AS "tenantId", name, sku, unit_cost AS "unitCost", unit_price AS "unitPrice",
              measurement_unit AS "measurementUnit",
              quantity, low_stock_threshold AS "lowStockThreshold",
              sales_count AS "salesCount", revenue, cogs, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM inventory_items WHERE tenant_id = $1 ORDER BY name`,
      [businessKey]
    );

    res.json({ inventory: items, count: items.length });
  } catch (error) {
    console.error('List inventory error:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

// ─── GET low stock items ──────────────────────────────────────────────────────
router.get('/low-stock', authenticate, requireTenant, async (req: Request, res: Response) => {
  try {
    const { businessKey } = req.params;
    const items = await query<any>(
      `SELECT id, name, sku, quantity, low_stock_threshold
       FROM inventory_items WHERE tenant_id = $1 AND quantity <= low_stock_threshold
       ORDER BY (quantity::float / low_stock_threshold) ASC`,
      [businessKey]
    );

    res.json({ lowStockItems: items, count: items.length });
  } catch (error) {
    console.error('Low stock query error:', error);
    res.status(500).json({ error: 'Failed to fetch low stock items' });
  }
});

// ─── GET single inventory item ───────────────────────────────────────────────
router.get('/:itemId', authenticate, requireTenant, async (req: Request, res: Response) => {
  try {
    const { businessKey, itemId } = req.params;
    const item = await queryOne<any>(
      `SELECT id, tenant_id AS "tenantId", name, sku, unit_cost AS "unitCost", unit_price AS "unitPrice",
              measurement_unit AS "measurementUnit",
              quantity, low_stock_threshold AS "lowStockThreshold", sales_count AS "salesCount",
              revenue, cogs, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM inventory_items WHERE id = $1 AND tenant_id = $2`,
      [itemId, businessKey]
    );

    if (!item) {
      throw new NotFoundError('Inventory item');
    }

    res.json({ item });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Get inventory item error:', error);
      res.status(500).json({ error: 'Failed to fetch inventory item' });
    }
  }
});

// ─── CREATE inventory item ────────────────────────────────────────────────────
router.post('/', authenticate, requireTenant, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const { businessKey } = req.params;

    const { name, sku, unitCost, unitPrice, quantity, lowStockThreshold, measurementUnit } = z.object({
      name: z.string().min(1).max(255),
      sku: z.string().min(1).max(100),
      unitCost: z.number().min(0),
      unitPrice: z.number().min(0),
      quantity: z.number().int().min(0),
      lowStockThreshold: z.number().int().min(0).optional(),
      measurementUnit: z
        .string()
        .min(1)
        .max(50)
        .optional()
        .default('Pieces'),
    }).parse(req.body);

    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM inventory_items WHERE tenant_id = $1 AND LOWER(sku) = LOWER($2)',
      [businessKey, sku]
    );
    if (existing) {
      throw new ValidationError('A product with this SKU already exists');
    }

    if (user.role === 'Accountant') {
      const approvalId = `apr_${Date.now()}`;
      await queryExecute(
        `INSERT INTO pending_approvals (id, tenant_id, kind, action, payload, requested_by, requested_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7)`,
        [
          approvalId,
          businessKey,
          'inventory',
          'create',
          JSON.stringify({ name, sku, unitCost, unitPrice, quantity, lowStockThreshold, measurementUnit }),
          user.username,
          'pending',
        ]
      );

      return res.status(202).json({
        message: 'Inventory addition submitted for admin approval',
        queued: true,
        approvalId,
      });
    }

    const itemId = `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await queryExecute(
      `INSERT INTO inventory_items
       (id, tenant_id, name, sku, unit_cost, unit_price, measurement_unit, quantity, low_stock_threshold, sales_count, revenue, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 0, NOW(), NOW())`,
      [itemId, businessKey, name, sku, unitCost, unitPrice, measurementUnit, quantity, lowStockThreshold || 5]
    );

    const item = await queryOne<any>(
      `SELECT id, tenant_id AS "tenantId", name, sku, unit_cost AS "unitCost", unit_price AS "unitPrice", quantity, low_stock_threshold AS "lowStockThreshold", sales_count AS "salesCount", revenue, cogs, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM inventory_items WHERE id = $1`,
      [itemId]
    );

    res.status(201).json({ item, message: 'Inventory item created successfully', queued: false });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', details: (error as z.ZodError).issues });
    } else if (error instanceof ValidationError) {
      res.status(409).json({ error: error.message });
    } else {
      console.error('Create inventory error:', error);
      res.status(500).json({ error: 'Failed to create inventory item' });
    }
  }
});

// ─── UPDATE inventory item ────────────────────────────────────────────────────
router.put('/:itemId', authenticate, requireTenant, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const { businessKey } = req.params;
    const { itemId } = req.params;

    const updates = z.object({
      name: z.string().min(1).max(255).optional(),
      sku: z.string().min(1).max(100).optional(),
      unitCost: z.number().min(0).optional(),
      unitPrice: z.number().min(0).optional(),
      quantity: z.number().int().min(0).optional(),
      lowStockThreshold: z.number().int().min(0).optional(),
      measurementUnit: z.string().min(1).max(50).optional(),
    }).parse(req.body);

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    const existing = await queryOne<any>(
      'SELECT * FROM inventory_items WHERE id = $1 AND tenant_id = $2',
      [itemId, businessKey]
    );
    if (!existing) {
      throw new NotFoundError('Inventory item');
    }

    if (user.role === 'Accountant') {
      const approvalId = `apr_${Date.now()}`;
      await queryExecute(
        `INSERT INTO pending_approvals (id, tenant_id, kind, action, payload, target_id, target_snapshot, requested_by, requested_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)`,
        [approvalId, businessKey, 'inventory', 'update', JSON.stringify(updates), itemId, JSON.stringify(existing), user.username, 'pending']
      );

      return res.status(202).json({
        message: 'Inventory update submitted for admin approval',
        queued: true,
        approvalId,
      });
    }

    const setClause: string[] = [];
    const values: unknown[] = [];

    if (updates.name) { setClause.push(`name = $${values.length + 1}`); values.push(updates.name); }
    if (updates.sku) { setClause.push(`sku = $${values.length + 1}`); values.push(updates.sku); }
    if (updates.unitCost !== undefined) { setClause.push(`unit_cost = $${values.length + 1}`); values.push(updates.unitCost); }
    if (updates.unitPrice !== undefined) { setClause.push(`unit_price = $${values.length + 1}`); values.push(updates.unitPrice); }
    if (updates.quantity !== undefined) { setClause.push(`quantity = $${values.length + 1}`); values.push(updates.quantity); }
    if (updates.lowStockThreshold !== undefined) { setClause.push(`low_stock_threshold = $${values.length + 1}`); values.push(updates.lowStockThreshold); }
    if (updates.measurementUnit !== undefined) { setClause.push(`measurement_unit = $${values.length + 1}`); values.push(updates.measurementUnit); }

    setClause.push(`updated_at = NOW()`);
    values.push(itemId);

    await queryExecute(
      `UPDATE inventory_items SET ${setClause.join(', ')} WHERE id = $${values.length}`,
      values
    );

    const updated = await queryOne<any>(
      `SELECT id, tenant_id AS "tenantId", name, sku, unit_cost AS "unitCost", unit_price AS "unitPrice", quantity, low_stock_threshold AS "lowStockThreshold", sales_count AS "salesCount", revenue, cogs, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM inventory_items WHERE id = $1`,
      [itemId]
    );
    res.json({ item: updated, message: 'Inventory item updated successfully', queued: false });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request', details: (error as z.ZodError).issues });
    } else if (error instanceof ValidationError) {
      res.status(400).json({ error: error.message });
    } else if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Update inventory error:', error);
      res.status(500).json({ error: 'Failed to update inventory item' });
    }
  }
});

// ─── DELETE inventory item ────────────────────────────────────────────────────
router.delete('/:itemId', authenticate, requireTenant, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    const { businessKey } = req.params;
    const { itemId } = req.params;

    const existing = await queryOne<any>(
      'SELECT * FROM inventory_items WHERE id = $1 AND tenant_id = $2',
      [itemId, businessKey]
    );
    if (!existing) {
      throw new NotFoundError('Inventory item');
    }

    if (user.role === 'Accountant') {
      const approvalId = `apr_${Date.now()}`;
      await queryExecute(
        `INSERT INTO pending_approvals (id, tenant_id, kind, action, payload, target_id, target_snapshot, requested_by, requested_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)`,
        [approvalId, businessKey, 'inventory', 'delete', JSON.stringify(null), itemId, JSON.stringify(existing), user.username, 'pending']
      );

      return res.status(202).json({
        message: 'Inventory deletion submitted for admin approval',
        queued: true,
        approvalId,
      });
    }

    await queryExecute('DELETE FROM inventory_items WHERE id = $1', [itemId]);

    res.json({ message: 'Inventory item deleted successfully', queued: false });
  } catch (error) {
    if (error instanceof NotFoundError) {
      res.status(404).json({ error: error.message });
    } else {
      console.error('Delete inventory error:', error);
      res.status(500).json({ error: 'Failed to delete inventory item' });
    }
  }
});

export default router;
