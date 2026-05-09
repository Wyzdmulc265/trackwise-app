import { Router } from 'express';
import { z } from 'zod';
import { query, queryOne, queryExecute } from '../db/client.js';
import { authenticate, requireAdmin, requireTenant } from '../middleware/auth.js';
import { withPrefix } from '../utils/ids.js';
import { ValidationError, NotFoundError } from '../middleware/errorHandler.js';
const router = Router();
// ─── GET all users for current business (admin only) ─────────────────────────
router.get('/', authenticate, requireAdmin, requireTenant, async (req, res) => {
    try {
        const { businessKey } = req.params;
        const users = await query(`SELECT id, tenant_id, owner_name, username, business_name, contact, role, must_change_password, created_at, created_by
       FROM users WHERE tenant_id = $1 ORDER BY created_at DESC`, [businessKey]);
        const sanitized = users.map(({ password_hash, ...u }) => u);
        res.json({ users: sanitized, count: sanitized.length });
    }
    catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
// ─── Create new user (admin only) ────────────────────────────────────────────
router.post('/', authenticate, requireAdmin, requireTenant, async (req, res) => {
    try {
        const { ownerName, username, contact, role, tempPassword } = z.object({
            ownerName: z.string().min(1),
            username: z.string().min(3),
            contact: z.string().min(1),
            role: z.enum(['Admin', 'Accountant', 'Viewer']),
            tempPassword: z.string().min(6),
        }).parse(req.body);
        const { businessKey } = req.params;
        const adminUser = req.user;
        const existing = await queryOne('SELECT username FROM users WHERE tenant_id = $1 AND LOWER(username) = LOWER($2)', [businessKey, username]);
        if (existing) {
            throw new ValidationError('That username is already taken');
        }
        const { hashPassword } = await import('../utils/tokens');
        const passwordHash = await hashPassword(tempPassword);
        const userId = withPrefix('usr');
        await queryExecute(`INSERT INTO users (id, tenant_id, owner_name, username, business_name, contact, password_hash, role, must_change_password, created_at, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), $10)`, [userId, businessKey, ownerName, username, adminUser.businessName, contact, passwordHash, role, false, adminUser.username]);
        const createdUser = await queryOne(`SELECT id, tenant_id, owner_name, username, business_name, contact, role, must_change_password, created_at, created_by
       FROM users WHERE id = $1`, [userId]);
        res.status(201).json({ user: createdUser, message: 'User created successfully' });
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            res.status(400).json({ error: 'Invalid request', details: error.issues });
        }
        else if (error instanceof ValidationError) {
            res.status(400).json({ error: error.message });
        }
        else if (error.code === '23505') {
            res.status(409).json({ error: 'Duplicate data - username already exists' });
        }
        else {
            console.error('Create user error:', error);
            res.status(500).json({ error: 'Failed to create user' });
        }
    }
});
// ─── Update user (admin only) ────────────────────────────────────────────────
router.put('/:userId', authenticate, requireAdmin, requireTenant, async (req, res) => {
    try {
        const { userId } = req.params;
        const { businessKey } = req.params;
        const updates = z.object({
            ownerName: z.string().min(1).optional(),
            contact: z.string().min(1).optional(),
            role: z.enum(['Admin', 'Accountant', 'Viewer']).optional(),
        }).parse(req.body);
        const existing = await queryOne('SELECT id, role FROM users WHERE id = $1 AND tenant_id = $2', [userId, businessKey]);
        if (!existing) {
            throw new NotFoundError('User');
        }
        if (updates.role && updates.role !== 'Admin' && existing.role === 'Admin') {
            const adminCount = await queryOne("SELECT COUNT(*) as count FROM users WHERE tenant_id = $1 AND role = 'Admin'", [businessKey]);
            if (adminCount && parseInt(adminCount.count) <= 1) {
                throw new ValidationError('Cannot demote the last Admin of this business');
            }
        }
        const setClause = [];
        const values = [];
        if (updates.ownerName) {
            setClause.push(`owner_name = $${values.length + 1}`);
            values.push(updates.ownerName);
        }
        if (updates.contact) {
            setClause.push(`contact = $${values.length + 1}`);
            values.push(updates.contact);
        }
        if (updates.role) {
            setClause.push(`role = $${values.length + 1}`);
            values.push(updates.role);
        }
        if (setClause.length === 0) {
            res.status(400).json({ error: 'No fields to update' });
            return;
        }
        setClause.push(`updated_at = NOW()`);
        values.push(userId);
        await queryExecute(`UPDATE users SET ${setClause.join(', ')} WHERE id = $${values.length}`, values);
        const updatedUser = await queryOne(`SELECT id, tenant_id, owner_name, username, business_name, contact, role, must_change_password, created_at, created_by
       FROM users WHERE id = $1`, [userId]);
        res.json({ user: updatedUser, message: 'User updated successfully' });
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
            console.error('Update user error:', error);
            res.status(500).json({ error: 'Failed to update user' });
        }
    }
});
// ─── Delete user (admin only) ────────────────────────────────────────────────
router.delete('/:userId', authenticate, requireAdmin, requireTenant, async (req, res) => {
    try {
        const { userId } = req.params;
        const { businessKey } = req.params;
        const currentUser = req.user;
        if (userId === currentUser.userId) {
            res.status(400).json({ error: 'You cannot delete your own account' });
            return;
        }
        const targetUser = await queryOne('SELECT id, role FROM users WHERE id = $1 AND tenant_id = $2', [userId, businessKey]);
        if (!targetUser) {
            throw new NotFoundError('User');
        }
        if (targetUser.role === 'Admin') {
            const adminCount = await queryOne("SELECT COUNT(*) as count FROM users WHERE tenant_id = $1 AND role = 'Admin'", [businessKey]);
            if (adminCount && parseInt(adminCount.count) <= 1) {
                throw new ValidationError('Cannot remove the last Admin of this business');
            }
        }
        await queryExecute('DELETE FROM users WHERE id = $1', [userId]);
        res.json({ message: 'User deleted successfully' });
    }
    catch (error) {
        if (error instanceof ValidationError) {
            res.status(400).json({ error: error.message });
        }
        else if (error instanceof NotFoundError) {
            res.status(404).json({ error: error.message });
        }
        else {
            console.error('Delete user error:', error);
            res.status(500).json({ error: 'Failed to delete user' });
        }
    }
});
// ─── Reset user password (admin only) ───────────────────────────────────────
router.post('/:userId/reset-password', requireAdmin, requireTenant, async (req, res) => {
    try {
        const { userId } = req.params;
        const { tempPassword } = z.object({ tempPassword: z.string().min(6) }).parse(req.body);
        const user = await queryOne('SELECT id FROM users WHERE id = $1 AND tenant_id = $2', [userId, req.params.businessKey]);
        if (!user) {
            throw new NotFoundError('User');
        }
        const { hashPassword } = await import('../utils/tokens');
        const newHash = await hashPassword(tempPassword);
        await queryExecute('UPDATE users SET password_hash = $1, must_change_password = true, updated_at = NOW() WHERE id = $2', [newHash, userId]);
        res.json({ message: 'Password reset successfully' });
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
            console.error('Reset password error:', error);
            res.status(500).json({ error: 'Failed to reset password' });
        }
    }
});
export default router;
//# sourceMappingURL=users.js.map