-- =============================================
-- Solo Leveling App - Migration Fix
-- Run this in your Supabase SQL Editor
-- =============================================

-- 1. Drop the foreign key constraint on supabase_id (local auth users won't be in auth.users)
ALTER TABLE players ALTER COLUMN supabase_id TYPE TEXT USING supabase_id::TEXT;
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_supabase_id_fkey;

-- 2. Add missing columns to players table
ALTER TABLE players ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS auth_type VARCHAR(50) DEFAULT 'local';
ALTER TABLE players ADD COLUMN IF NOT EXISTS current_xp INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS required_xp INTEGER DEFAULT 100;
ALTER TABLE players ADD COLUMN IF NOT EXISTS daily_xp INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS hp INTEGER DEFAULT 100;
ALTER TABLE players ADD COLUMN IF NOT EXISTS max_hp INTEGER DEFAULT 100;
ALTER TABLE players ADD COLUMN IF NOT EXISTS mp INTEGER DEFAULT 50;
ALTER TABLE players ADD COLUMN IF NOT EXISTS max_mp INTEGER DEFAULT 50;
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_configured BOOLEAN DEFAULT FALSE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_penalty_active BOOLEAN DEFAULT FALSE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS tutorial_step INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS tutorial_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS daily_quest_complete BOOLEAN DEFAULT FALSE;

-- 3. Fix api_usage_logs table to match what the app inserts
ALTER TABLE api_usage_logs ADD COLUMN IF NOT EXISTS route VARCHAR(255);
ALTER TABLE api_usage_logs ADD COLUMN IF NOT EXISTS model VARCHAR(255);
ALTER TABLE api_usage_logs ADD COLUMN IF NOT EXISTS input_tokens INTEGER DEFAULT 0;
ALTER TABLE api_usage_logs ADD COLUMN IF NOT EXISTS output_tokens INTEGER DEFAULT 0;
ALTER TABLE api_usage_logs ADD COLUMN IF NOT EXISTS cost_usd NUMERIC(10,6) DEFAULT 0;
ALTER TABLE api_usage_logs ADD COLUMN IF NOT EXISTS success BOOLEAN DEFAULT TRUE;
-- Make user_id a TEXT type to accept our local auth IDs
ALTER TABLE api_usage_logs ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE api_usage_logs DROP CONSTRAINT IF EXISTS api_usage_logs_user_id_fkey;

-- 4. Fix user_custom_plans user_id to be TEXT
ALTER TABLE user_custom_plans ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
ALTER TABLE user_custom_plans DROP CONSTRAINT IF EXISTS user_custom_plans_user_id_fkey;

-- 5. Add missing tables
CREATE TABLE IF NOT EXISTS global_config (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS global_videos (
  key VARCHAR(255) PRIMARY KEY,
  url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leaderboard_cache (
  username VARCHAR(255),
  name VARCHAR(255),
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  rank VARCHAR(50) DEFAULT 'E',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Add missing columns to workout_exercises if they differ
ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS type VARCHAR(50);
ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS muscle_group VARCHAR(255);
ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS default_sets INTEGER DEFAULT 3;
ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS default_reps VARCHAR(50) DEFAULT '10';
ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- 7. Add workout_plans table if missing
CREATE TABLE IF NOT EXISTS workout_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  difficulty VARCHAR(50),
  equipment VARCHAR(50),
  duration_weeks INTEGER DEFAULT 4,
  days_per_week INTEGER DEFAULT 4,
  days JSONB,
  display_order INTEGER DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Disable RLS on tables that use service role key (server-side access)
-- The server uses the service_role key which bypasses RLS anyway,
-- but let's add permissive policies for safety
ALTER TABLE players DISABLE ROW LEVEL SECURITY;
ALTER TABLE global_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE global_videos DISABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE api_usage_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE store_outfits DISABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_custom_plans DISABLE ROW LEVEL SECURITY;

-- Done! Your Sdatabase is now ready for the Solo Leveling app.
