-- 1. Add level column to guilds if it doesn't exist, and drop glory_points
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 0;
ALTER TABLE guilds DROP COLUMN IF EXISTS glory_points;

-- 2. Recalculate function
CREATE OR REPLACE FUNCTION recalculate_guild_level(p_guild_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_level INTEGER;
BEGIN
  SELECT COALESCE(SUM(p.level), 0)
    INTO v_total_level
    FROM guild_members m
    JOIN players p ON m.user_id = p.supabase_id
   WHERE m.guild_id = p_guild_id;

  UPDATE guilds
     SET level = v_total_level,
         updated_at = NOW()
   WHERE id = p_guild_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Trigger function for guild_members changes
CREATE OR REPLACE FUNCTION trigger_on_guild_members_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM recalculate_guild_level(NEW.guild_id);
  END IF;
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    PERFORM recalculate_guild_level(OLD.guild_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 4. Trigger on guild_members table
DROP TRIGGER IF EXISTS trg_guild_members_change ON guild_members;
CREATE TRIGGER trg_guild_members_change
  AFTER INSERT OR UPDATE OR DELETE ON guild_members
  FOR EACH ROW EXECUTE FUNCTION trigger_on_guild_members_change();

-- 5. Trigger function for players level changes
CREATE OR REPLACE FUNCTION trigger_on_players_level_change()
RETURNS TRIGGER AS $$
DECLARE
  v_guild_id UUID;
BEGIN
  -- Check if level changed
  IF OLD.level IS DISTINCT FROM NEW.level THEN
    -- Find the player's guild
    SELECT guild_id INTO v_guild_id
      FROM guild_members
     WHERE user_id = NEW.supabase_id;

    IF v_guild_id IS NOT NULL THEN
      PERFORM recalculate_guild_level(v_guild_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Trigger on players table
DROP TRIGGER IF EXISTS trg_players_level_change ON players;
CREATE TRIGGER trg_players_level_change
  AFTER UPDATE OF level ON players
  FOR EACH ROW EXECUTE FUNCTION trigger_on_players_level_change();

-- 7. Initialize levels for all existing guilds in the database
UPDATE guilds g
   SET level = (
     SELECT COALESCE(SUM(p.level), 0)
       FROM guild_members m
       JOIN players p ON m.user_id = p.supabase_id
      WHERE m.guild_id = g.id
   );
