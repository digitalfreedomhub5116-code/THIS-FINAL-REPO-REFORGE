-- ============================================================
-- ADMIN SECURITY MIGRATION
-- Run this manually in Supabase SQL Editor
-- ============================================================

-- ── FIX 3: Admin Audit Log ──────────────────────────────────
-- Logs every privileged admin action for accountability.

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  admin_id      text        NOT NULL DEFAULT 'admin',
  action        text        NOT NULL,
  target_user   text,
  old_value     jsonb,
  new_value     jsonb,
  ip_address    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action  ON admin_audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_target  ON admin_audit_log (target_user);

-- ── FIX 4: Persistent IP Lockout ────────────────────────────
-- Tracks failed admin login attempts so lockout survives
-- server restarts / Railway redeploys.

CREATE TABLE IF NOT EXISTS admin_failed_logins (
  ip_address    text        NOT NULL,
  attempt_count integer     NOT NULL DEFAULT 1,
  blocked_until timestamptz,
  last_attempt  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (ip_address)
);

CREATE INDEX IF NOT EXISTS idx_failed_blocked ON admin_failed_logins (blocked_until);
