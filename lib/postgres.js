import { Pool } from "pg";
import { getDemoStore } from "@/lib/demo-store";

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
const bookingSlotLookupIndexStatement =
  `CREATE INDEX IF NOT EXISTS bookings_vendor_slot_active_lookup_idx ON bookings (vendor_slug, appointment_date, appointment_slot) WHERE status <> 'cancelled' AND status <> 'declined'`;
const bookingSlotUniqueIndexStatement =
  `CREATE UNIQUE INDEX IF NOT EXISTS bookings_vendor_slot_active_idx ON bookings (vendor_slug, appointment_date, appointment_slot) WHERE status <> 'cancelled' AND status <> 'declined'`;

export const hasPostgresDatabase = Boolean(DATABASE_URL);

if (!globalThis.hairforcePostgresCache) {
  globalThis.hairforcePostgresCache = {
    pool: null,
    initPromise: null
  };
}

function shouldUseSsl(connectionString) {
  return !/localhost|127\.0\.0\.1/i.test(connectionString);
}

function stringifyJson(value, fallback) {
  return JSON.stringify(value ?? fallback);
}

function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function getPool() {
  if (!hasPostgresDatabase) {
    return null;
  }

  if (!globalThis.hairforcePostgresCache.pool) {
    globalThis.hairforcePostgresCache.pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: shouldUseSsl(DATABASE_URL) ? { rejectUnauthorized: false } : false,
      max: 10
    });
  }

  return globalThis.hairforcePostgresCache.pool;
}

function isSchemaMismatchError(error) {
  return error?.code === "42P01" || error?.code === "42703";
}

