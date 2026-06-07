-- ─────────────────────────────────────────────────────────────
-- Missed Workout XP Penalty System
-- ─────────────────────────────────────────────────────────────
-- Tracks consecutive missed workout days and applies escalating XP penalties:
--   1 day  = -50 XP
--   2 days = -100 XP
--   3 days = -150 XP
--   4+     = -200 XP (cap)
--
-- The penalty runs server-side via a daily cron and pushes a notification into
-- pending_notifications which the client renders as a popup on next login
-- (after the streak animation completes).
-- ─────────────────────────────────────────────────────────────

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS consecutive_missed_workouts INTEGER DEFAULT 0;

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS last_miss_check_date DATE;

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS last_dungeon_quit_date DATE;

-- Index to speed up the cron's batch query that finds users to evaluate
CREATE INDEX IF NOT EXISTS idx_players_last_miss_check
  ON players (last_miss_check_date)
  WHERE is_banned = false;
