-- Reforge Guilds System — Supabase Schema
-- Run this in your Supabase SQL Editor.
-- All app access goes through the Express server using the service-role key,
-- so RLS stays restrictive (no public client policies needed).

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Guilds ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guilds (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name          VARCHAR(40) UNIQUE NOT NULL,
  tag           VARCHAR(6),
  motto         VARCHAR(120) DEFAULT '',
  icon          TEXT,                         -- emoji or asset key
  banner        TEXT,                         -- asset key / gradient id
  privacy       VARCHAR(20) DEFAULT 'open',   -- 'open' | 'invite_only'
  master_id     TEXT NOT NULL,                -- players.supabase_id of the founder
  member_cap    INTEGER DEFAULT 150,
  glory_points  INTEGER DEFAULT 0,
  vault_balance INTEGER DEFAULT 0,
  war_registered_week DATE,                   -- opt-in war: the Thursday (week_start) the guild registered for
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- Idempotent: add the column if upgrading an existing guilds table.
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS war_registered_week DATE;
-- Premium guild icons the guild has unlocked via the Vault (array of icon keys).
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS unlocked_icons JSONB DEFAULT '[]'::jsonb;

-- ── 2. Guild Members ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guild_members (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  guild_id            UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  user_id             TEXT NOT NULL,            -- players.supabase_id
  role                VARCHAR(20) DEFAULT 'member', -- 'master' | 'vice' | 'member'
  contribution_points INTEGER DEFAULT 0,
  joined_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(guild_id, user_id)
);
-- Enforce ONE guild per user across the whole table.
CREATE UNIQUE INDEX IF NOT EXISTS idx_guild_members_one_per_user ON guild_members(user_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_guild ON guild_members(guild_id);

-- ── 3. Join Requests ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guild_join_requests (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  guild_id   UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL,
  status     VARCHAR(20) DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(guild_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_guild_requests_guild ON guild_join_requests(guild_id, status);

-- ── 4. Guild Chat ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guild_chat (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  guild_id   UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  user_id    TEXT,                            -- NULL for system messages
  type       VARCHAR(20) DEFAULT 'user',      -- 'user' | 'system' | 'workout'
  body       TEXT DEFAULT '',
  meta       JSONB DEFAULT '{}',              -- workout card payload, author snapshot, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_guild_chat_guild_time ON guild_chat(guild_id, created_at DESC);

-- ── 5. Daily Missions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guild_missions (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  guild_id   UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  title      VARCHAR(120) NOT NULL,
  target     INTEGER NOT NULL DEFAULT 50,
  progress   INTEGER NOT NULL DEFAULT 0,
  reward     JSONB DEFAULT '{}',              -- { gold, glory }
  completed  BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(guild_id, date)
);

-- ── 6. Guild Wars ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guild_wars (
  id                  UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  week_start          DATE NOT NULL,          -- the Thursday the war begins
  guild_a             UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  guild_b             UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  score_a             INTEGER DEFAULT 0,
  score_b             INTEGER DEFAULT 0,
  status              VARCHAR(20) DEFAULT 'active', -- 'scheduled' | 'active' | 'ended'
  winner_id           UUID,
  rewards_distributed BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(week_start, guild_a, guild_b)
);
CREATE INDEX IF NOT EXISTS idx_guild_wars_week ON guild_wars(week_start, status);

-- Per-contributor war points (for the "Top Contributors" list)
CREATE TABLE IF NOT EXISTS guild_war_contributions (
  id       UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  war_id   UUID NOT NULL REFERENCES guild_wars(id) ON DELETE CASCADE,
  guild_id UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  user_id  TEXT NOT NULL,
  points   INTEGER DEFAULT 0,
  UNIQUE(war_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_war_contrib_war ON guild_war_contributions(war_id, points DESC);

-- ── 7. Vault Transactions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS guild_vault_transactions (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  guild_id   UUID NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
  user_id    TEXT NOT NULL,
  kind       VARCHAR(20) NOT NULL,            -- 'donate' | 'purchase'
  amount     INTEGER NOT NULL,
  item_key   VARCHAR(60),                     -- shop item purchased (nullable)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vault_txn_guild ON guild_vault_transactions(guild_id, created_at DESC);

-- ── Atomic increment helpers (avoid read-modify-write races) ─────────────────
CREATE OR REPLACE FUNCTION guild_add_glory(p_guild UUID, p_amount INTEGER)
RETURNS VOID AS $$
  UPDATE guilds SET glory_points = glory_points + p_amount, updated_at = NOW() WHERE id = p_guild;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION guild_add_vault(p_guild UUID, p_amount INTEGER)
RETURNS VOID AS $$
  UPDATE guilds SET vault_balance = GREATEST(0, vault_balance + p_amount), updated_at = NOW() WHERE id = p_guild;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION guild_mission_progress(p_guild UUID, p_date DATE, p_amount INTEGER)
RETURNS VOID AS $$
  UPDATE guild_missions
     SET progress = progress + p_amount,
         completed = (progress + p_amount) >= target
   WHERE guild_id = p_guild AND date = p_date;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION guild_member_contribute(p_guild UUID, p_user TEXT, p_amount INTEGER)
RETURNS VOID AS $$
  UPDATE guild_members
     SET contribution_points = contribution_points + p_amount
   WHERE guild_id = p_guild AND user_id = p_user;
$$ LANGUAGE sql;

-- updated_at trigger (reuses the shared function from the main schema if present)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $f$
      BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
    $f$ LANGUAGE plpgsql;
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_guilds_updated_at ON guilds;
CREATE TRIGGER update_guilds_updated_at BEFORE UPDATE ON guilds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── RLS — enabled, server-only (service role bypasses these) ─────────────────
ALTER TABLE guilds                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_members             ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_join_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_chat                ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_missions            ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_wars                ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_war_contributions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE guild_vault_transactions  ENABLE ROW LEVEL SECURITY;
