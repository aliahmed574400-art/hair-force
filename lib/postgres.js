import { Pool } from "pg";
import { getDemoStore } from "@/lib/demo-store";

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

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
  `CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users ((LOWER(email)))`,
  `
    CREATE TABLE IF NOT EXISTS vendor_profiles (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      owner TEXT NOT NULL,
      category TEXT NOT NULL,
      city TEXT NOT NULL,
      location TEXT NOT NULL,
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
  `CREATE INDEX IF NOT EXISTS vendor_profiles_status_idx ON vendor_profiles (status)`,
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
  `CREATE INDEX IF NOT EXISTS bookings_customer_email_lower_idx ON bookings ((LOWER(customer_email)))`
];

async function seedUsers(client, users) {
  for (const user of users) {
    await client.query(
      `
        INSERT INTO users (
          id, name, email, phone, city, vendor_slug, role, password_hash, avatar
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO NOTHING
      `,
      [
        user.id,
        user.name,
        user.email,
        user.phone || "",
        user.city || "",
        user.vendorSlug || null,
        user.role || "client",
        user.passwordHash,
        user.avatar || ""
      ]
    );
  }
}

async function seedVendors(client, vendors) {
  for (const vendor of vendors) {
    await client.query(
      `
        INSERT INTO vendor_profiles (
          id, slug, name, owner, category, city, location, rating, review_count, price_from,
          response_time, verified, hero_tag, tagline, bio, cover_image, gallery_images,
          specialties, amenities, cover_gradient, metrics, gallery, reviews, booking_windows,
          availability_rules, blackout_dates, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17::jsonb,
          $18::jsonb, $19::jsonb, $20, $21::jsonb, $22::jsonb, $23::jsonb, $24::jsonb,
          $25::jsonb, $26::jsonb, $27
        )
        ON CONFLICT (id) DO NOTHING
      `,
      [
        vendor.id,
        vendor.slug,
        vendor.name,
        vendor.owner,
        vendor.category,
        vendor.city,
        vendor.location,
        Number(vendor.rating || 0),
        Number(vendor.reviewCount || 0),
        Number(vendor.priceFrom || 0),
        vendor.responseTime || "",
        Boolean(vendor.verified),
        vendor.heroTag || "",
        vendor.tagline || "",
        vendor.bio || "",
        vendor.coverImage || "",
        stringifyJson(vendor.galleryImages, []),
        stringifyJson(vendor.specialties, []),
        stringifyJson(vendor.amenities, []),
        vendor.coverGradient || "",
        stringifyJson(vendor.metrics, {}),
        stringifyJson(vendor.gallery, []),
        stringifyJson(vendor.reviews, []),
        stringifyJson(vendor.bookingWindows, []),
        stringifyJson(vendor.availabilityRules, []),
        stringifyJson(vendor.blackoutDates, []),
        vendor.status || "active"
      ]
    );
  }
}

async function seedServices(client, services) {
  for (const service of services) {
    await client.query(
      `
        INSERT INTO services (
          id, vendor_slug, vendor_name, title, category, duration, price,
          deposit_type, deposit_value, image_url, description, featured
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
        Boolean(service.featured)
      ]
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
          notes, status, source, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21
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
        booking.updatedAt || booking.createdAt || new Date().toISOString()
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
    await client.query("ROLLBACK");
    throw error;
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

  return pool.query(text, params);
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
