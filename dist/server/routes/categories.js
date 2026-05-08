import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne, queryExecute } from '../db/client.js';
import { authenticate, requireAdmin, requireTenant } from '../middleware/auth.js';
import { withPrefix } from '../utils/ids.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';
const router = Router();
// ─── GET all categories for tenant ───────────────────────────────────────────
router.get('/', authenticate, requireTenant, async (req, res) => {
    try {
        const { businessKey } = req.params;
        const categories = await query(`SELECT id, tenant_id, name, type, is_custom, created_at, updated_at FROM categories WHERE tenant_id = $1 ORDER BY name`, [businessKey]);
        res.json({ categories, count: categories.length });
    }
    catch (error) {
        console.error('List categories error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});
// ─── GET by type ─────────────────────────────────────────────────────────────
router.get('/type/:type', authenticate, requireTenant, async (req, res) => {
    try {
        const { businessKey, type } = req.params;
        const categoryType = type;
        if (!['sale', 'purchase', 'expense'].includes(categoryType)) {
            res.status(400).json({ error: 'Invalid category type' });
            return;
        }
        const categories = await query(`SELECT id, tenant_id, name, type, is_custom, created_at, updated_at FROM categories WHERE tenant_id = $1 AND type = $2 ORDER BY name`, [businessKey, type]);
        res.json({ categories, count: categories.length });
    }
    catch (error) {
        console.error('List categories by type error:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});
// ─── Create category (admin only) ────────────────────────────────────────────
router.post('/', authenticate, requireAdmin, requireTenant, async (req, res) => {
    try {
        const { name, type } = z.object({
            name: z.string().min(1).max(255),
            type: z.enum(['sale', 'purchase', 'expense']),
        }).parse(req.body);
        const { businessKey } = req.params;
        const existing = await queryOne('SELECT id FROM categories WHERE tenant_id = $1 AND LOWER(name) = LOWER($2)', [businessKey, name]);
        if (existing) {
            throw new ValidationError('A category with this name already exists');
        }
        const categoryId = withPrefix('cat');
        await queryExecute(`INSERT INTO categories (id, tenant_id, name, type, is_custom, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`, [categoryId, businessKey, name, type, true]);
        const created = await queryOne(`SELECT id, tenant_id, name, type, is_custom, created_at, updated_at FROM categories WHERE id = $1`, [categoryId]);
        res.status(201).json({ category: created, message: 'Category created successfully' });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Invalid request', details: error.issues });
        }
        else if (error instanceof ValidationError) {
            res.status(409).json({ error: error.message });
        }
        else {
            console.error('Create category error:', error);
            res.status(500).json({ error: 'Failed to create category' });
        }
    }
});
// ─── Delete category (admin only) ────────────────────────────────────────────
router.delete('/:categoryId', authenticate, requireAdmin, requireTenant, async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { businessKey } = req.params;
        const existing = await queryOne('SELECT id FROM categories WHERE id = $1 AND tenant_id = $2', [categoryId, businessKey]);
        if (!existing) {
            throw new NotFoundError('Category');
        }
        await queryExecute('DELETE FROM categories WHERE id = $1', [categoryId]);
        res.json({ message: 'Category deleted successfully' });
    }
    catch (error) {
        if (error instanceof NotFoundError) {
            res.status(404).json({ error: error.message });
        }
        else {
            console.error('Delete category error:', error);
            res.status(500).json({ error: 'Failed to delete category' });
        }
    }
});
export default router;
//# sourceMappingURL=categories.js.map