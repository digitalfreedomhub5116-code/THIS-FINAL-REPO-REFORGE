// Run IAP transactions table migration
import pg from 'pg';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const sql = `
CREATE TABLE IF NOT EXISTS iap_transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  player_id uuid REFERENCES players(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  transaction_id text UNIQUE NOT NULL,
  credit_type text NOT NULL,
  credit_amount integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_iap_transactions_tid ON iap_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_iap_transactions_player ON iap_transactions(player_id);
`;

try {
  const result = await pool.query(sql);
  console.log('✅ iap_transactions table created successfully');
} catch (err) {
  console.error('❌ Migration failed:', err.message);
} finally {
  await pool.end();
}
