-- System Pact Migration
-- Run this in your Supabase SQL Editor
-- Creates tables for the System Pact feature (Shadow Pledge mechanic)

-- Table 1: system_pacts — tracks every Gold pledge on a quest
CREATE TABLE IF NOT EXISTS system_pacts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL,
  quest_id TEXT NOT NULL,
  quest_title TEXT,
  quest_rank VARCHAR(2),
  pledge_amount INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'honored', 'burned', 'partial')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_system_pacts_user_id ON system_pacts(user_id);
CREATE INDEX IF NOT EXISTS idx_system_pacts_quest_id ON system_pacts(quest_id);
CREATE INDEX IF NOT EXISTS idx_system_pacts_status ON system_pacts(status);

-- Table 2: integrity_pool — tracks burned Gold contributions per week
CREATE TABLE IF NOT EXISTS integrity_pool (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL,
  pact_id UUID REFERENCES system_pacts(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  week_start DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrity_pool_week ON integrity_pool(week_start);
CREATE INDEX IF NOT EXISTS idx_integrity_pool_user_id ON integrity_pool(user_id);

-- Enable Row Level Security
ALTER TABLE system_pacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrity_pool ENABLE ROW LEVEL SECURITY;

-- Users can only see their own pact records
CREATE POLICY "Users can view own pacts" ON system_pacts
  FOR SELECT USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can insert own pacts" ON system_pacts
  FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users can update own pacts" ON system_pacts
  FOR UPDATE USING (user_id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Integrity pool is readable by all authenticated users
CREATE POLICY "Authenticated users can view integrity pool" ON integrity_pool
  FOR SELECT USING (true);

CREATE POLICY "Users can insert to integrity pool" ON integrity_pool
  FOR INSERT WITH CHECK (user_id = current_setting('request.jwt.claims', true)::json->>'sub');