const schemaStatements = [
  `
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
    )
  `,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_normalized TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_signin_at TIMESTAMPTZ`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS signin_count INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'US'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_country_code TEXT NOT NULL DEFAULT '+1'`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS reduced_motion BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS high_contrast BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS larger_text BOOLEAN NOT NULL DEFAULT FALSE`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users ((LOWER(email)))`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_phone_normalized_idx ON users (phone_normalized) WHERE phone_normalized IS NOT NULL`,
  `CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_idx ON users (google_id) WHERE google_id IS NOT NULL`,
  `
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
    )
  `,
  `CREATE INDEX IF NOT EXISTS auth_sessions_user_idx ON auth_sessions (user_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS auth_sessions_active_idx ON auth_sessions (user_id, last_seen_at DESC) WHERE revoked_at IS NULL`,
  `
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
    )
  `,
  `CREATE INDEX IF NOT EXISTS phone_otp_sessions_phone_idx ON phone_otp_sessions (phone_normalized, created_at DESC)`,
  `
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
    )
  `,
  `CREATE INDEX IF NOT EXISTS password_reset_sessions_email_idx ON password_reset_sessions (email_normalized, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS password_reset_sessions_token_idx ON password_reset_sessions (reset_token_hash) WHERE reset_token_hash IS NOT NULL`,
  `
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
      blackout_dates JSONB NOT NULL DEFAULT '[]'::jsonb,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS avatar TEXT`,
  `ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS portfolio_images JSONB NOT NULL DEFAULT '[]'::jsonb`,
  `ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS service_location_type TEXT NOT NULL DEFAULT 'studio'`,
  `ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS policies JSONB NOT NULL DEFAULT '{}'::jsonb`,
  `ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS social_links JSONB NOT NULL DEFAULT '{}'::jsonb`,
  `ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS state TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS area TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION`,
  `ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION`,
  `ALTER TABLE vendor_profiles ADD COLUMN IF NOT EXISTS location_precision TEXT NOT NULL DEFAULT 'approx_area'`,
  `CREATE INDEX IF NOT EXISTS vendor_profiles_status_idx ON vendor_profiles (status)`,
  `CREATE INDEX IF NOT EXISTS vendor_profiles_state_idx ON vendor_profiles (state)`,
  `
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
    )
  `,
  `ALTER TABLE services ADD COLUMN IF NOT EXISTS booking_method TEXT NOT NULL DEFAULT 'instant'`,
  `ALTER TABLE services ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`,
  `CREATE INDEX IF NOT EXISTS services_vendor_slug_idx ON services (vendor_slug)`,
  `
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
    )
  `,
  `CREATE INDEX IF NOT EXISTS bookings_vendor_slug_idx ON bookings (vendor_slug)`,
  `CREATE INDEX IF NOT EXISTS bookings_customer_email_lower_idx ON bookings ((LOWER(customer_email)))`,
  `CREATE INDEX IF NOT EXISTS bookings_customer_id_idx ON bookings (customer_id) WHERE customer_id IS NOT NULL`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMPTZ`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS previous_appointment_date DATE`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS previous_appointment_slot TEXT`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_method TEXT NOT NULL DEFAULT 'instant'`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ`,
  bookingSlotLookupIndexStatement,
  `
    CREATE TABLE IF NOT EXISTS client_favorites (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vendor_slug TEXT NOT NULL REFERENCES vendor_profiles(slug) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, vendor_slug)
    )
  `,
  `CREATE INDEX IF NOT EXISTS client_favorites_vendor_slug_idx ON client_favorites (vendor_slug)`,
  `
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
    )
  `,
  `CREATE INDEX IF NOT EXISTS client_notifications_user_idx ON client_notifications (user_id, created_at DESC)`,
  `
    CREATE TABLE IF NOT EXISTS client_notification_preferences (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      booking_updates BOOLEAN NOT NULL DEFAULT TRUE,
      reminders BOOLEAN NOT NULL DEFAULT TRUE,
      recommendations BOOLEAN NOT NULL DEFAULT TRUE,
      security_alerts BOOLEAN NOT NULL DEFAULT TRUE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
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
    )
  `,
  `CREATE INDEX IF NOT EXISTS client_payment_methods_user_idx ON client_payment_methods (user_id, created_at DESC)`,
  `
    CREATE TABLE IF NOT EXISTS client_payment_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      booking_id TEXT REFERENCES bookings(id) ON DELETE SET NULL,
      payment_method_id TEXT REFERENCES client_payment_methods(id) ON DELETE SET NULL,
      amount INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'PKR',
      status TEXT NOT NULL DEFAULT 'succeeded',
      type TEXT NOT NULL DEFAULT 'deposit',
      provider TEXT NOT NULL DEFAULT 'stripe',
      payment_intent_id TEXT,
      receipt_url TEXT,
      description TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `ALTER TABLE client_payment_records ALTER COLUMN currency SET DEFAULT 'USD'`,
  `CREATE INDEX IF NOT EXISTS client_payment_records_user_idx ON client_payment_records (user_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS client_payment_records_booking_idx ON client_payment_records (booking_id) WHERE booking_id IS NOT NULL`,
  `
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
    )
  `,
  `CREATE INDEX IF NOT EXISTS booking_conversations_vendor_slug_idx ON booking_conversations (vendor_slug, COALESCE(last_message_at, created_at) DESC)`,
  `CREATE INDEX IF NOT EXISTS booking_conversations_client_id_idx ON booking_conversations (client_id, COALESCE(last_message_at, created_at) DESC) WHERE client_id IS NOT NULL`,
  `
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
    )
  `,
  `CREATE INDEX IF NOT EXISTS booking_messages_conversation_idx ON booking_messages (conversation_id, created_at ASC)`,
  `
    CREATE TABLE IF NOT EXISTS client_delete_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      reason TEXT,
      requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `CREATE INDEX IF NOT EXISTS client_delete_requests_user_idx ON client_delete_requests (user_id, requested_at DESC)`
];

