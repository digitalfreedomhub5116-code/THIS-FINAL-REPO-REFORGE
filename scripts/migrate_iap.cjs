const pg = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

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

pool.query(sql)
  .then(() => {
    console.log('✅ iap_transactions table created successfully');
    pool.end();
  })
  .catch(err => {
    console.error('❌ Migration failed:', err.message);
    pool.end();
  });
