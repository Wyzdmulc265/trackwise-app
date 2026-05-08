import jwt from 'jsonwebtoken';
export const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Attach user info to request
        req.user = decoded;
        next();
    }
    catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({ error: 'Invalid token' });
        }
        else if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({ error: 'Token expired' });
        }
        else {
            res.status(500).json({ error: 'Authentication failed' });
        }
    }
};
export const requireAdmin = (req, res, next) => {
    const user = req.user;
    if (!user || user.role !== 'Admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
    }
    next();
};
export const requireTenant = (req, res, next) => {
    const user = req.user;
    if (!user) {
        res.status(401).json({ error: 'Authentication required' });
        return;
    }
    // If route provides businessKey as param, ensure it matches user's businessKey
    if (req.params.businessKey && req.params.businessKey !== user.businessKey) {
        res.status(403).json({ error: 'Cross-tenant access denied' });
        return;
    }
    // Inject businessKey into params for routes that don't have it in path
    if (!req.params.businessKey) {
        req.params.businessKey = user.businessKey;
    }
    next();
};
// Optional: authenticate but don't require (for public endpoints that can benefit from user context)
export const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
        }
    }
    catch {
        // Ignore errors for optional auth
    }
    next();
};
//# sourceMappingURL=auth.js.map