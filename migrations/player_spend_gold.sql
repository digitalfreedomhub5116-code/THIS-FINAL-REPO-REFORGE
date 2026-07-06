-- =============================================
-- Atomic player gold spend helper
-- Run this in your Supabase SQL Editor.
-- =============================================
--
-- Fixes a read-modify-write race on players.gold: the guild vault donate
-- route previously read gold in JS, then wrote (gold - amount), which could
-- lose concurrent updates. This function performs the deduction atomically
-- and only if the player still has enough gold.
--
-- Returns the player's NEW gold balance, or NULL when the player was not
-- found or does not have enough gold (i.e. the spend was rejected).

CREATE OR REPLACE FUNCTION player_spend_gold(p_uid TEXT, p_amount INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_new_gold INTEGER;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN NULL;
  END IF;

  UPDATE players
     SET gold = gold - p_amount
   WHERE supabase_id::text = p_uid
     AND gold >= p_amount
  RETURNING gold INTO v_new_gold;

  RETURN v_new_gold; -- NULL if no row matched (not found or insufficient gold)
END;
$$ LANGUAGE plpgsql;
