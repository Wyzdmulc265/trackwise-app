import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { queryExecute, queryOne } from '../db/client.js';
// Password hashing
export const hashPassword = async (password) => {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
};
export const verifyPassword = async (password, hash) => {
    return bcrypt.compare(password, hash);
};
// JWT token generation
export const generateTokens = (payload) => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret)
        throw new Error('JWT_SECRET not configured');
    const expiresIn = `${process.env.JWT_EXPIRY || 15}m`;
    const accessToken = jwt.sign(payload, jwtSecret, { expiresIn });
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    if (!refreshSecret)
        throw new Error('JWT_REFRESH_SECRET not configured');
    const refreshExpiresIn = `${process.env.JWT_REFRESH_EXPIRY || 10080}m`;
    const refreshToken = jwt.sign({ userId: payload.userId, type: 'refresh' }, refreshSecret, { expiresIn: refreshExpiresIn });
    return { accessToken, refreshToken };
};
export const storeRefreshToken = async (userId, token) => {
    // Get user's tenant_id
    const user = await queryOne('SELECT tenant_id FROM users WHERE id = $1', [userId]);
    if (!user)
        throw new Error('User not found');
    const expiresAt = new Date(Date.now() + (parseInt(process.env.JWT_REFRESH_EXPIRY || '10080') * 60 * 1000)).toISOString();
    await queryExecute(`INSERT INTO refresh_tokens (id, tenant_id, user_id, token, expires_at, created_at, revoked)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`, [randomUUID(), user.tenant_id, userId, token, expiresAt, new Date().toISOString(), false]);
};
export const verifyRefreshToken = async (token) => {
    try {
        const refreshSecret = process.env.JWT_REFRESH_SECRET;
        if (!refreshSecret)
            return { valid: false };
        const decoded = jwt.verify(token, refreshSecret);
        const record = await queryOne('SELECT * FROM refresh_tokens WHERE token = $1 AND revoked = false', [token]);
        if (!record) {
            return { valid: false };
        }
        if (new Date(record.expires_at) < new Date()) {
            return { valid: false };
        }
        return { valid: true, userId: decoded.userId };
    }
    catch {
        return { valid: false };
    }
};
export const revokeRefreshToken = async (token) => {
    await queryExecute('UPDATE refresh_tokens SET revoked = true WHERE token = $1', [token]);
};
export const revokeAllUserTokens = async (userId) => {
    await queryExecute('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [userId]);
};
export const cleanupExpiredTokens = async () => {
    const result = await queryExecute("DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked = true");
    console.log(`Cleaned up ${result} expired/revoked tokens`);
    return result;
};
//# sourceMappingURL=tokens.js.map