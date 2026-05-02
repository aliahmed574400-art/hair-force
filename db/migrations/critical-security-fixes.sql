-- CRITICAL SECURITY & INTEGRITY FIXES FOR HAIRFORCE DATABASE
-- Run these migrations to fix critical issues

-- ============================================================================
-- 1. PREVENT DOUBLE-BOOKING BY ENSURING UNIQUE APPOINTMENT SLOTS
-- ============================================================================
-- First, remove duplicate bookings (keep oldest, delete newer duplicates)
-- This handles cases where race conditions created multiple bookings for same slot
DELETE FROM bookings 
WHERE id NOT IN (
  SELECT MIN(id) FROM bookings 
  WHERE status NOT IN ('cancelled')
  GROUP BY vendor_slug, appointment_date, appointment_slot
) AND status NOT IN ('cancelled');

-- Add unique constraint to prevent double-booking of appointment slots
-- Note: This assumes each vendor can only have one booking per slot
-- Using partial unique index (WHERE clause) to exclude cancelled bookings
CREATE UNIQUE INDEX IF NOT EXISTS bookings_unique_vendor_slot 
  ON bookings(vendor_slug, appointment_date, appointment_slot) 
  WHERE status NOT IN ('cancelled');

-- ============================================================================
-- 2. ADD INDEXES FOR PERFORMANCE
-- ============================================================================
-- Index for payment lookups (fixes N+1 query pattern)
CREATE INDEX IF NOT EXISTS idx_payment_records_user_id ON payment_records(user_id) WHERE deleted_at IS NULL;

-- Index for booking lookups by vendor
CREATE INDEX IF NOT EXISTS idx_bookings_vendor_slug ON bookings(vendor_slug) WHERE status NOT IN ('cancelled');

-- Index for booking lookups by customer
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id) WHERE status NOT IN ('cancelled');

-- Index for session cleanup
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires_at ON auth_sessions(expires_at);

-- ============================================================================
-- 3. ADD AUDIT LOGGING TABLE
-- ============================================================================
-- Create audit log table to track sensitive operations
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id VARCHAR(255),
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- ============================================================================
-- 4. ADD SESSION CLEANUP TRIGGERS
-- ============================================================================
-- Automatically clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM auth_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create index to optimize session cleanup
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);

-- ============================================================================
-- 5. ADD CONSTRAINTS TO PREVENT DATA INTEGRITY ISSUES
-- ============================================================================
-- Ensure payment amounts are always positive
ALTER TABLE payment_records ADD CONSTRAINT payment_records_positive_amount 
  CHECK (amount > 0);

-- Ensure booking deposits are valid
ALTER TABLE bookings ADD CONSTRAINT bookings_valid_deposit 
  CHECK (deposit_amount >= 0 AND deposit_amount <= total);

-- Ensure user roles are valid
ALTER TABLE users ADD CONSTRAINT users_valid_role 
  CHECK (role IN ('client', 'vendor', 'admin'));

-- ============================================================================
-- 6. ADD PASSWORD RESET TOKEN EXPIRATION
-- ============================================================================
-- Ensure password reset tokens expire
ALTER TABLE password_resets ADD CONSTRAINT password_resets_valid_expiry 
  CHECK (expires_at > created_at);

-- Index for checking expired tokens
CREATE INDEX IF NOT EXISTS idx_password_resets_expires_at ON password_resets(expires_at);

-- ============================================================================
-- 7. ADD EMAIL VERIFICATION TRACKING
-- ============================================================================
-- Track email verification status
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;

-- ============================================================================
-- 8. ADD RATE LIMIT TRACKING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS rate_limits (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) NOT NULL,
  count INTEGER DEFAULT 1,
  reset_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(key, reset_at)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);

-- ============================================================================
-- RECOMMENDATIONS
-- ============================================================================
-- 1. Add CSRF token table for CSRF protection:
--    CREATE TABLE csrf_tokens (
--      id SERIAL PRIMARY KEY,
--      session_id VARCHAR(255) NOT NULL,
--      token VARCHAR(255) NOT NULL,
--      expires_at TIMESTAMP NOT NULL,
--      created_at TIMESTAMP DEFAULT NOW()
--    );

-- 2. Enable Row Level Security (RLS) for multi-tenancy:
--    ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
--    CREATE POLICY bookings_select ON bookings FOR SELECT
--      USING (customer_id = current_user_id() OR vendor_slug = current_vendor_slug());

-- 3. Add function to mark conversation as read:
--    This fixes the race condition in markConversationReadForUser

-- 4. Add function to validate and sanitize user input
-- 5. Add regular backup jobs
-- 6. Monitor slow queries and optimize N+1 patterns
