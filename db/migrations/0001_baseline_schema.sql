-- 0001_baseline_schema.sql
-- Baseline schema extracted from lib/postgres.js `schemaStatements` array.
-- All statements use IF NOT EXISTS / IF NOT EXISTS column patterns so this
-- file is safe to re-run on an existing database that was previously
-- bootstrapped by the inline schemaStatements loop.

-- ============================================================================
-- users
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  vendor_slug TEXT,
  role TEXT NOT NULL DEFAULT 'client',
  password_hash TEXT NOT NULL,
  avatar TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_normalized TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_signin_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS signin_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS apple_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles';
ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'US';
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_country_code TEXT NOT NULL DEFAULT '+1';
ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS promo_code TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS reduced_motion BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS high_contrast BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS larger_text BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users ((LOWER(email)));
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_normalized_idx ON users (phone_normalized) WHERE phone_normalized IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_idx ON users (google_id) WHERE google_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_apple_id_idx ON users (apple_id) WHERE apple_id IS NOT NULL;

-- ============================================================================
-- auth_sessions
-- ============================================================================
CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address TEXT,
  device_label TEXT,
  browser TEXT,
  platform TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS auth_sessions_active_idx ON auth_sessions (user_id, last_seen_at DESC) WHERE revoked_at IS NULL;

