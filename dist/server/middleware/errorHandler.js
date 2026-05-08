const getRequestId = (req) => req.requestId;
const safeUserContext = (req) => {
    const user = req.user;
    if (!user)
        return {};
    return {
        userId: user.userId ?? user.sub,
        role: user.role,
    };
};
export const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal server error';
    const code = err.code || 'INTERNAL_ERROR';
    console.error(JSON.stringify({
        level: 'error',
        requestId: getRequestId(req),
        method: req.method,
        path: req.originalUrl ?? req.path,
        statusCode,
        code,
        message,
        user: safeUserContext(req),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    }));
    res.status(statusCode).json({
        error: message,
        requestId: getRequestId(req),
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
        code,
    });
};
export const notFoundHandler = (req, res) => {
    res.status(404).json({
        error: `Route ${req.method} ${req.path} not found`,
        code: 'NOT_FOUND',
    });
};
// Base application error class
export class AppError extends Error {
    statusCode;
    code;
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
// Specific error types
export class ValidationError extends AppError {
    constructor(message = 'Validation failed') {
        super(message, 400, 'VALIDATION_ERROR');
        this.name = 'ValidationError';
    }
}
export class AuthenticationError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, 401, 'AUTH_REQUIRED');
        this.name = 'AuthenticationError';
    }
}
export class AuthorizationError extends AppError {
    constructor(message = 'Insufficient permissions') {
        super(message, 403, 'FORBIDDEN');
        this.name = 'AuthorizationError';
    }
}
export class NotFoundError extends AppError {
    constructor(resource = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
        this.name = 'NotFoundError';
    }
}
export class ConflictError extends AppError {
    constructor(message = 'Resource already exists') {
        super(message, 409, 'CONFLICT');
        this.name = 'ConflictError';
    }
}
export class DatabaseError extends AppError {
    constructor(message = 'Database operation failed') {
        super(message, 500, 'DATABASE_ERROR');
        this.name = 'DatabaseError';
    }
}
//# sourceMappingURL=errorHandler.js.map