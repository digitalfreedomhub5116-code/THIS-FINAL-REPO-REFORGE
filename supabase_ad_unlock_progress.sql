-- ─────────────────────────────────────────────────────────────
-- Ad-Gated Cosmetic Unlock Progress
-- ─────────────────────────────────────────────────────────────
-- Tracks per-item rewarded-ad watch counts. When ads_watched reaches
-- ads_required, the server-side route auto-inserts the item into
-- user_inventory with source='reward' (no gold cost).
--
-- Used by: server/routes/adUnlock.ts (POST /api/ad-unlock/watch)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ad_unlock_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  ads_watched INTEGER NOT NULL DEFAULT 0,
  ads_required INTEGER NOT NULL,
  unlocked BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (player_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_ad_unlock_progress_player
  ON ad_unlock_progress (player_id);

-- The server uses service_role which bypasses RLS, but make it explicit
ALTER TABLE ad_unlock_progress DISABLE ROW LEVEL SECURITY;
