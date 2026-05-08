import { Request, Response, NextFunction } from 'express';
export type AuthedRequest = Request & {
    user?: any;
};
export declare const requestLogger: (req: Request, res: Response, next: NextFunction) => void;
export declare const getRequestId: (req: Request) => string | undefined;
//# sourceMappingURL=requestLogger.d.ts.map