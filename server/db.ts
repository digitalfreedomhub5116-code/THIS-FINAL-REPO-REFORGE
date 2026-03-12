import { drizzle } from 'drizzle-orm/node-postgres';
import { pool } from './db/pool.js';

export const db = drizzle(pool);
