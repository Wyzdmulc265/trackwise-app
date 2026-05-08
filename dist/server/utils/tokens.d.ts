import { AuthPayload } from '../types.js';
export declare const hashPassword: (password: string) => Promise<string>;
export declare const verifyPassword: (password: string, hash: string) => Promise<boolean>;
export declare const generateTokens: (payload: AuthPayload) => {
    accessToken: string;
    refreshToken: string;
};
export declare const storeRefreshToken: (userId: string, token: string) => Promise<void>;
export declare const verifyRefreshToken: (token: string) => Promise<{
    valid: boolean;
    userId?: string;
}>;
export declare const revokeRefreshToken: (token: string) => Promise<void>;
export declare const revokeAllUserTokens: (userId: string) => Promise<void>;
export declare const cleanupExpiredTokens: () => Promise<number>;
//# sourceMappingURL=tokens.d.ts.map