-- Fix 1: Add player_id to leaderboard_cache and set username as unique
-- Run this in your Supabase SQL Editor

ALTER TABLE leaderboard_cache ADD COLUMN IF NOT EXISTS player_id TEXT;
ALTER TABLE leaderboard_cache ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Add unique constraint on username so upserts work
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leaderboard_cache_username_key'
  ) THEN
    ALTER TABLE leaderboard_cache ADD CONSTRAINT leaderboard_cache_username_key UNIQUE (username);
  END IF;
END $$;

-- Fix 2: Create workouts table if missing, with player_id as TEXT
CREATE TABLE IF NOT EXISTS workouts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  player_id TEXT,
  workout_date DATE,
  exercises_completed INTEGER DEFAULT 0,
  total_exercises INTEGER DEFAULT 0,
  xp_gained INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
-- If it already existed with UUID player_id, convert to TEXT
ALTER TABLE workouts ALTER COLUMN player_id TYPE TEXT USING player_id::TEXT;
ALTER TABLE workouts DROP CONSTRAINT IF EXISTS workouts_player_id_fkey;

-- Fix 3: Create user_custom_plans table if missing (for saving custom/AI workout plans)
CREATE TABLE IF NOT EXISTS user_custom_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT,
  name VARCHAR(255) NOT NULL,
  days JSONB NOT NULL,
  plan_type VARCHAR(50) DEFAULT 'custom',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_custom_plans_user_id ON user_custom_plans(user_id);

-- Fix 4: Clean up duplicate player rows (keep the one with password_hash, or the newest)
DELETE FROM players a USING players b
WHERE a.id < b.id
  AND a.supabase_id = b.supabase_id;

-- Also delete ghost rows with no supabase_id
DELETE FROM players WHERE supabase_id IS NULL OR supabase_id = '';

-- Ensure supabase_id has UNIQUE constraint (prevents future duplicates)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'players_supabase_id_key'
  ) THEN
    ALTER TABLE players ADD CONSTRAINT players_supabase_id_key UNIQUE (supabase_id);
  END IF;
END $$;

-- Fix 5: Session store table (required by connect-pg-simple)
CREATE TABLE IF NOT EXISTS "session" (
  "sid"    VARCHAR NOT NULL COLLATE "default",
  "sess"   JSON    NOT NULL,
  "expire" TIMESTAMP(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
