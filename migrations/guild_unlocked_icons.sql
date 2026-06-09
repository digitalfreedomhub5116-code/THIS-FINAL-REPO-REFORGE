-- Adds the column that tracks which premium guild icons a guild has unlocked
-- through the Vault (Appearance section). Safe to run multiple times.
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS unlocked_icons JSONB DEFAULT '[]'::jsonb;
