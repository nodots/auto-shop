import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './db/schema.js';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/auto_shop_gui',
});

export const db = drizzle(pool, { schema });

export async function checkConnection() {
  await pool.query('SELECT 1');
}
