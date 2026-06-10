-- Add last read message tracking to guild members
ALTER TABLE guild_members ADD COLUMN IF NOT EXISTS last_read_message_id UUID;
ALTER TABLE guild_members ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMP WITH TIME ZONE;
