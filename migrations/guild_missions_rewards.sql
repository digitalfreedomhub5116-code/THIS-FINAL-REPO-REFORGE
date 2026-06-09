-- SQL Migration: Guild Missions Overhaul and Rewards
-- Run this in your Supabase SQL Editor

-- 1. Alter guild_missions table to support specific types and cron status
ALTER TABLE guild_missions ADD COLUMN IF NOT EXISTS mission_type VARCHAR(50) DEFAULT 'generic';
ALTER TABLE guild_missions ADD COLUMN IF NOT EXISTS rewards_distributed BOOLEAN DEFAULT FALSE;

-- 2. Create guild_member_rewards table for claimable individual rewards
CREATE TABLE IF NOT EXISTS guild_member_rewards (
  id          UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     TEXT NOT NULL,
  guild_id    UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  mission_id  UUID NOT NULL REFERENCES guild_missions(id) ON DELETE CASCADE,
  gold        INTEGER NOT NULL,
  xp          INTEGER NOT NULL,
  claimed     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create index for fast user reward lookups
CREATE INDEX IF NOT EXISTS idx_guild_member_rewards_user ON guild_member_rewards(user_id, claimed);
