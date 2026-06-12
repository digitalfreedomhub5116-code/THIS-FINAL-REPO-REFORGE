-- SQL Migration: Add unique constraint to guild_member_rewards
-- Prevents duplicate claims (either active claims or daily cron settlements) for the same user and mission.

ALTER TABLE public.guild_member_rewards
ADD CONSTRAINT unique_user_mission UNIQUE (user_id, mission_id);
