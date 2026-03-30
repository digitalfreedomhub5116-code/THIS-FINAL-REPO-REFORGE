-- Daily Rank Snapshots — stores top 5 leaderboard results at midnight
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS daily_rank_snapshots (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  rank INTEGER NOT NULL,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  username VARCHAR(255),
  daily_xp INTEGER DEFAULT 0,
  reward_gold INTEGER DEFAULT 0,
  reward_xp INTEGER DEFAULT 0,
  reward_keys INTEGER DEFAULT 0,
  claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(snapshot_date, rank)
);

-- Fast lookups for unclaimed rewards per player
CREATE INDEX IF NOT EXISTS idx_snapshots_player_unclaimed
  ON daily_rank_snapshots(player_id, claimed)
  WHERE claimed = false;

-- Fast lookups by date
CREATE INDEX IF NOT EXISTS idx_snapshots_date
  ON daily_rank_snapshots(snapshot_date DESC);

-- RLS: players can only read their own snapshots
ALTER TABLE daily_rank_snapshots ENABLE ROW LEVEL SECURITY;

-- Use explicit type cast to avoid text vs uuid mismatch
CREATE POLICY "Players can view own snapshots" ON daily_rank_snapshots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = daily_rank_snapshots.player_id
        AND players.supabase_id::text = auth.uid()::text
    )
  );

-- Allow service role (server) full access for inserts/updates
CREATE POLICY "Service role full access" ON daily_rank_snapshots
  FOR ALL USING (true) WITH CHECK (true);
