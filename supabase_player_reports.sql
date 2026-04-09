-- ── player_reports table ──────────────────────────────────────────────────────
-- Run this in your Supabase SQL editor to enable the report system.

CREATE TABLE IF NOT EXISTS player_reports (
  id                      BIGSERIAL PRIMARY KEY,
  reporter_user_id        TEXT NOT NULL,
  reporter_name           TEXT NOT NULL DEFAULT 'Unknown',
  reported_user_id        TEXT NOT NULL,
  reported_name           TEXT NOT NULL DEFAULT 'Unknown',
  reported_level          INTEGER NOT NULL DEFAULT 1,
  reported_rank           TEXT NOT NULL DEFAULT 'E',
  reported_xp             BIGINT NOT NULL DEFAULT 0,
  reported_gold           BIGINT NOT NULL DEFAULT 0,
  reported_keys           INTEGER NOT NULL DEFAULT 0,
  reported_outfit_id      TEXT NOT NULL DEFAULT 'outfit_starter',
  reported_unlocked_outfits JSONB NOT NULL DEFAULT '[]'::jsonb,
  reasons                 JSONB NOT NULL DEFAULT '[]'::jsonb,
  status                  TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast admin lookups
CREATE INDEX IF NOT EXISTS idx_player_reports_status ON player_reports (status);
CREATE INDEX IF NOT EXISTS idx_player_reports_reported_user ON player_reports (reported_user_id);
CREATE INDEX IF NOT EXISTS idx_player_reports_created ON player_reports (created_at DESC);

-- Enable RLS (service-role key bypasses it, so server is fine)
ALTER TABLE player_reports ENABLE ROW LEVEL SECURITY;

-- Allow authenticated server inserts only (no client-side access)
CREATE POLICY "Service role full access" ON player_reports
  USING (true)
  WITH CHECK (true);