async function seedUsers(client, users) {
  for (const user of users) {
    await client.query(
      `
        INSERT INTO users (
          id, name, email, phone, phone_normalized, city, vendor_slug, role, password_hash, avatar,
          timezone, country, phone_country_code, reduced_motion, high_contrast, larger_text
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) DO NOTHING
      `,
      [
        user.id,
        user.name,
        user.email,
        user.phone || "",
        normalizePhone(user.phone) || null,
        user.city || "",
        user.vendorSlug || null,
        user.role || "client",
        user.passwordHash,
        user.avatar || "",
        user.timezone || "America/Los_Angeles",
        user.country || "US",
        user.phoneCountryCode || "+1",
        Boolean(user.reducedMotion),
        Boolean(user.highContrast),
        Boolean(user.largerText)
      ]
    );
  }
}

async function seedVendors(client, vendors) {
  for (const vendor of vendors) {
    await client.query(
      `
        INSERT INTO vendor_profiles (
          id, slug, name, owner, category, state, city, area, location, latitude, longitude,
          location_precision, rating, review_count, price_from,
          response_time, verified, hero_tag, tagline, bio, cover_image, avatar, gallery_images,
          portfolio_images, specialties, amenities, cover_gradient, metrics, gallery, reviews,
          booking_windows, availability_rules, blackout_dates, service_location_type, policies,
          social_links, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
          $23::jsonb, $24::jsonb, $25::jsonb, $26::jsonb, $27, $28::jsonb, $29::jsonb, $30::jsonb,
          $31::jsonb, $32::jsonb, $33::jsonb, $34, $35::jsonb, $36::jsonb, $37
        )
        ON CONFLICT (id) DO NOTHING
      `,
      [
        vendor.id,
        vendor.slug,
        vendor.name,
        vendor.owner,
        vendor.category,
        vendor.state || "",
        vendor.city,
        vendor.area || "",
        vendor.location,
        vendor.latitude ?? null,
        vendor.longitude ?? null,
        vendor.locationPrecision || "approx_area",
        Number(vendor.rating || 0),
        Number(vendor.reviewCount || 0),
        Number(vendor.priceFrom || 0),
        vendor.responseTime || "",
        Boolean(vendor.verified),
        vendor.heroTag || "",
        vendor.tagline || "",
        vendor.bio || "",
        vendor.coverImage || "",
        vendor.avatar || "",
        stringifyJson(vendor.galleryImages, []),
        stringifyJson(vendor.portfolioImages, vendor.galleryImages || []),
        stringifyJson(vendor.specialties, []),
        stringifyJson(vendor.amenities, []),
        vendor.coverGradient || "",
        stringifyJson(vendor.metrics, {}),
        stringifyJson(vendor.gallery, []),
        stringifyJson(vendor.reviews, []),
        stringifyJson(vendor.bookingWindows, []),
        stringifyJson(vendor.availabilityRules, []),
        stringifyJson(vendor.blackoutDates, []),
        vendor.serviceLocationType || "studio",
        stringifyJson(vendor.policies, {}),
        stringifyJson(vendor.socialLinks, {}),
        vendor.status || "active"
      ]
    );

    await client.query(
      `
        UPDATE vendor_profiles
        SET state = CASE WHEN COALESCE(state, '') = '' THEN $2 ELSE state END,
            city = CASE WHEN COALESCE(state, '') = '' THEN $3 ELSE city END,
            area = CASE WHEN COALESCE(area, '') = '' THEN $4 ELSE area END,
            latitude = COALESCE(latitude, $5),
            longitude = COALESCE(longitude, $6),
            location_precision = CASE
              WHEN COALESCE(location_precision, '') = '' THEN $7
              ELSE location_precision
            END,
            location = CASE
              WHEN COALESCE(location, '') = '' THEN $8
              ELSE location
            END
        WHERE slug = $1
          AND (
            COALESCE(state, '') = ''
            OR COALESCE(area, '') = ''
            OR latitude IS NULL
            OR longitude IS NULL
            OR COALESCE(location_precision, '') = ''
          )
      `,
      [
        vendor.slug,
        vendor.state || "",
        vendor.city || "",
        vendor.area || "",
        vendor.latitude ?? null,
        vendor.longitude ?? null,
        vendor.locationPrecision || "approx_area",
        vendor.location || ""
      ]
    );

    await client.query(
      `
        UPDATE vendor_profiles
        SET price_from = $2,
            updated_at = CASE
              WHEN price_from IS DISTINCT FROM $2 THEN NOW()
              ELSE updated_at
            END
        WHERE id = $1
      `,
      [vendor.id, Number(vendor.priceFrom || 0)]
    );
  }
}

