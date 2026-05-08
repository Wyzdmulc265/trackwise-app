import { Request, Response, NextFunction } from 'express';

export type AuthedRequest = Request & { user?: any };

const generateRequestId = (): string => {
  // Good enough for request correlation; avoids extra deps
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
};

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = (req.headers['x-request-id'] as string | undefined) ?? generateRequestId();

  res.setHeader('x-request-id', requestId);
  (req as any).requestId = requestId;

  const startedAt = Date.now();

  res.on('finish', () => {
    const user = (req as AuthedRequest).user;
    const userId = user?.userId ?? user?.sub ?? undefined;
    // Do not log sensitive data
    console.info(
      JSON.stringify({
        level: 'info',
        requestId,
        method: req.method,
        path: req.originalUrl ?? req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
        userId,
      })
    );
  });

  next();
};

export const getRequestId = (req: Request): string | undefined => (req as any).requestId;
