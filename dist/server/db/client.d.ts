import { Pool, PoolClient } from 'pg';
export declare const pool: Pool;
export declare const query: <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;
export declare const queryOne: <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T | null>;
export declare const queryExecute: (text: string, params?: unknown[]) => Promise<number>;
export declare const withTransaction: <T>(callback: (client: PoolClient) => Promise<T>) => Promise<T>;
export default pool;
//# sourceMappingURL=client.d.ts.map