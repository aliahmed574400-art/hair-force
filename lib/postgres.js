import { Pool } from "pg";
import { getDemoStore } from "@/lib/demo-store";
import { runMigrations } from "@/lib/migrations";
import { normalizePhone } from "@/lib/utils";

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
// The strict unique slot index runs separately because legacy duplicates may
// exist in older deployments — see ensureActiveBookingSlotIndex below.
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

// Schema is defined in db/migrations/*.sql and applied by lib/migrations.js
// (called from initializePostgres below). The runMigrations() helper records
// applied files in schema_migrations so startup cost is O(1) once everything's
// been applied. The legacy inline schemaStatements array was deleted in this
// refactor — to add a new column or table, write a new numbered .sql file.

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
          booking_windows, availability_rules, availability_overrides, blackout_dates,
          service_location_type, policies, social_links, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,
          $23::jsonb, $24::jsonb, $25::jsonb, $26::jsonb, $27, $28::jsonb, $29::jsonb, $30::jsonb,
          $31::jsonb, $32::jsonb, $33::jsonb, $34::jsonb, $35, $36::jsonb, $37::jsonb, $38
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
        stringifyJson(vendor.availabilityOverrides, []),
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
          deposit_type, deposit_value, image_url, description, featured, booking_method, is_active,
          service_type, parent_category_id, included_service_ids, sort_order, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb, $18, $19::jsonb)
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
        service.isActive !== false,
        service.serviceType || "service",
        service.parentCategoryId || "",
        stringifyJson(service.includedServiceIds, []),
        Number(service.sortOrder || 0),
        stringifyJson(service.metadata, {})
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

async function seedVendorNotifications(client, notifications) {
  for (const notification of notifications || []) {
    await client.query(
      `
        INSERT INTO vendor_notifications (
          id, vendor_slug, type, title, message, booking_id, conversation_id,
          client_name, client_avatar, service_name, appointment_date, appointment_slot,
          metadata, read_at, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12,
          $13::jsonb, $14, $15, $16
        )
        ON CONFLICT (id) DO NOTHING
      `,
      [
        notification.id,
        notification.vendorSlug,
        notification.type || "info",
        notification.title,
        notification.message,
        notification.bookingId || "",
        notification.conversationId || "",
        notification.clientName || "",
        notification.clientAvatar || "",
        notification.serviceName || "",
        notification.appointmentDate || null,
        notification.appointmentSlot || "",
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
  await seedVendorNotifications(client, store.vendorNotifications);
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
    // Schema migrations run first, each in its own transaction so a failure
    // in one doesn't leave us with a half-applied later one.
    await runMigrations(client);

    // Demo data seeding runs in its own transaction. It's safe to re-run
    // because every INSERT uses ON CONFLICT DO NOTHING.
    await client.query("BEGIN");
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

async function runPostgresTransaction(callback, allowSchemaRetry = true) {
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

    if (allowSchemaRetry && isSchemaMismatchError(error)) {
      globalThis.hairforcePostgresCache.initPromise = null;
      await ensurePostgresReady();
      return runPostgresTransaction(callback, false);
    }

    throw error;
  } finally {
    client.release();
  }
}

export async function withPostgresTransaction(callback) {
  return runPostgresTransaction(callback);
}
