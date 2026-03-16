-- Create audit_logs table for Audit Theater feature
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    quest_id TEXT NOT NULL,
    quest_rank TEXT NOT NULL,
    outcome TEXT NOT NULL, -- 'flagged' or 'verified'
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for quick lookup
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_quest_id ON audit_logs (quest_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_logged_at ON audit_logs (logged_at);

-- Set up Row Level Security (RLS)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert logs for themselves
CREATE POLICY "Users can insert their own audit logs"
    ON audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Only admins/system can read all logs (or users can read their own if needed)
CREATE POLICY "Users can read their own audit logs"
    ON audit_logs
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);
