-- ai_idempotency — request-level dedupe for AI spends (see server/lib/idempotency.ts).
-- Run this in the Supabase SQL editor (or via your migration tooling) before
-- enabling idempotent AI routes. Safe to run multiple times.

CREATE TABLE IF NOT EXISTS ai_idempotency (
    key        TEXT PRIMARY KEY,          -- composed as `${userId}:${requestId}`
    user_id    TEXT NOT NULL,
    result     JSONB,                     -- null while the producer is in-flight
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index on created_at supports pruning/expiry sweeps of old idempotency rows.
CREATE INDEX IF NOT EXISTS idx_ai_idempotency_created_at ON ai_idempotency (created_at);
