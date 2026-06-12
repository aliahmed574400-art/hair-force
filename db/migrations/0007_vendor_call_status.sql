-- ============================================================================
-- Vendor voice-call availability status
-- ============================================================================

ALTER TABLE vendor_profiles
ADD COLUMN IF NOT EXISTS call_status VARCHAR(20) NOT NULL DEFAULT 'available'
CHECK (call_status IN ('available', 'busy'));

CREATE INDEX IF NOT EXISTS vendor_profiles_call_status_idx ON vendor_profiles (call_status);
