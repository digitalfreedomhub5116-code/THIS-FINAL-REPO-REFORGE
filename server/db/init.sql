-- Initial database schema for Solo Leveling App
-- Run this in your Replit PostgreSQL database

CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  supabase_id VARCHAR(255) UNIQUE,
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workouts (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id),
  workout_date DATE,
  exercises_completed INTEGER DEFAULT 0,
  total_exercises INTEGER DEFAULT 0,
  xp_gained INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_players_supabase_id ON players(supabase_id);
CREATE INDEX IF NOT EXISTS idx_players_username ON players(username);
CREATE INDEX IF NOT EXISTS idx_players_level ON players(level);
CREATE INDEX IF NOT EXISTS idx_workouts_player_id ON workouts(player_id);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(workout_date);
