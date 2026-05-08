const generateRequestId = () => {
    // Good enough for request correlation; avoids extra deps
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
};
export const requestLogger = (req, res, next) => {
    const requestId = req.headers['x-request-id'] ?? generateRequestId();
    res.setHeader('x-request-id', requestId);
    req.requestId = requestId;
    const startedAt = Date.now();
    res.on('finish', () => {
        const user = req.user;
        const userId = user?.userId ?? user?.sub ?? undefined;
        // Do not log sensitive data
        console.info(JSON.stringify({
            level: 'info',
            requestId,
            method: req.method,
            path: req.originalUrl ?? req.path,
            statusCode: res.statusCode,
            durationMs: Date.now() - startedAt,
            userId,
        }));
    });
    next();
};
export const getRequestId = (req) => req.requestId;
//# sourceMappingURL=requestLogger.js.map