async function seedServices(client, services) {
  for (const service of services) {
    await client.query(
      `
        INSERT INTO services (
          id, vendor_slug, vendor_name, title, category, duration, price,
          deposit_type, deposit_value, image_url, description, featured, booking_method, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO NOTHING
      `,
      [
        service.id,
        service.vendorSlug,
        service.vendorName,
        service.title,
        service.category || "",
        service.duration,
        Number(service.price || 0),
        service.depositType || "percentage",
        Number(service.depositValue || 0),
        service.imageUrl || "",
        service.description || "",
        Boolean(service.featured),
        service.bookingMethod || "instant",
        service.isActive !== false
      ]
    );

    await client.query(
      `
        UPDATE services
        SET price = $2,
            updated_at = CASE
              WHEN price IS DISTINCT FROM $2 THEN NOW()
              ELSE updated_at
            END
        WHERE id = $1
      `,
      [service.id, Number(service.price || 0)]
    );
  }
}

async function seedBookings(client, bookings) {
  for (const booking of bookings) {
    await client.query(
      `
        INSERT INTO bookings (
          id, vendor_slug, vendor_name, customer_id, customer_name, customer_email,
          customer_phone, service_id, service_name, appointment_date, appointment_slot,
          total, deposit_amount, remaining_amount, payment_status, payment_intent_id,
          notes, status, source, created_at, updated_at, cancelled_at, cancellation_reason,
          rescheduled_at, previous_appointment_date, previous_appointment_slot, booking_method,
          requested_at, approved_at, declined_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23,
          $24, $25, $26, $27,
          $28, $29, $30
        )
        ON CONFLICT (id) DO NOTHING
      `,
      [
        booking.id,
        booking.vendorSlug,
        booking.vendorName,
        booking.customerId || null,
        booking.customerName,
        booking.customerEmail,
        booking.customerPhone || "",
        booking.serviceId,
        booking.serviceName,
        booking.appointmentDate,
        booking.appointmentSlot,
        Number(booking.total || 0),
        Number(booking.depositAmount || 0),
        Number(booking.remainingAmount || 0),
        booking.paymentStatus || "pay_later",
        booking.paymentIntentId || "",
        booking.notes || "",
        booking.status || "confirmed",
        booking.source || "web",
        booking.createdAt || new Date().toISOString(),
        booking.updatedAt || booking.createdAt || new Date().toISOString(),
        booking.cancelledAt || null,
        booking.cancellationReason || null,
        booking.rescheduledAt || null,
        booking.previousAppointmentDate || null,
        booking.previousAppointmentSlot || null,
        booking.bookingMethod || "instant",
        booking.requestedAt || booking.createdAt || new Date().toISOString(),
        booking.approvedAt || null,
        booking.declinedAt || null
      ]
    );

    await client.query(
      `
        UPDATE bookings
        SET total = $2,
            deposit_amount = $3,
            remaining_amount = $4,
            booking_method = $5,
            updated_at = CASE
              WHEN total IS DISTINCT FROM $2
                OR deposit_amount IS DISTINCT FROM $3
                OR remaining_amount IS DISTINCT FROM $4
                OR booking_method IS DISTINCT FROM $5
              THEN NOW()
              ELSE updated_at
            END
        WHERE id = $1
      `,
      [
        booking.id,
        Number(booking.total || 0),
        Number(booking.depositAmount || 0),
        Number(booking.remainingAmount || 0),
        booking.bookingMethod || "instant"
      ]
    );
  }
}

