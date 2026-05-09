import { Pool, PoolConfig, PoolClient } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  // Reduce false negatives during local dev / first-time DB startup
  connectionTimeoutMillis: 10000,
};

if (!process.env.DATABASE_URL) {
  console.warn('WARNING: DATABASE_URL not set. Using default local connection.');
  config.user = 'trackwise_admin';
  config.host = 'localhost';
  config.database = 'trackwise';
  config.password = 'trackwise_secure_123';
  config.port = 5432;
}

export const pool = new Pool(config);

pool.connect()
  .then(client => {
    console.log('✅ Connected to PostgreSQL database');
    client.release();
  })
  .catch(err => {
    const e = err as { message?: string; code?: string; name?: string };
    console.error('❌ Failed to connect to PostgreSQL:', {
      name: e.name,
      code: e.code,
      message: e.message,
      hint:
        'Check DATABASE_URL connectivity (host/port), ensure PostgreSQL is running, and verify firewall/network access.',
    });
    process.exit(1);
  });

// Generic query helper - returns array of rows
export const query = async <T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
};

// Query single row
export const queryOne = async <T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T | null> => {
  const rows = await query<T>(text, params);
  return rows.length > 0 ? rows[0] : null;
};

// Execute (non-SELECT) query
export const queryExecute = async (
  text: string,
  params: unknown[] = []
): Promise<number> => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rowCount ?? 0;
  } finally {
    client.release();
  }
};

// Transaction helper
export const withTransaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export default pool;
