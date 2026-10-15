-- ============================================================================
-- Migration 023: contact_messages — the no-JavaScript contact form
-- ============================================================================
-- The consultancy's email address is assembled in the browser so it never
-- appears in served HTML. Visitors without JavaScript use a plain HTML form
-- instead (POST /api/contact). There is no outbound mail transport, so the
-- message is stored here for the owner to read.
--
-- Minimal data: what the visitor typed, plus a timestamp. No IP address
-- (the route's rate limit keys on it in api_rate_limits, which expires).
--
-- RLS: not user-owned data. Reads/deletes are admin-only; inserts happen
-- through withRLSBypass in the route. ENABLE + FORCE per migration 014.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS contact_messages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(254) NOT NULL,
    message TEXT NOT NULL CHECK (char_length(message) <= 5000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at
    ON contact_messages(created_at DESC);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contact_messages' AND policyname = 'contact_messages_select_admin') THEN
        EXECUTE 'CREATE POLICY contact_messages_select_admin ON contact_messages
            FOR SELECT
            USING (current_user_is_admin() OR bypass_rls_enabled())';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contact_messages' AND policyname = 'contact_messages_insert_system') THEN
        EXECUTE 'CREATE POLICY contact_messages_insert_system ON contact_messages
            FOR INSERT
            WITH CHECK (bypass_rls_enabled())';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'contact_messages' AND policyname = 'contact_messages_delete_admin') THEN
        EXECUTE 'CREATE POLICY contact_messages_delete_admin ON contact_messages
            FOR DELETE
            USING (current_user_is_admin() OR bypass_rls_enabled())';
    END IF;
END $$;

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages FORCE ROW LEVEL SECURITY;

COMMIT;
