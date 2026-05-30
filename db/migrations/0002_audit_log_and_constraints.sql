-- 0002_audit_log_and_constraints.sql
-- Audit log table, integrity constraints, and tightening indexes.
--
-- This file REPLACES db/migrations/critical-security-fixes.sql, which
-- referenced tables that don't exist in this schema (payment_records,
-- password_resets) and used non-idempotent ADD CONSTRAINT — both would
-- crash on any deployment.

-- ============================================================================
-- audit_logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON audit_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_resource_idx ON audit_logs (resource_type, resource_id);

-- ============================================================================
-- Integrity constraints (idempotent via DO blocks)
-- ADD CONSTRAINT is NOT idempotent on its own — re-running it fails. The
-- DO block checks pg_constraint before adding.
-- ============================================================================

-- Ensure payment record amounts are non-negative (refunds may be 0; refunds
-- as negative would use a different `type` value, so >= 0 is the right check).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_payment_records_nonneg_amount'
  ) THEN
    ALTER TABLE client_payment_records
      ADD CONSTRAINT client_payment_records_nonneg_amount CHECK (amount >= 0);
  END IF;
END $$;

-- Ensure booking deposits are within total.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_valid_deposit'
  ) THEN
    ALTER TABLE bookings
      ADD CONSTRAINT bookings_valid_deposit
      CHECK (deposit_amount >= 0 AND deposit_amount <= total);
  END IF;
END $$;

-- Ensure user roles are one of the allowed values.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_valid_role'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_valid_role
      CHECK (role IN ('client', 'vendor', 'admin'));
  END IF;
END $$;

-- Ensure password-reset session expiry is in the future when created.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'password_reset_sessions_valid_expiry'
  ) THEN
    ALTER TABLE password_reset_sessions
      ADD CONSTRAINT password_reset_sessions_valid_expiry
      CHECK (expires_at > created_at);
  END IF;
END $$;

-- ============================================================================
-- Email verification tracking
-- ============================================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- ============================================================================
-- Session cleanup helper
-- Auto-deletes auth_sessions past their expires_at. Wire to a scheduled job
-- (Vercel cron, pg_cron, or a background worker) — not called automatically.
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM auth_sessions WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions (expires_at);
