-- dusk_msg_count — persistent per-user message counter for the DUSK chat key-gate.
-- Replaces the old in-memory Map so the "1 key per 5 messages" count survives
-- server restarts and is incremented atomically (see server/lib/duskCounter.ts).
-- Run this in the Supabase SQL editor (or via your migration tooling) before
-- deploying the DB-backed dusk counter. Safe to run multiple times.

ALTER TABLE players ADD COLUMN IF NOT EXISTS dusk_msg_count integer NOT NULL DEFAULT 0;