async function seedConversations(client, conversations) {
  for (const conversation of conversations || []) {
    await client.query(
      `
        INSERT INTO booking_conversations (
          id, booking_id, vendor_slug, client_id, vendor_unread_count, client_unread_count,
          last_message_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `,
      [
        conversation.id,
        conversation.bookingId,
        conversation.vendorSlug,
        conversation.clientId || null,
        Number(conversation.vendorUnreadCount || 0),
        Number(conversation.clientUnreadCount || 0),
        conversation.lastMessageAt || null,
        conversation.createdAt || new Date().toISOString(),
        conversation.updatedAt || conversation.lastMessageAt || conversation.createdAt || new Date().toISOString()
      ]
    );
  }
}

async function seedMessages(client, messages) {
  for (const message of messages || []) {
    await client.query(
      `
        INSERT INTO booking_messages (
          id, conversation_id, booking_id, sender_id, sender_role, body, read_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `,
      [
        message.id,
        message.conversationId,
        message.bookingId,
        message.senderId || null,
        message.senderRole || "vendor",
        message.body || "",
        message.readAt || null,
        message.createdAt || new Date().toISOString(),
        message.updatedAt || message.createdAt || new Date().toISOString()
      ]
    );
  }
}

async function seedFavorites(client, favorites) {
  for (const favorite of favorites || []) {
    await client.query(
      `
        INSERT INTO client_favorites (user_id, vendor_slug, created_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, vendor_slug) DO NOTHING
      `,
      [
        favorite.userId,
        favorite.vendorSlug,
        favorite.createdAt || new Date().toISOString()
      ]
    );
  }
}

async function seedNotifications(client, notifications) {
  for (const notification of notifications || []) {
    await client.query(
      `
        INSERT INTO client_notifications (
          id, user_id, type, title, message, cta_label, cta_href, metadata,
          read_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8::jsonb,
          $9, $10, $11
        )
        ON CONFLICT (id) DO NOTHING
      `,
      [
        notification.id,
        notification.userId,
        notification.type || "info",
        notification.title,
        notification.message,
        notification.ctaLabel || "",
        notification.ctaHref || "",
        stringifyJson(notification.metadata, {}),
        notification.readAt || null,
        notification.createdAt || new Date().toISOString(),
        notification.updatedAt || notification.createdAt || new Date().toISOString()
      ]
    );
  }
}

async function seedNotificationPreferences(client, preferences) {
  for (const item of preferences || []) {
    await client.query(
      `
        INSERT INTO client_notification_preferences (
          user_id, booking_updates, reminders, recommendations, security_alerts, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id) DO NOTHING
      `,
      [
        item.userId,
        item.bookingUpdates !== false,
        item.reminders !== false,
        item.recommendations !== false,
        item.securityAlerts !== false,
        item.updatedAt || new Date().toISOString()
      ]
    );
  }
}

async function seedPaymentMethods(client, paymentMethods) {
  for (const method of paymentMethods || []) {
    await client.query(
      `
        INSERT INTO client_payment_methods (
          id, user_id, provider, brand, last4, exp_month, exp_year, holder_name,
          is_default, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11
        )
        ON CONFLICT (id) DO NOTHING
      `,
      [
        method.id,
        method.userId,
        method.provider || "stripe",
        method.brand,
        method.last4,
        Number(method.expMonth || 0),
        Number(method.expYear || 0),
        method.holderName || "",
        Boolean(method.isDefault),
        method.createdAt || new Date().toISOString(),
        method.updatedAt || method.createdAt || new Date().toISOString()
      ]
    );
  }
}

