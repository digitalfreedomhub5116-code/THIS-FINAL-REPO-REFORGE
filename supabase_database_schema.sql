-- Solo Leveling App - Supabase Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Players table (main user table)
CREATE TABLE IF NOT EXISTS players (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  supabase_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  level INTEGER DEFAULT 1,
  total_xp INTEGER DEFAULT 0,
  rank VARCHAR(50) DEFAULT 'E-Rank',
  gold INTEGER DEFAULT 0,
  keys INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  avatar_url TEXT,
  original_selfie_url TEXT,
  cheat_strikes INTEGER DEFAULT 0,
  is_banned BOOLEAN DEFAULT FALSE,
  country TEXT,
  timezone TEXT,
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workouts table
CREATE TABLE IF NOT EXISTS workouts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  workout_date DATE,
  exercises_completed INTEGER DEFAULT 0,
  total_exercises INTEGER DEFAULT 0,
  xp_gained INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User custom workout plans
CREATE TABLE IF NOT EXISTS user_custom_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES players(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  days JSONB NOT NULL,
  plan_type VARCHAR(50) DEFAULT 'custom',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store outfits
CREATE TABLE IF NOT EXISTS store_outfits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  outfit_key VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  tier VARCHAR(10) DEFAULT 'E',
  cost INTEGER DEFAULT 0,
  accent_color VARCHAR(7) DEFAULT '#9ca3af',
  image_url TEXT,
  intro_video_url TEXT,
  loop_video_url TEXT,
  attack INTEGER DEFAULT 0,
  boost INTEGER DEFAULT 0,
  extraction INTEGER DEFAULT 0,
  ultimate INTEGER DEFAULT 0,
  is_default BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User outfit purchases
CREATE TABLE IF NOT EXISTS user_outfits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES players(id) ON DELETE CASCADE,
  outfit_id UUID REFERENCES store_outfits(id) ON DELETE CASCADE,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_equipped BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, outfit_id)
);

-- API usage logs
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES players(id) ON DELETE SET NULL,
  endpoint VARCHAR(255),
  method VARCHAR(10),
  status_code INTEGER,
  response_time INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workout exercises library
CREATE TABLE IF NOT EXISTS workout_exercises (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  difficulty VARCHAR(20) DEFAULT 'beginner',
  instructions TEXT,
  muscle_groups TEXT[],
  equipment TEXT[],
  xp_value INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User workout sessions
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES players(id) ON DELETE CASCADE,
  exercises JSONB NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_xp INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_supabase_id ON players(supabase_id);
CREATE INDEX IF NOT EXISTS idx_players_username ON players(username);
CREATE INDEX IF NOT EXISTS idx_players_level ON players(level);
CREATE INDEX IF NOT EXISTS idx_workouts_player_id ON workouts(player_id);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(workout_date);
CREATE INDEX IF NOT EXISTS idx_user_custom_plans_user_id ON user_custom_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_outfits_user_id ON user_outfits(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_user_id ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_logs_created_at ON api_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_id ON workout_sessions(user_id);

-- RLS (Row Level Security) policies
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_custom_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

-- Players can only see their own data
CREATE POLICY "Users can view own profile" ON players
  FOR SELECT USING (auth.uid() = supabase_id);

CREATE POLICY "Users can update own profile" ON players
  FOR UPDATE USING (auth.uid() = supabase_id);

CREATE POLICY "Users can insert own profile" ON players
  FOR INSERT WITH CHECK (auth.uid() = supabase_id);

-- Workout policies
CREATE POLICY "Users can view own workouts" ON workouts
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM players WHERE id = player_id AND supabase_id = auth.uid()
  ));

CREATE POLICY "Users can manage own workouts" ON workouts
  FOR ALL USING (EXISTS (
    SELECT 1 FROM players WHERE id = player_id AND supabase_id = auth.uid()
  ));

-- Custom plans policies
CREATE POLICY "Users can manage own custom plans" ON user_custom_plans
  FOR ALL USING (EXISTS (
    SELECT 1 FROM players WHERE id = user_id AND supabase_id = auth.uid()
  ));

-- User outfits policies
CREATE POLICY "Users can view own outfits" ON user_outfits
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM players WHERE id = user_id AND supabase_id = auth.uid()
  ));

CREATE POLICY "Users can manage own outfits" ON user_outfits
  FOR ALL USING (EXISTS (
    SELECT 1 FROM players WHERE id = user_id AND supabase_id = auth.uid()
  ));

-- Workout sessions policies
CREATE POLICY "Users can manage own workout sessions" ON workout_sessions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM players WHERE id = user_id AND supabase_id = auth.uid()
  ));

-- Public access for store outfits and exercises
ALTER TABLE store_outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view store outfits" ON store_outfits
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view exercises" ON workout_exercises
  FOR SELECT USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_players_updated_at BEFORE UPDATE ON players
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default store outfits
INSERT INTO store_outfits (outfit_key, name, description, tier, cost, accent_color, is_default, display_order) VALUES
  ('default_outfit', 'Default Hunter Gear', 'Basic hunter outfit for beginners', 'E', 0, '#9ca3af', true, 1),
  ('iron_outfit', 'Iron Knight Set', 'Sturdy iron armor for intermediate hunters', 'C', 500, '#94a3b8', false, 2),
  ('shadow_outfit', 'Shadow Assassin Gear', 'Lightweight gear for stealth operations', 'B', 1500, '#475569', false, 3),
  ('divine_outfit', 'Divine Warrior Armor', 'Legendary armor blessed by the gods', 'S', 5000, '#fbbf24', false, 4)
ON CONFLICT (outfit_key) DO NOTHING;
