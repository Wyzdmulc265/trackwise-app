import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import categoriesRoutes from './routes/categories.js';
import inventoryRoutes from './routes/inventory.js';
import transactionsRoutes from './routes/transactions.js';
import approvalsRoutes from './routes/approvals.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger } from './middleware/requestLogger.js';
// Environment Validation (fail fast)
const requiredEnvVars = {
    JWT_SECRET: { minLen: 32 },
    JWT_REFRESH_SECRET: { minLen: 32 },
    JWT_EXPIRY: { optional: true },
    JWT_REFRESH_EXPIRY: { optional: true },
    DATABASE_URL: {},
};
const isInsecure = (value) => {
    const v = value.toLowerCase();
    return (v.includes('change-in-production') ||
        v === 'changeme' ||
        v === 'default' ||
        v === 'your-secret');
};
for (const [key, cfg] of Object.entries(requiredEnvVars)) {
    const value = process.env[key];
    if (!value) {
        if (cfg.optional)
            continue;
        console.error(`FATAL: ${key} must be set`);
        process.exit(1);
    }
    // Skip insecure check in development mode (allow placeholder secrets)
    if (process.env.NODE_ENV !== 'development' && isInsecure(value)) {
        console.error(`FATAL: ${key} must not be a placeholder/weak value`);
        process.exit(1);
    }
    if (cfg.minLen && value.length < cfg.minLen) {
        console.error(`FATAL: ${key} is too short. Must be at least ${cfg.minLen} characters.`);
        process.exit(1);
    }
}
// Ensure token utils / middleware don't rely on unchecked env
if (!process.env.CORS_ORIGIN) {
    console.warn('Warning: CORS_ORIGIN not set. Defaulting to http://localhost:5173');
}
// Create Express app
const app = express();
/**
 * Middleware
 */
// Content Security Policy - relaxed in development for Vite HMR
if (process.env.NODE_ENV === 'development') {
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "http://localhost:3001", "ws://localhost:5175"],
                fontSrc: ["'self'", "https:", "data:"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },
    }));
}
else {
    app.use(helmet());
}
app.use(requestLogger);
// Dynamic CORS configuration
const corsOptions = {
    origin: (origin, callback) => {
        // Allow non-browser requests (like Postman, curl) through
        if (!origin)
            return callback(null, true);
        const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()) || [];
        // In development, automatically allow any localhost origin
        if (process.env.NODE_ENV === 'development') {
            const isLocalhost = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
            if (isLocalhost)
                return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(null, false); // Reject without throwing error
    },
    credentials: true,
};
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);
// Auth-specific limiter:
// Apply ONLY to endpoints that can trigger brute-force attempts, so correct logins
// and other auth flows (like /me) are not accidentally blocked.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { error: 'Too many authentication attempts, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.post('/api/auth/login', authLimiter);
app.post('/api/auth/refresh', authLimiter);
if (process.env.NODE_ENV === 'development') {
    app.use((req, _res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
    });
}
app.get('/health', (_req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/approvals', approvalsRoutes);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendRoot = path.resolve(__dirname, '..');
const frontendIndex = path.join(frontendRoot, 'index.html');
app.use(express.static(frontendRoot, { index: false }));
app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) {
        return next();
    }
    res.sendFile(frontendIndex, (err) => {
        if (err)
            next(err);
    });
});
app.use(notFoundHandler);
app.use(errorHandler);
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`TrackWise API server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});
export default app;
//# sourceMappingURL=index.js.map