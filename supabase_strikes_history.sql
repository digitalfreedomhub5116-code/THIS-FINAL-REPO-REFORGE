-- ============================================================
-- STRIKE & BAN SYSTEM MIGRATION
-- Run this manually in Supabase SQL Editor
-- ============================================================

-- ── FIX 2: Lifetime strike counter ────────────────────────────
-- Tracks total strikes ever issued. Never decreases.
-- Separate from cheat_strikes which resets on unban.

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS total_strikes_ever INTEGER DEFAULT 0;

-- ── FIX 5: Pending notifications for users ────────────────────
-- JSONB array storing notifications the user hasn't seen yet.
-- Used for strike-lift modals and other server-pushed messages.

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS pending_notifications JSONB DEFAULT '[]'::jsonb;