async function seedPaymentRecords(client, paymentRecords) {
  for (const record of paymentRecords || []) {
    await client.query(
      `
        INSERT INTO client_payment_records (
          id, user_id, booking_id, payment_method_id, amount, currency, status, type,
          provider, payment_intent_id, receipt_url, description, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14
        )
        ON CONFLICT (id) DO NOTHING
      `,
      [
        record.id,
        record.userId,
        record.bookingId || null,
        record.paymentMethodId || null,
        Number(record.amount || 0),
        record.currency || "USD",
        record.status || "succeeded",
        record.type || "deposit",
        record.provider || "stripe",
        record.paymentIntentId || "",
        record.receiptUrl || "",
        record.description || "",
        record.createdAt || new Date().toISOString(),
        record.updatedAt || record.createdAt || new Date().toISOString()
      ]
    );

    await client.query(
      `
        UPDATE client_payment_records
        SET amount = $2,
            currency = $3,
            updated_at = CASE
              WHEN amount IS DISTINCT FROM $2
                OR currency IS DISTINCT FROM $3
              THEN NOW()
              ELSE updated_at
            END
        WHERE id = $1
      `,
      [record.id, Number(record.amount || 0), record.currency || "USD"]
    );
  }
}

async function seedDeleteRequests(client, deleteRequests) {
  for (const request of deleteRequests || []) {
    await client.query(
      `
        INSERT INTO client_delete_requests (
          id, user_id, status, reason, requested_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING
      `,
      [
        request.id,
        request.userId,
        request.status || "pending",
        request.reason || "",
        request.requestedAt || new Date().toISOString(),
        request.updatedAt || request.requestedAt || new Date().toISOString()
      ]
    );
  }
}

async function seedDemoData(client) {
  const store = getDemoStore();
  await seedUsers(client, store.users);
  await seedVendors(client, store.vendors);
  await seedServices(client, store.services);
  await seedBookings(client, store.bookings);
  await seedFavorites(client, store.favorites);
  await seedNotifications(client, store.notifications);
  await seedNotificationPreferences(client, store.notificationPreferences);
  await seedPaymentMethods(client, store.paymentMethods);
  await seedPaymentRecords(client, store.paymentRecords);
  await seedConversations(client, store.conversations);
  await seedMessages(client, store.messages);
  await seedDeleteRequests(client, store.deleteRequests);
}

async function ensureActiveBookingSlotIndex(client) {
  try {
    await client.query(bookingSlotUniqueIndexStatement);
  } catch (error) {
    if (error?.code !== "23505") {
      throw error;
    }

    console.warn(
      "Skipping strict bookings slot index because legacy duplicate active slots already exist. " +
        "App-level availability checks remain enabled."
    );
  }
}

async function initializePostgres() {
  const pool = getPool();

  if (!pool) {
    return null;
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const statement of schemaStatements) {
      await client.query(statement);
    }

    await seedDemoData(client);
    await client.query("COMMIT");
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Ignore rollback failures after the transaction has already been committed.
    }
    throw error;
  }

  try {
    await ensureActiveBookingSlotIndex(client);
  } finally {
    client.release();
  }

  return pool;
}

export async function ensurePostgresReady() {
  if (!hasPostgresDatabase) {
    return null;
  }

  if (!globalThis.hairforcePostgresCache.initPromise) {
    globalThis.hairforcePostgresCache.initPromise = initializePostgres().catch((error) => {
      globalThis.hairforcePostgresCache.initPromise = null;
      throw error;
    });
  }

  await globalThis.hairforcePostgresCache.initPromise;
  return getPool();
}

export async function queryPostgres(text, params = []) {
  const pool = await ensurePostgresReady();

  if (!pool) {
    throw new Error("PostgreSQL is not configured.");
  }

  try {
    return await pool.query(text, params);
  } catch (error) {
    if (!isSchemaMismatchError(error)) {
      throw error;
    }

    globalThis.hairforcePostgresCache.initPromise = null;
    await ensurePostgresReady();
    return getPool().query(text, params);
  }
}

export async function withPostgresTransaction(callback) {
  const pool = await ensurePostgresReady();

  if (!pool) {
    throw new Error("PostgreSQL is not configured.");
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
