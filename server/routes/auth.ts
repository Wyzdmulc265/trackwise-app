import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthPayload } from '../types.js';
import {
  hashPassword,
  verifyPassword,
  generateTokens,
  storeRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
  verifyRefreshToken,
} from '../utils/tokens.js';
import { queryOne, queryExecute } from '../db/client.js';
import { withPrefix } from '../utils/ids.js';
import { ValidationError } from '../middleware/errorHandler.js';
import { registerSchema, loginSchema } from '../validations/schemas.js';
import { getRequestId } from '../middleware/requestLogger.js';

const router = Router();

const logAction = (req: Request, action: string, extra?: Record<string, unknown>): void => {
  const requestId = getRequestId(req);
  console.info(
    JSON.stringify({
      level: 'info',
      requestId,
      action,
    })
  );
};

const readBearerToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
};

const handleJwtVerify = (req: Request, next: NextFunction, token: string): AuthPayload => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
  } catch (err) {
    // Keep existing behavior: treat as authentication failure
    next(err);
    throw err;
  }
};

// ─── Validate business key param ─────────────────────────────────────────────
const validateBusinessKey = async (req: Request): Promise<string> => {
  // The businessKey comes from the URL params in registration
  return req.params.businessKey as string;
};

const slug = (s: string): string => s.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

// ─── Register new business + admin ───────────────────────────────────────────
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ownerName, username, businessName, contact, password } = registerSchema.parse(req.body);

    // business key generation must not depend on sensitive payload fields

    const existingUser = await queryOne<{ username: string }>(
      'SELECT username FROM users WHERE LOWER(username) = LOWER($1)',
      [username]
    );
    if (existingUser) {
      throw new ValidationError('That username is already taken');
    }

    const existingBusiness = await queryOne<{ name: string }>(
      'SELECT name FROM businesses WHERE LOWER(name) = LOWER($1)',
      [businessName]
    );
    if (existingBusiness) {
      throw new ValidationError('A business with that name is already registered');
    }

    const businessKey = `tw_biz_${slug(businessName)}_${Date.now().toString(36)}`;

    const businessId = withPrefix('biz');
    await queryExecute(
      `INSERT INTO businesses (id, tenant_id, name, owner_name, contact) VALUES ($1, $2, $3, $4, $5)`,
      [businessId, businessKey, businessName, ownerName, contact]
    );

    const passwordHash = await hashPassword(password);
    const userId = withPrefix('usr');

    await queryExecute(
      `INSERT INTO users (id, tenant_id, owner_name, username, business_name, contact, password_hash, role, must_change_password, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [userId, businessKey, ownerName, username, businessName, contact, passwordHash, 'Admin', false]
    );

    // Create default categories
    const defaultCategories = [
      ['Product Sales', 'sale'],
      ['Services & Consulting', 'sale'],
      ['Subscription Revenue', 'sale'],
      ['Stock Purchase', 'purchase'],
      ['Office Rent', 'expense'],
      ['Utilities & Internet', 'expense'],
      ['Salaries & Wages', 'expense'],
      ['Marketing & Ads', 'expense'],
      ['Software & Tools', 'expense'],
    ];

    for (const [name, type] of defaultCategories) {
      await queryExecute(
        `INSERT INTO categories (id, tenant_id, name, type, is_custom, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [withPrefix('cat'), businessKey, name, type, true]
      );
    }

    const payload: AuthPayload = {
      userId,
      username,
      businessName,
      ownerName,
      role: 'Admin',
      businessKey,
      tenantId: businessKey,
      mustChangePassword: false,
    };

    const { accessToken, refreshToken } = generateTokens(payload);
    await storeRefreshToken(userId, refreshToken);

    logAction(req, 'auth.register.success', { userId });
    res.status(201).json({
      message: 'Business registered successfully',
      user: payload,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    // Let centralized errorHandler format + log request context
    if (error instanceof ValidationError) return next(error);
    if ((error as any)?.code === '23505') return next(new ValidationError('Duplicate data - username or business name already exists'));
    return next(error);
  }
});

