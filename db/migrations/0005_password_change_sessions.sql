-- Password change verification sessions
-- Used when a logged-in user wants to change their password via dashboard.
-- A 6-digit OTP is sent to their email and must be verified before the password is updated.

CREATE TABLE IF NOT EXISTS password_change_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  attempts_remaining INTEGER NOT NULL DEFAULT 5,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS password_change_sessions_user_id_idx
  ON password_change_sessions(user_id, created_at DESC);
