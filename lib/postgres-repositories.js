import { compare, hash } from "bcryptjs";
import {
  buildBookingWindowsFromRules,
  createDefaultAvailabilityRules,
  deriveRulesFromBookingWindows
} from "@/lib/availability";
import { getDemoStore } from "@/lib/demo-store";
import {
  hasPostgresDatabase,
  queryPostgres,
  withPostgresTransaction
} from "@/lib/postgres";
import { calculateDeposit, createSlug, filterStylists, toList } from "@/lib/utils";

const hasDatabase = hasPostgresDatabase;

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const clean = { ...user };
  delete clean.passwordHash;
  return clean;
}

function parseJsonField(value, fallback) {
  if (value === null || value === undefined) {
    return fallback;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  return value;
}

function toIsoString(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}

function mapUserRow(row, options = {}) {
  if (!row) {
    return null;
  }

  const user = {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || "",
    city: row.city || "",
    vendorSlug: row.vendor_slug || null,
    role: row.role || "client",
    avatar: row.avatar || "",
    passwordHash: row.password_hash,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };

  return options.includePasswordHash ? user : sanitizeUser(user);
}

function hydrateVendorWindows(vendor) {
  const hasSavedRules = Array.isArray(vendor.availabilityRules);
  const hasSavedWindows = Array.isArray(vendor.bookingWindows);
  const rules =
    hasSavedRules
      ? vendor.availabilityRules
      : hasSavedWindows && vendor.bookingWindows.length
        ? deriveRulesFromBookingWindows(vendor.bookingWindows)
        : createDefaultAvailabilityRules();

  const blackoutDates = Array.isArray(vendor.blackoutDates) ? vendor.blackoutDates : [];

  return {
    ...vendor,
    availabilityRules: rules,
    blackoutDates,
    bookingWindows:
      hasSavedWindows && !vendor.forceRegenerateWindows
        ? vendor.bookingWindows
        : buildBookingWindowsFromRules(rules, blackoutDates)
  };
}

function mapVendorRow(row) {
  if (!row) {
    return null;
  }

  return hydrateVendorWindows({
    id: row.id,
    slug: row.slug,
    name: row.name,
    owner: row.owner,
    category: row.category,
    city: row.city,
    location: row.location,
    rating: Number(row.rating || 0),
    reviewCount: Number(row.review_count || 0),
    priceFrom: Number(row.price_from || 0),
    responseTime: row.response_time || "",
    verified: Boolean(row.verified),
    heroTag: row.hero_tag || "",
    tagline: row.tagline || "",
    bio: row.bio || "",
    coverImage: row.cover_image || "",
    galleryImages: parseJsonField(row.gallery_images, []),
    specialties: parseJsonField(row.specialties, []),
    amenities: parseJsonField(row.amenities, []),
    coverGradient: row.cover_gradient || "",
    metrics: parseJsonField(row.metrics, {}),
    gallery: parseJsonField(row.gallery, []),
    reviews: parseJsonField(row.reviews, []),
    bookingWindows: parseJsonField(row.booking_windows, []),
    availabilityRules: parseJsonField(row.availability_rules, []),
    blackoutDates: parseJsonField(row.blackout_dates, []),
    status: row.status || "pending",
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  });
}

function mapServiceRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    vendorSlug: row.vendor_slug,
    vendorName: row.vendor_name,
    title: row.title,
    category: row.category || "",
    duration: row.duration,
    price: Number(row.price || 0),
    depositType: row.deposit_type || "percentage",
    depositValue: Number(row.deposit_value || 0),
    imageUrl: row.image_url || "",
    description: row.description || "",
    featured: Boolean(row.featured),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

function mapBookingRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    vendorSlug: row.vendor_slug,
    vendorName: row.vendor_name,
    customerId: row.customer_id || null,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    customerPhone: row.customer_phone || "",
    serviceId: row.service_id,
    serviceName: row.service_name,
    appointmentDate: row.appointment_date,
    appointmentSlot: row.appointment_slot,
    total: Number(row.total || 0),
    depositAmount: Number(row.deposit_amount || 0),
    remainingAmount: Number(row.remaining_amount || 0),
    paymentStatus: row.payment_status || "pay_later",
    paymentIntentId: row.payment_intent_id || "",
    notes: row.notes || "",
    status: row.status || "confirmed",
    source: row.source || "web",
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

function makeVendorSlug(name, existingSlugs) {
  const base = createSlug(name || "hair-force-partner");
  let slug = base;
  let index = 2;

  while (existingSlugs.includes(slug)) {
    slug = `${base}-${index}`;
    index += 1;
  }

  return slug;
}

function normalizeServicePayload(payload) {
  return {
    title: String(payload.title || "").trim(),
    duration: String(payload.duration || "").trim(),
    price: Number(payload.price || 0),
    description: String(payload.description || "").trim(),
    depositType: payload.depositType === "fixed" ? "fixed" : "percentage",
    depositValue: Number(payload.depositValue || 0),
    imageUrl: String(payload.imageUrl || "").trim()
  };
}

function normalizeVendorPayload(existingVendor, payload) {
  return {
    ...existingVendor,
    name: String(payload.name || existingVendor.name || "").trim(),
    owner: String(payload.owner || existingVendor.owner || "").trim(),
    category: String(payload.category || existingVendor.category || "").trim(),
    city: String(payload.city || existingVendor.city || "").trim(),
    location: String(payload.location || existingVendor.location || "").trim(),
    heroTag: String(payload.heroTag || existingVendor.heroTag || "").trim(),
    tagline: String(payload.tagline || existingVendor.tagline || "").trim(),
    bio: String(payload.bio || existingVendor.bio || "").trim(),
    coverImage: String(payload.coverImage || existingVendor.coverImage || "").trim(),
    specialties: toList(payload.specialties || existingVendor.specialties),
    amenities: toList(payload.amenities || existingVendor.amenities)
  };
}

function recalculateVendorPrice(vendorSlug, services, vendors) {
  const vendorServices = services.filter((service) => service.vendorSlug === vendorSlug);
  const priceFrom = vendorServices.length
    ? Math.min(...vendorServices.map((service) => Number(service.price || 0)).filter(Boolean))
    : 0;

  const vendor = vendors.find((item) => item.slug === vendorSlug);
  if (vendor) {
    vendor.priceFrom = priceFrom;
  }
}

function buildVendorSummary(vendor, services, bookings) {
  const now = new Date().toISOString().slice(0, 10);
  const revenue = bookings.reduce((sum, booking) => sum + Number(booking.total || 0), 0);
  const bookingsToday = bookings.filter((booking) => booking.appointmentDate === now).length;
  const repeatClientCount = new Set(
    bookings
      .map((booking) => booking.customerEmail)
      .filter(Boolean)
      .filter((email, index, arr) => arr.indexOf(email) !== index)
  ).size;
  const profileFields = [
    vendor.name,
    vendor.category,
    vendor.city,
    vendor.location,
    vendor.tagline,
    vendor.bio,
    vendor.heroTag,
    ...(vendor.specialties || []),
    ...(vendor.amenities || []),
    vendor.coverImage
  ];
  const completedFields = profileFields.filter(Boolean).length;
  const profileStrength = Math.min(100, Math.round((completedFields / 11) * 100));

  return {
    revenue,
    bookingsToday,
    servicesCount: services.length,
    repeatClientCount,
    profileStrength
  };
}

function assertVendorUser(user) {
  if (!user || user.role !== "vendor" || !user.vendorSlug) {
    throw new Error("Vendor access required.");
  }
}

function normalizeAvailabilityPayload(payload) {
  return (Array.isArray(payload) ? payload : [])
    .map((item) => ({
      date: String(item.date || "").trim(),
      label: String(item.label || "").trim(),
      slots: Array.isArray(item.slots)
        ? item.slots.map((slot) => String(slot).trim()).filter(Boolean)
        : toList(item.slots)
    }))
    .filter((item) => item.date && item.label && item.slots.length);
}

function normalizeAvailabilityRules(payload) {
  return (Array.isArray(payload) ? payload : [])
    .map((rule) => ({
      dayOfWeek: Number(rule.dayOfWeek),
      startTime: String(rule.startTime || "").trim(),
      endTime: String(rule.endTime || "").trim(),
      slotMinutes: Number(rule.slotMinutes || 0),
      active: Boolean(rule.active)
    }))
    .filter(
      (rule) =>
        Number.isInteger(rule.dayOfWeek) &&
        rule.dayOfWeek >= 0 &&
        rule.dayOfWeek <= 6 &&
        rule.startTime &&
        rule.endTime &&
        rule.startTime < rule.endTime &&
        rule.slotMinutes >= 15
    );
}

function demoStylistBySlug(slug) {
  const store = getDemoStore();
  const vendor = store.vendors.find((item) => item.slug === slug);

  if (!vendor) {
    return null;
  }

  return hydrateVendorWindows({
    ...vendor,
    services: store.services
      .filter((service) => service.vendorSlug === slug)
      .sort((a, b) => Number(a.price) - Number(b.price))
  });
}

function isUniqueViolation(error) {
  return error?.code === "23505";
}

async function getUserRowByEmail(email) {
  const result = await queryPostgres(
    `SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
    [email]
  );
  return result.rows[0] || null;
}

async function getUserRowById(id) {
  const result = await queryPostgres(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [id]);
  return result.rows[0] || null;
}

async function getVendorRowBySlug(slug) {
  const result = await queryPostgres(`SELECT * FROM vendor_profiles WHERE slug = $1 LIMIT 1`, [slug]);
  return result.rows[0] || null;
}

async function getServiceRowsByVendorSlug(vendorSlug, orderBy = "price ASC") {
  const result = await queryPostgres(
    `SELECT * FROM services WHERE vendor_slug = $1 ORDER BY ${orderBy}`,
    [vendorSlug]
  );
  return result.rows;
}

async function getBookingRowsByVendorSlug(vendorSlug) {
  const result = await queryPostgres(
    `SELECT * FROM bookings WHERE vendor_slug = $1 ORDER BY created_at DESC`,
    [vendorSlug]
  );
  return result.rows;
}

async function refreshVendorPrice(db, vendorSlug) {
  const { rows } = await db.query(
    `SELECT COALESCE(MIN(price), 0) AS price_from FROM services WHERE vendor_slug = $1`,
    [vendorSlug]
  );
  const priceFrom = Number(rows[0]?.price_from || 0);

  await db.query(
    `UPDATE vendor_profiles SET price_from = $2, updated_at = NOW() WHERE slug = $1`,
    [vendorSlug, priceFrom]
  );
}

export async function getStylists(filters = {}) {
  if (!hasDatabase) {
    return filterStylists(
      getDemoStore().vendors.filter((vendor) => vendor.status === "active"),
      filters
    );
  }

  const { rows } = await queryPostgres(
    `SELECT * FROM vendor_profiles WHERE status = 'active' ORDER BY rating DESC`
  );
  return filterStylists(rows.map(mapVendorRow), filters);
}

export async function getFeaturedStylists() {
  const items = await getStylists();
  return items.slice(0, 4);
}

export async function getStylistBySlug(slug) {
  if (!hasDatabase) {
    return demoStylistBySlug(slug);
  }

  const vendorRow = await getVendorRowBySlug(slug);

  if (!vendorRow) {
    return null;
  }

  const serviceRows = await getServiceRowsByVendorSlug(slug);
  return {
    ...mapVendorRow(vendorRow),
    services: serviceRows.map(mapServiceRow)
  };
}

export async function getUserById(id) {
  if (!id) {
    return null;
  }

  if (!hasDatabase) {
    return sanitizeUser(getDemoStore().users.find((user) => user.id === id));
  }

  return mapUserRow(await getUserRowById(id));
}

export async function getUserByEmail(email) {
  if (!email) {
    return null;
  }

  if (!hasDatabase) {
    return sanitizeUser(
      getDemoStore().users.find((user) => user.email.toLowerCase() === email.toLowerCase())
    );
  }

  return mapUserRow(await getUserRowByEmail(email));
}

export async function signupUser(payload) {
  if (!hasDatabase) {
    const store = getDemoStore();
    const exists = store.users.find((user) => user.email.toLowerCase() === payload.email.toLowerCase());

    if (exists) {
      throw new Error("An account with this email already exists.");
    }

    const user = {
      id: `usr-${Date.now()}`,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      city: payload.city,
      role: payload.role || "client",
      vendorSlug: payload.vendorSlug || null,
      passwordHash: await hash(payload.password, 10)
    };

    store.users.unshift(user);
    return sanitizeUser(user);
  }

  const existing = await getUserRowByEmail(payload.email);

  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  try {
    const passwordHash = await hash(payload.password, 10);
    const userId = `usr-${Date.now()}`;
    const { rows } = await queryPostgres(
      `
        INSERT INTO users (
          id, name, email, phone, city, vendor_slug, role, password_hash, avatar, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *
      `,
      [
        userId,
        payload.name,
        payload.email,
        payload.phone || "",
        payload.city || "",
        payload.vendorSlug || null,
        payload.role || "client",
        passwordHash,
        payload.avatar || ""
      ]
    );

    return mapUserRow(rows[0]);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error("An account with this email already exists.");
    }

    throw error;
  }
}

export async function signinUser(payload) {
  if (!hasDatabase) {
    const user = getDemoStore().users.find((item) => item.email.toLowerCase() === payload.email.toLowerCase());

    if (!user) {
      throw new Error("No account found for this email.");
    }

    const isValid = await compare(payload.password, user.passwordHash);

    if (!isValid) {
      throw new Error("Incorrect password.");
    }

    return sanitizeUser(user);
  }

  const user = await getUserRowByEmail(payload.email);

  if (!user) {
    throw new Error("No account found for this email.");
  }

  const isValid = await compare(payload.password, user.password_hash);

  if (!isValid) {
    throw new Error("Incorrect password.");
  }

  return mapUserRow(user);
}

export async function createVendorAccount(payload) {
  const businessName = String(payload.businessName || "").trim();

  if (!businessName) {
    throw new Error("Business name is required.");
  }

  if (!hasDatabase) {
    const store = getDemoStore();
    const vendorSlug = makeVendorSlug(
      businessName,
      store.vendors.map((vendor) => vendor.slug)
    );
    const user = await signupUser({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      city: payload.city,
      password: payload.password,
      role: "vendor",
      vendorSlug
    });

    const vendor = {
      id: `vendor-${Date.now()}`,
      slug: vendorSlug,
      name: businessName,
      owner: payload.name,
      category: payload.category,
      city: payload.city,
      location: payload.location || payload.city,
      rating: 5,
      reviewCount: 0,
      priceFrom: 0,
      responseTime: "Pending approval",
      verified: false,
      heroTag: payload.heroTag || "New Hair Force partner",
      tagline: payload.notes || "Fresh profile on the marketplace.",
      bio: payload.notes || "This vendor is setting up their Hair Force storefront.",
      specialties: toList(payload.specialties || payload.category),
      amenities: ["Online booking", "Marketplace profile"],
      coverGradient: "linear-gradient(135deg, rgba(54,110,255,.55), rgba(53,223,255,.2))",
      metrics: {
        repeatClients: "0%",
        monthlyBookings: "0",
        showUpRate: "0%"
      },
      coverImage: "",
      galleryImages: [],
      availabilityRules: createDefaultAvailabilityRules(),
      blackoutDates: [],
      gallery: [],
      reviews: [],
      bookingWindows: buildBookingWindowsFromRules(createDefaultAvailabilityRules(), []),
      status: "pending"
    };

    store.vendors.unshift(vendor);
    return { user, vendor };
  }

  return withPostgresTransaction(async (db) => {
    const existingUser = await db.query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [payload.email]
    );

    if (existingUser.rows.length) {
      throw new Error("An account with this email already exists.");
    }

    const slugResult = await db.query(`SELECT slug FROM vendor_profiles`);
    const vendorSlug = makeVendorSlug(
      businessName,
      slugResult.rows.map((row) => row.slug)
    );
    const availabilityRules = createDefaultAvailabilityRules();
    const bookingWindows = buildBookingWindowsFromRules(availabilityRules, []);
    const passwordHash = await hash(payload.password, 10);
    const userId = `usr-${Date.now()}`;
    const vendorId = `vendor-${Date.now()}`;

    const userResult = await db.query(
      `
        INSERT INTO users (
          id, name, email, phone, city, vendor_slug, role, password_hash, avatar, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'vendor', $7, $8, NOW(), NOW())
        RETURNING *
      `,
      [
        userId,
        payload.name,
        payload.email,
        payload.phone || "",
        payload.city || "",
        vendorSlug,
        passwordHash,
        ""
      ]
    );

    const vendorResult = await db.query(
      `
        INSERT INTO vendor_profiles (
          id, slug, name, owner, category, city, location, rating, review_count, price_from,
          response_time, verified, hero_tag, tagline, bio, cover_image, gallery_images,
          specialties, amenities, cover_gradient, metrics, gallery, reviews, booking_windows,
          availability_rules, blackout_dates, status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, 5, 0, 0,
          $8, FALSE, $9, $10, $11, '', '[]'::jsonb,
          $12::jsonb, $13::jsonb, $14, $15::jsonb, '[]'::jsonb, '[]'::jsonb, $16::jsonb,
          $17::jsonb, '[]'::jsonb, 'pending', NOW(), NOW()
        )
        RETURNING *
      `,
      [
        vendorId,
        vendorSlug,
        businessName,
        payload.name,
        payload.category,
        payload.city,
        payload.location || payload.city,
        "Pending approval",
        payload.heroTag || "New Hair Force partner",
        payload.notes || "Fresh profile on the marketplace.",
        payload.notes || "This vendor is setting up their Hair Force storefront.",
        JSON.stringify(toList(payload.specialties || payload.category)),
        JSON.stringify(["Online booking", "Marketplace profile"]),
        "linear-gradient(135deg, rgba(54,110,255,.55), rgba(53,223,255,.2))",
        JSON.stringify({
          repeatClients: "0%",
          monthlyBookings: "0",
          showUpRate: "0%"
        }),
        JSON.stringify(bookingWindows),
        JSON.stringify(availabilityRules)
      ]
    );

    return {
      user: mapUserRow(userResult.rows[0]),
      vendor: mapVendorRow(vendorResult.rows[0])
    };
  });
}

export async function createBooking(payload) {
  const stylist = await getStylistBySlug(payload.vendorSlug);

  if (!stylist) {
    throw new Error("Stylist not found");
  }

  const service = stylist.services.find((item) => String(item.id) === String(payload.serviceId));

  if (!service) {
    throw new Error("Service not found.");
  }

  const total = Number(payload.total || service.price || 0);
  const depositAmount = Number(payload.depositAmount ?? calculateDeposit(service, total));
  const bookingRecord = {
    id: `bk-${Date.now()}`,
    vendorSlug: stylist.slug,
    vendorName: stylist.name,
    customerId: payload.customerId || null,
    customerName: payload.customerName,
    customerEmail: payload.customerEmail,
    customerPhone: payload.customerPhone,
    serviceId: String(service.id),
    serviceName: payload.serviceName || service.title,
    appointmentDate: payload.appointmentDate,
    appointmentSlot: payload.appointmentSlot,
    total,
    depositAmount,
    remainingAmount: Math.max(0, total - depositAmount),
    paymentStatus: payload.paymentStatus || (depositAmount ? "deposit_due" : "pay_later"),
    paymentIntentId: payload.paymentIntentId || "",
    notes: payload.notes || "",
    status: payload.status || "confirmed",
    source: payload.source || "web",
    createdAt: new Date().toISOString()
  };

  if (!hasDatabase) {
    const store = getDemoStore();
    store.bookings.unshift(bookingRecord);
    return bookingRecord;
  }

  const { rows } = await queryPostgres(
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
        $17, $18, $19, $20, NOW()
      )
      RETURNING *
    `,
    [
      bookingRecord.id,
      bookingRecord.vendorSlug,
      bookingRecord.vendorName,
      bookingRecord.customerId,
      bookingRecord.customerName,
      bookingRecord.customerEmail,
      bookingRecord.customerPhone || "",
      bookingRecord.serviceId,
      bookingRecord.serviceName,
      bookingRecord.appointmentDate,
      bookingRecord.appointmentSlot,
      bookingRecord.total,
      bookingRecord.depositAmount,
      bookingRecord.remainingAmount,
      bookingRecord.paymentStatus,
      bookingRecord.paymentIntentId,
      bookingRecord.notes,
      bookingRecord.status,
      bookingRecord.source,
      bookingRecord.createdAt
    ]
  );

  return mapBookingRow(rows[0]);
}

export async function getDashboardDataForUser(user) {
  if (!user) {
    return null;
  }

  if (user.role === "vendor") {
    assertVendorUser(user);

    if (!hasDatabase) {
      const store = getDemoStore();
      const vendor = store.vendors.find((item) => item.slug === user.vendorSlug);
      const services = store.services.filter((service) => service.vendorSlug === user.vendorSlug);
      const bookings = store.bookings.filter((booking) => booking.vendorSlug === user.vendorSlug);

      return {
        kind: "vendor",
        vendor: hydrateVendorWindows(vendor),
        services,
        bookings,
        summary: buildVendorSummary(hydrateVendorWindows(vendor), services, bookings)
      };
    }

    const vendorRow = await getVendorRowBySlug(user.vendorSlug);

    if (!vendorRow) {
      throw new Error("Vendor profile not found.");
    }

    const [serviceRows, bookingRows] = await Promise.all([
      getServiceRowsByVendorSlug(user.vendorSlug, "created_at DESC"),
      getBookingRowsByVendorSlug(user.vendorSlug)
    ]);
    const vendor = mapVendorRow(vendorRow);
    const services = serviceRows.map(mapServiceRow);
    const bookings = bookingRows.map(mapBookingRow);

    return {
      kind: "vendor",
      vendor,
      services,
      bookings,
      summary: buildVendorSummary(vendor, services, bookings)
    };
  }

  if (!hasDatabase) {
    const store = getDemoStore();
    const bookings = store.bookings.filter((booking) => booking.customerEmail === user.email);
    const recommendations = store.vendors.slice(0, 3);
    return {
      kind: "client",
      bookings,
      recommendations
    };
  }

  const { rows } = await queryPostgres(
    `SELECT * FROM bookings WHERE LOWER(customer_email) = LOWER($1) ORDER BY created_at DESC`,
    [user.email]
  );
  return {
    kind: "client",
    bookings: rows.map(mapBookingRow),
    recommendations: await getFeaturedStylists()
  };
}

export async function updateVendorProfile(user, payload) {
  assertVendorUser(user);

  if (!hasDatabase) {
    const store = getDemoStore();
    const vendor = store.vendors.find((item) => item.slug === user.vendorSlug);

    if (!vendor) {
      throw new Error("Vendor profile not found.");
    }

    Object.assign(vendor, normalizeVendorPayload(vendor, payload));
    return getDashboardDataForUser(user);
  }

  const existingVendor = await getVendorRowBySlug(user.vendorSlug);

  if (!existingVendor) {
    throw new Error("Vendor profile not found.");
  }

  const nextVendor = normalizeVendorPayload(mapVendorRow(existingVendor), payload);

  await queryPostgres(
    `
      UPDATE vendor_profiles
      SET name = $2,
          owner = $3,
          category = $4,
          city = $5,
          location = $6,
          hero_tag = $7,
          tagline = $8,
          bio = $9,
          cover_image = $10,
          specialties = $11::jsonb,
          amenities = $12::jsonb,
          updated_at = NOW()
      WHERE slug = $1
    `,
    [
      user.vendorSlug,
      nextVendor.name,
      nextVendor.owner,
      nextVendor.category,
      nextVendor.city,
      nextVendor.location,
      nextVendor.heroTag,
      nextVendor.tagline,
      nextVendor.bio,
      nextVendor.coverImage,
      JSON.stringify(nextVendor.specialties || []),
      JSON.stringify(nextVendor.amenities || [])
    ]
  );

  return getDashboardDataForUser(user);
}

export async function updateVendorAvailability(user, payload) {
  assertVendorUser(user);
  const hasBookingWindowsInput = Array.isArray(payload.bookingWindows);
  const hasAvailabilityRulesInput = Array.isArray(payload.availabilityRules);
  const bookingWindows = normalizeAvailabilityPayload(payload.bookingWindows);
  const availabilityRules = normalizeAvailabilityRules(payload.availabilityRules);
  const blackoutDates = toList(payload.blackoutDates);
  const nextRules =
    hasAvailabilityRulesInput
      ? availabilityRules
      : hasBookingWindowsInput
        ? bookingWindows.length
          ? deriveRulesFromBookingWindows(bookingWindows)
          : []
        : createDefaultAvailabilityRules();
  const nextWindows = hasBookingWindowsInput
    ? bookingWindows
    : buildBookingWindowsFromRules(nextRules, blackoutDates);

  if (!hasDatabase) {
    const store = getDemoStore();
    const vendor = store.vendors.find((item) => item.slug === user.vendorSlug);

    if (!vendor) {
      throw new Error("Vendor profile not found.");
    }

    vendor.availabilityRules = nextRules;
    vendor.blackoutDates = blackoutDates;
    vendor.bookingWindows = nextWindows;
    return getDashboardDataForUser(user);
  }

  const result = await queryPostgres(
    `
      UPDATE vendor_profiles
      SET availability_rules = $2::jsonb,
          blackout_dates = $3::jsonb,
          booking_windows = $4::jsonb,
          updated_at = NOW()
      WHERE slug = $1
      RETURNING id
    `,
    [
      user.vendorSlug,
      JSON.stringify(nextRules),
      JSON.stringify(blackoutDates),
      JSON.stringify(nextWindows)
    ]
  );

  if (!result.rows.length) {
    throw new Error("Vendor profile not found.");
  }

  return getDashboardDataForUser(user);
}

export async function createVendorService(user, payload) {
  assertVendorUser(user);
  const serviceData = normalizeServicePayload(payload);

  if (!serviceData.title || !serviceData.duration || !serviceData.price) {
    throw new Error("Title, duration, and price are required.");
  }

  if (!hasDatabase) {
    const store = getDemoStore();
    const vendor = store.vendors.find((item) => item.slug === user.vendorSlug);

    if (!vendor) {
      throw new Error("Vendor profile not found.");
    }

    const service = {
      id: `srv-${Date.now()}`,
      vendorSlug: user.vendorSlug,
      vendorName: vendor.name,
      category: vendor.category,
      ...serviceData
    };

    store.services.unshift(service);
    recalculateVendorPrice(user.vendorSlug, store.services, store.vendors);
    return getDashboardDataForUser(user);
  }

  await withPostgresTransaction(async (db) => {
    const vendorResult = await db.query(
      `SELECT name, category FROM vendor_profiles WHERE slug = $1 LIMIT 1`,
      [user.vendorSlug]
    );
    const vendor = vendorResult.rows[0];

    if (!vendor) {
      throw new Error("Vendor profile not found.");
    }

    await db.query(
      `
        INSERT INTO services (
          id, vendor_slug, vendor_name, title, category, duration, price,
          deposit_type, deposit_value, image_url, description, featured, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, FALSE, NOW(), NOW())
      `,
      [
        `srv-${Date.now()}`,
        user.vendorSlug,
        vendor.name,
        serviceData.title,
        vendor.category,
        serviceData.duration,
        serviceData.price,
        serviceData.depositType,
        serviceData.depositValue,
        serviceData.imageUrl,
        serviceData.description
      ]
    );

    await refreshVendorPrice(db, user.vendorSlug);
  });

  return getDashboardDataForUser(user);
}

export async function updateVendorService(user, serviceId, payload) {
  assertVendorUser(user);
  const serviceData = normalizeServicePayload(payload);

  if (!hasDatabase) {
    const store = getDemoStore();
    const service = store.services.find(
      (item) => String(item.id) === String(serviceId) && item.vendorSlug === user.vendorSlug
    );

    if (!service) {
      throw new Error("Service not found.");
    }

    Object.assign(service, serviceData);
    recalculateVendorPrice(user.vendorSlug, store.services, store.vendors);
    return getDashboardDataForUser(user);
  }

  await withPostgresTransaction(async (db) => {
    const result = await db.query(
      `
        UPDATE services
        SET title = $3,
            duration = $4,
            price = $5,
            description = $6,
            deposit_type = $7,
            deposit_value = $8,
            image_url = $9,
            updated_at = NOW()
        WHERE id = $1 AND vendor_slug = $2
        RETURNING id
      `,
      [
        serviceId,
        user.vendorSlug,
        serviceData.title,
        serviceData.duration,
        serviceData.price,
        serviceData.description,
        serviceData.depositType,
        serviceData.depositValue,
        serviceData.imageUrl
      ]
    );

    if (!result.rows.length) {
      throw new Error("Service not found.");
    }

    await refreshVendorPrice(db, user.vendorSlug);
  });

  return getDashboardDataForUser(user);
}

export async function deleteVendorService(user, serviceId) {
  assertVendorUser(user);

  if (!hasDatabase) {
    const store = getDemoStore();
    const nextServices = store.services.filter(
      (service) => !(String(service.id) === String(serviceId) && service.vendorSlug === user.vendorSlug)
    );

    if (nextServices.length === store.services.length) {
      throw new Error("Service not found.");
    }

    store.services = nextServices;
    recalculateVendorPrice(user.vendorSlug, store.services, store.vendors);
    return getDashboardDataForUser(user);
  }

  await withPostgresTransaction(async (db) => {
    const deleted = await db.query(
      `DELETE FROM services WHERE id = $1 AND vendor_slug = $2 RETURNING id`,
      [serviceId, user.vendorSlug]
    );

    if (!deleted.rows.length) {
      throw new Error("Service not found.");
    }

    await refreshVendorPrice(db, user.vendorSlug);
  });

  return getDashboardDataForUser(user);
}

export async function getAdminDataForUser(user) {
  if (!user || user.role !== "admin") {
    throw new Error("Admin access required.");
  }

  if (!hasDatabase) {
    const store = getDemoStore();
    return {
      pendingVendors: store.vendors.filter((vendor) => vendor.status === "pending"),
      activeVendors: store.vendors.filter((vendor) => vendor.status === "active"),
      rejectedVendors: store.vendors.filter((vendor) => vendor.status === "rejected")
    };
  }

  const { rows } = await queryPostgres(`SELECT * FROM vendor_profiles ORDER BY created_at DESC`);
  const vendors = rows.map(mapVendorRow);

  return {
    pendingVendors: vendors.filter((vendor) => vendor.status === "pending"),
    activeVendors: vendors.filter((vendor) => vendor.status === "active"),
    rejectedVendors: vendors.filter((vendor) => vendor.status === "rejected")
  };
}

export async function updateVendorModeration(user, slug, payload) {
  if (!user || user.role !== "admin") {
    throw new Error("Admin access required.");
  }

  const nextStatus = ["active", "pending", "rejected"].includes(payload.status)
    ? payload.status
    : "pending";

  if (!hasDatabase) {
    const store = getDemoStore();
    const vendor = store.vendors.find((item) => item.slug === slug);

    if (!vendor) {
      throw new Error("Vendor not found.");
    }

    vendor.status = nextStatus;
    vendor.verified = nextStatus === "active";
    vendor.responseTime = nextStatus === "active" ? vendor.responseTime || "Responds in 15 min" : "Pending approval";
    return getAdminDataForUser(user);
  }

  const result = await queryPostgres(
    `
      UPDATE vendor_profiles
      SET status = $2,
          verified = $3,
          response_time = $4,
          updated_at = NOW()
      WHERE slug = $1
      RETURNING id
    `,
    [
      slug,
      nextStatus,
      nextStatus === "active",
      nextStatus === "active" ? "Responds in 15 min" : "Pending approval"
    ]
  );

  if (!result.rows.length) {
    throw new Error("Vendor not found.");
  }

  return getAdminDataForUser(user);
}
