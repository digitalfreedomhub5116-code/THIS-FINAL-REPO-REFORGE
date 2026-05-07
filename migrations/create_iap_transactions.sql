-- Migration: Create iap_transactions table for IAP idempotency & audit trail
-- This table prevents double-crediting on network retries and provides an
-- audit log of all in-app purchases.

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