// ─── Login ───────────────────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, businessName, password } = loginSchema.parse(req.body);

    const user = await queryOne<any>(
      `SELECT id, username, business_name, owner_name, password_hash, role, must_change_password, tenant_id
       FROM users WHERE LOWER(username) = LOWER($1) AND LOWER(business_name) = LOWER($2)`,
      [username, businessName]
    );

    if (!user) {
      throw new ValidationError('No account found with that username and business name');
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      throw new ValidationError('Incorrect password');
    }

    const payload: AuthPayload = {
      userId: user.id,
      username: user.username,
      businessName: user.business_name,
      ownerName: user.owner_name,
      role: user.role,
      businessKey: user.tenant_id,
      tenantId: user.tenant_id,
      mustChangePassword: user.must_change_password,
    };

    const { accessToken, refreshToken } = generateTokens(payload);
    await storeRefreshToken(user.id, refreshToken);

    logAction(req, 'auth.login.success', { userId: user.id });
    res.json({
      message: 'Login successful',
      user: payload,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    // Preserve semantics from previous version: login validation failures return 401
    if (error instanceof ValidationError) {
      error.statusCode = 401;
    }
    return next(error);
  }
});

// ─── Get current session ─────────────────────────────────────────────────────
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = readBearerToken(req);
    if (!token) throw new ValidationError('No token provided');

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;

    const user = await queryOne<any>(
      `SELECT id, username, business_name, owner_name, role, must_change_password, tenant_id
       FROM users WHERE id = $1`,
      [payload.userId]
    );

    if (!user) {
      throw new ValidationError('User not found');
    }

    const session: AuthPayload = {
      userId: user.id,
      username: user.username,
      businessName: user.business_name,
      ownerName: user.owner_name,
      role: user.role,
      businessKey: user.tenant_id,
      tenantId: user.tenant_id,
      mustChangePassword: user.must_change_password,
    };

    logAction(req, 'auth.me.success', { userId: session.userId });
    res.json({ session });
  } catch (error: any) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return next(new ValidationError(error instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token'));
    }
    return next(error);
  }
});

const refreshSchema = {
  parse: (body: any) => {
    if (!body?.refreshToken || typeof body.refreshToken !== 'string' || body.refreshToken.length < 1) {
      throw new ValidationError('Invalid request');
    }
    return { refreshToken: body.refreshToken as string };
  },
};

// ─── Refresh access token ────────────────────────────────────────────────────
router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);

    const { valid, userId } = await verifyRefreshToken(refreshToken);
    if (!valid || !userId) {
      throw new ValidationError('Invalid or expired refresh token');
    }

    const user = await queryOne<any>(
      `SELECT id, username, business_name, owner_name, role, must_change_password, tenant_id
       FROM users WHERE id = $1`,
      [userId]
    );

    if (!user) {
      throw new ValidationError('User not found');
    }

    const payload: AuthPayload = {
      userId: user.id,
      username: user.username,
      businessName: user.business_name,
      ownerName: user.owner_name,
      role: user.role,
      businessKey: user.tenant_id,
      tenantId: user.tenant_id,
      mustChangePassword: user.must_change_password,
    };

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(payload);
    await storeRefreshToken(user.id, newRefreshToken);

    logAction(req, 'auth.refresh.success', { userId: payload.userId });
    res.json({
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    return next(error);
  }
});

// ─── Logout ───────────────────────────────────────────────────────────────────
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const refreshToken = req.body?.refreshToken;

    if (refreshToken && typeof refreshToken === 'string') {
      // Avoid logging token details
      await revokeRefreshToken(refreshToken);
    }

    logAction(req, 'auth.logout.success');
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    return next(error);
  }
});

const changePasswordSchema = {
  parse: (body: any) => {
    const currentPassword = body?.currentPassword;
    const newPassword = body?.newPassword;

    if (typeof currentPassword !== 'string' || currentPassword.length < 1) {
      throw new ValidationError('Invalid request');
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      throw new ValidationError('Invalid request');
    }
    return { currentPassword, newPassword };
  },
};

// ─── Change password ─────────────────────────────────────────────────────────
router.post('/change-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = readBearerToken(req);
    if (!token) throw new ValidationError('Authentication required');

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;

    const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

    const user = await queryOne<any>(
      'SELECT id, password_hash FROM users WHERE id = $1',
      [payload.userId]
    );

    if (!user) {
      throw new ValidationError('User not found');
    }

    const isValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isValid) {
      throw new ValidationError('Current password is incorrect');
    }

    const newPasswordHash = await hashPassword(newPassword);
    await queryExecute(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, payload.userId]
    );

    await revokeAllUserTokens(payload.userId);

    logAction(req, 'auth.change-password.success', { userId: payload.userId });
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    return next(error);
  }
});

export default router;
