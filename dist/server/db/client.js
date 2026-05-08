import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const config = {
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
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
    console.error('❌ Failed to connect to PostgreSQL:', err.message);
    process.exit(1);
});
// Generic query helper - returns array of rows
export const query = async (text, params = []) => {
    const client = await pool.connect();
    try {
        const result = await client.query(text, params);
        return result.rows;
    }
    finally {
        client.release();
    }
};
// Query single row
export const queryOne = async (text, params = []) => {
    const rows = await query(text, params);
    return rows.length > 0 ? rows[0] : null;
};
// Execute (non-SELECT) query
export const queryExecute = async (text, params = []) => {
    const client = await pool.connect();
    try {
        const result = await client.query(text, params);
        return result.rowCount ?? 0;
    }
    finally {
        client.release();
    }
};
// Transaction helper
export const withTransaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
};
export default pool;
//# sourceMappingURL=client.js.map