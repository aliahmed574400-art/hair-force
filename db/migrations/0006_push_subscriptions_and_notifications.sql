-- ============================================================================
-- Push notification subscriptions and notification tracking
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS push_subscription JSONB;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS notifications_sent BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS users_push_subscription_idx ON users (id) WHERE push_subscription IS NOT NULL;
CREATE INDEX IF NOT EXISTS bookings_notifications_sent_idx ON bookings (notifications_sent) WHERE status = 'confirmed';