-- ============================================================================
-- OTP sessions (phone + password-reset)
-- ============================================================================
CREATE TABLE IF NOT EXISTS phone_otp_sessions (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  phone_normalized TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts_remaining INTEGER NOT NULL DEFAULT 5,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS phone_otp_sessions_phone_idx ON phone_otp_sessions (phone_normalized, created_at DESC);

CREATE TABLE IF NOT EXISTS password_reset_sessions (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  email_normalized TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts_remaining INTEGER NOT NULL DEFAULT 5,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  reset_token_hash TEXT,
  reset_token_expires_at TIMESTAMPTZ,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS password_reset_sessions_email_idx ON password_reset_sessions (email_normalized, created_at DESC);
CREATE INDEX IF NOT EXISTS password_reset_sessions_token_idx ON password_reset_sessions (reset_token_hash) WHERE reset_token_hash IS NOT NULL;

-- ============================================================================
-- vendor_profiles
-- ============================================================================
CREATE TABLE IF NOT EXISTS vendor_profiles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  owner TEXT NOT NULL,
  category TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL,
  area TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  location_precision TEXT NOT NULL DEFAULT 'approx_area',
  rating DOUBLE PRECISION NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,
  price_from INTEGER NOT NULL DEFAULT 0,
  response_time TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  hero_tag TEXT,
  tagline TEXT,
  bio TEXT,
  cover_image TEXT,
  gallery_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  specialties JSONB NOT NULL DEFAULT '[]'::jsonb,
  amenities JSONB NOT NULL DEFAULT '[]'::jsonb,
  cover_gradient TEXT,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  gallery JSONB NOT NULL DEFAULT '[]'::jsonb,
  reviews JSONB NOT NULL DEFAULT '[]'::jsonb,
  booking_windows JSONB NOT NULL DEFAULT '[]'::jsonb,
  availability_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  availability_overrides JSONB NOT NULL DEFAULT '[]'::jsonb,
  blackout_dates JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS portfolio_images JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS service_location_type TEXT NOT NULL DEFAULT 'studio';
ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS availability_overrides JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS policies JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS personal_info JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS business_info JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS portfolio_items JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS products JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT '';
ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS area TEXT NOT NULL DEFAULT '';
ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS location_precision TEXT NOT NULL DEFAULT 'approx_area';

CREATE INDEX IF NOT EXISTS vendor_profiles_status_idx ON vendor_profiles (status);
CREATE INDEX IF NOT EXISTS vendor_profiles_state_idx ON vendor_profiles (state);

-- ============================================================================
-- services
-- ============================================================================
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  vendor_slug TEXT NOT NULL REFERENCES vendor_profiles(slug) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  duration TEXT NOT NULL,
  price INTEGER NOT NULL,
  deposit_type TEXT NOT NULL DEFAULT 'percentage',
  deposit_value INTEGER NOT NULL DEFAULT 20,
  image_url TEXT,
  description TEXT,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE services ADD COLUMN IF NOT EXISTS booking_method TEXT NOT NULL DEFAULT 'instant';
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE services ADD COLUMN IF NOT EXISTS service_type TEXT NOT NULL DEFAULT 'service';
ALTER TABLE services ADD COLUMN IF NOT EXISTS parent_category_id TEXT NOT NULL DEFAULT '';
ALTER TABLE services ADD COLUMN IF NOT EXISTS included_service_ids JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE services ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE services ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS services_vendor_slug_idx ON services (vendor_slug);

-- ============================================================================
-- bookings
-- ============================================================================
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  vendor_slug TEXT NOT NULL REFERENCES vendor_profiles(slug) ON DELETE CASCADE,
  vendor_name TEXT NOT NULL,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_slot TEXT NOT NULL,
  total INTEGER NOT NULL,
  deposit_amount INTEGER NOT NULL DEFAULT 0,
  remaining_amount INTEGER NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'pay_later',
  payment_intent_id TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'confirmed',
  source TEXT NOT NULL DEFAULT 'web',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bookings_vendor_slug_idx ON bookings (vendor_slug);
CREATE INDEX IF NOT EXISTS bookings_customer_email_lower_idx ON bookings ((LOWER(customer_email)));
CREATE INDEX IF NOT EXISTS bookings_customer_id_idx ON bookings (customer_id) WHERE customer_id IS NOT NULL;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS previous_appointment_date DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS previous_appointment_slot TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_method TEXT NOT NULL DEFAULT 'instant';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS bookings_vendor_slot_active_lookup_idx
  ON bookings (vendor_slug, appointment_date, appointment_slot)
  WHERE status <> 'cancelled' AND status <> 'declined';

-- ============================================================================
-- client_favorites
-- ============================================================================
CREATE TABLE IF NOT EXISTS client_favorites (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vendor_slug TEXT NOT NULL REFERENCES vendor_profiles(slug) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, vendor_slug)
);
CREATE INDEX IF NOT EXISTS client_favorites_vendor_slug_idx ON client_favorites (vendor_slug);

-- ============================================================================
-- notifications
-- ============================================================================
CREATE TABLE IF NOT EXISTS client_notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  cta_label TEXT,
  cta_href TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS client_notifications_user_idx ON client_notifications (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS vendor_notifications (
  id TEXT PRIMARY KEY,
  vendor_slug TEXT NOT NULL REFERENCES vendor_profiles(slug) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  booking_id TEXT,
  conversation_id TEXT,
  client_name TEXT,
  client_avatar TEXT,
  service_name TEXT,
  appointment_date DATE,
  appointment_slot TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS vendor_notifications_vendor_idx ON vendor_notifications (vendor_slug, created_at DESC);

CREATE TABLE IF NOT EXISTS client_notification_preferences (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  booking_updates BOOLEAN NOT NULL DEFAULT TRUE,
  reminders BOOLEAN NOT NULL DEFAULT TRUE,
  recommendations BOOLEAN NOT NULL DEFAULT TRUE,
  security_alerts BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE client_notification_preferences ADD COLUMN IF NOT EXISTS client_messages BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE client_notification_preferences ADD COLUMN IF NOT EXISTS payment_alerts BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE client_notification_preferences ADD COLUMN IF NOT EXISTS review_requests BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE client_notification_preferences ADD COLUMN IF NOT EXISTS marketing_texts BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE client_notification_preferences ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE client_notification_preferences ADD COLUMN IF NOT EXISTS quiet_hours_from TEXT NOT NULL DEFAULT '09:00';
ALTER TABLE client_notification_preferences ADD COLUMN IF NOT EXISTS quiet_hours_to TEXT NOT NULL DEFAULT '22:00';

-- ============================================================================
-- payment methods & records
-- ============================================================================
CREATE TABLE IF NOT EXISTS client_payment_methods (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'stripe',
  brand TEXT NOT NULL,
  last4 TEXT NOT NULL,
  exp_month INTEGER NOT NULL,
  exp_year INTEGER NOT NULL,
  holder_name TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS client_payment_methods_user_idx ON client_payment_methods (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS client_payment_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
  payment_method_id TEXT REFERENCES client_payment_methods(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'succeeded',
  type TEXT NOT NULL DEFAULT 'deposit',
  provider TEXT NOT NULL DEFAULT 'stripe',
  payment_intent_id TEXT,
  receipt_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE client_payment_records ALTER COLUMN currency SET DEFAULT 'USD';

CREATE INDEX IF NOT EXISTS client_payment_records_user_idx ON client_payment_records (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS client_payment_records_booking_idx ON client_payment_records (booking_id) WHERE booking_id IS NOT NULL;

-- ============================================================================
-- booking conversations & messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS booking_conversations (
  id TEXT PRIMARY KEY,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE UNIQUE,
  vendor_slug TEXT NOT NULL REFERENCES vendor_profiles(slug) ON DELETE CASCADE,
  client_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  vendor_unread_count INTEGER NOT NULL DEFAULT 0,
  client_unread_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS booking_conversations_vendor_slug_idx ON booking_conversations (vendor_slug, COALESCE(last_message_at, created_at) DESC);
CREATE INDEX IF NOT EXISTS booking_conversations_client_id_idx ON booking_conversations (client_id, COALESCE(last_message_at, created_at) DESC) WHERE client_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS booking_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES booking_conversations(id) ON DELETE CASCADE,
  booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id TEXT,
  sender_role TEXT NOT NULL,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS booking_messages_conversation_idx ON booking_messages (conversation_id, created_at ASC);

-- ============================================================================
-- delete requests
-- ============================================================================
CREATE TABLE IF NOT EXISTS client_delete_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS client_delete_requests_user_idx ON client_delete_requests (user_id, requested_at DESC);
