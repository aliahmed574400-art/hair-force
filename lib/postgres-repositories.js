import { createHash, randomInt, randomUUID } from "crypto";
import { compare, hash } from "bcryptjs";
import {
  buildAvailabilityAgenda,
  buildBookingWindowsFromRules,
  copyAvailabilityOverrides,
  createDefaultAvailabilityRules,
  deriveRulesFromBookingWindows,
  normalizeAvailabilityOverrides,
  toTwentyFourHour
} from "@/lib/availability";
import { getDemoStore } from "@/lib/demo-store";
import { geocodeLocationQuery } from "@/lib/google-maps";
import {
  hasPostgresDatabase,
  queryPostgres,
  withPostgresTransaction
} from "@/lib/postgres";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/session-constants";
import {
  buildVendorCityStateLabel,
  buildVendorLocationLabel,
  buildVendorMapPinLabel,
  distanceMilesBetween,
  formatDistanceLabel,
  getNextAvailabilityMeta,
  matchPriceRange,
  normalizeCoordinate,
  normalizeLocationPrecision,
  normalizeVendorLocationFields
} from "@/lib/discovery";
import {
  assertGoogleAccountRoleOwnership,
  normalizeGoogleAuthAccountRole
} from "@/lib/google-auth-ownership";
import { calculateDeposit, createSlug, filterStylists, normalizePhone, toList } from "@/lib/utils";
import { sendAppointmentConfirmationNotifications } from "@/lib/appointment-notifications";

const hasDatabase = hasPostgresDatabase;
const OTP_LENGTH = 6;
const OTP_TTL_SECONDS = Math.max(30, Number(process.env.OTP_TTL_SECONDS || 60));
const PASSWORD_RESET_TOKEN_TTL_SECONDS = Math.max(
  300,
  Number(process.env.PASSWORD_RESET_TOKEN_TTL_SECONDS || 900)
);
const PHONE_PLACEHOLDER_DOMAIN = "phone.hairforce.local";
const DEFAULT_CLIENT_TIMEZONE = "America/Los_Angeles";
const DEFAULT_CLIENT_COUNTRY = "US";
const DEFAULT_CLIENT_PHONE_COUNTRY_CODE = "+1";
const DEFAULT_GOOGLE_VENDOR_CATEGORY = "Salon";
const AUTH_SESSION_MAX_AGE_SECONDS = SESSION_MAX_AGE_SECONDS;
const SERVICE_MENU_TYPES = new Set(["service", "addon", "category", "combined"]);
// Re-export for any caller still pulling the constant from this module.
export { SESSION_MAX_AGE_SECONDS };

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeAllowedRoles(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))];
}

function createRoleRestrictedAuthError(allowedRoles) {
  const error = new Error(
    "This page is for stylists and vendors. Please use the client sign-in page."
  );

  error.status = 403;
  error.code = "AUTH_ROLE_NOT_ALLOWED";
  error.allowedRoles = normalizeAllowedRoles(allowedRoles);
  return error;
}

function assertUserAllowedRoles(user, allowedRoles) {
  const normalizedAllowedRoles = normalizeAllowedRoles(allowedRoles);

  if (!normalizedAllowedRoles.length) {
    return normalizedAllowedRoles;
  }

  if (normalizedAllowedRoles.includes(String(user?.role || "").trim())) {
    return normalizedAllowedRoles;
  }

  throw createRoleRestrictedAuthError(normalizedAllowedRoles);
}

function assertGoogleSignInRoleAccess(user, accountRole, allowedRoles) {
  const normalizedAccountRole = normalizeGoogleAuthAccountRole(accountRole);

  if (normalizedAccountRole) {
    return assertGoogleAccountRoleOwnership(user, normalizedAccountRole);
  }

  return assertUserAllowedRoles(user, allowedRoles);
}

function isPhonePlaceholderEmail(value) {
  return normalizeEmail(value).endsWith(`@${PHONE_PLACEHOLDER_DOMAIN}`);
}

function toPublicEmail(value) {
  const email = normalizeEmail(value);
  return isPhonePlaceholderEmail(email) ? "" : email;
}

function createPhonePlaceholderEmail(phoneNormalized) {
  return `phone-${phoneNormalized}@${PHONE_PLACEHOLDER_DOMAIN}`;
}

function createOtpHash(code, scope) {
  const secret = process.env.SESSION_SECRET || "hairforce-dev-session-secret";
  return createHash("sha256")
    .update(`${scope}:${code}:${secret}`)
    .digest("hex");
}

function hashOpaqueToken(token, scope) {
  const secret = process.env.SESSION_SECRET || "hairforce-dev-session-secret";
  return createHash("sha256")
    .update(`${scope}:${token}:${secret}`)
    .digest("hex");
}

function generateOtpCode() {
  const fixedCode = String(process.env.OTP_FIXED_CODE || "").replace(/\D/g, "");

  if (fixedCode.length === OTP_LENGTH) {
    return fixedCode;
  }

  return String(randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0");
}

function getDemoPhoneOtpSessions() {
  const store = getDemoStore();

  if (!Array.isArray(store.phoneOtpSessions)) {
    store.phoneOtpSessions = [];
  }

  return store.phoneOtpSessions;
}

function getDemoPasswordResetSessions() {
  const store = getDemoStore();

  if (!Array.isArray(store.passwordResetSessions)) {
    store.passwordResetSessions = [];
  }

  return store.passwordResetSessions;
}

function getDemoAuthSessions() {
  const store = getDemoStore();

  if (!Array.isArray(store.authSessions)) {
    store.authSessions = [];
  }

  return store.authSessions;
}

function getDemoDeleteRequests() {
  const store = getDemoStore();

  if (!Array.isArray(store.deleteRequests)) {
    store.deleteRequests = [];
  }

  return store.deleteRequests;
}

function findDemoUserByPhoneNormalized(phoneNormalized) {
  return (
    getDemoStore().users.find(
      (item) =>
        item.phoneNormalized === phoneNormalized ||
        normalizePhone(item.phone) === phoneNormalized
    ) || null
  );
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const clean = { ...user };
  delete clean.passwordHash;
  clean.email = toPublicEmail(clean.email);
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

function normalizeDateOnly(value) {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  const stringValue = String(value);

  if (/^\d{4}-\d{2}-\d{2}/.test(stringValue)) {
    return stringValue.slice(0, 10);
  }

  const parsed = new Date(stringValue);
  return Number.isNaN(parsed.getTime()) ? stringValue : parsed.toISOString().slice(0, 10);
}

function mapUserRow(row, options = {}) {
  if (!row) {
    return null;
  }

  const user = {
    id: row.id,
    name: row.name,
    email: toPublicEmail(row.email),
    phone: row.phone || "",
    phoneNormalized: row.phone_normalized || normalizePhone(row.phone) || null,
    city: row.city || "",
    vendorSlug: row.vendor_slug || null,
    role: row.role || "client",
    avatar: row.avatar || "",
    googleId: row.google_id || null,
    appleId: row.apple_id || row.appleId || null,
    timezone: row.timezone || DEFAULT_CLIENT_TIMEZONE,
    country: row.country || DEFAULT_CLIENT_COUNTRY,
    phoneCountryCode: row.phone_country_code || DEFAULT_CLIENT_PHONE_COUNTRY_CODE,
    smsOptIn: Boolean(row.sms_opt_in ?? row.smsOptIn),
    promoCode: row.promo_code || row.promoCode || "",
    reducedMotion: Boolean(row.reduced_motion ?? row.reducedMotion),
    highContrast: Boolean(row.high_contrast ?? row.highContrast),
    largerText: Boolean(row.larger_text ?? row.largerText),
    passwordHash: row.password_hash,
    lastSignInAt: toIsoString(row.last_signin_at),
    signInCount: Number(row.signin_count || 0),
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

  const availabilityOverrides = normalizeAvailabilityOverrides(vendor.availabilityOverrides);
  const blackoutDates = Array.isArray(vendor.blackoutDates) ? vendor.blackoutDates : [];

  return {
    ...vendor,
    availabilityRules: rules,
    availabilityOverrides,
    blackoutDates,
    bookingWindows:
      hasSavedWindows && !vendor.forceRegenerateWindows
        ? vendor.bookingWindows
        : buildBookingWindowsFromRules(rules, blackoutDates, 21, 6, {
            availabilityOverrides
          })
  };
}

function normalizePoliciesObject(value) {
  const source = parseJsonField(value, value && typeof value === "object" ? value : {});

  return {
    deposit: String(source?.deposit || "").trim(),
    cancellation: String(source?.cancellation || "").trim(),
    lateArrival: String(source?.lateArrival || "").trim(),
    prepInstructions: String(source?.prepInstructions || "").trim()
  };
}

function normalizeSocialLinksObject(value) {
  const source = parseJsonField(value, value && typeof value === "object" ? value : {});

  return {
    instagram: String(source?.instagram || "").trim(),
    website: String(source?.website || "").trim(),
    tiktok: String(source?.tiktok || "").trim(),
    facebook: String(source?.facebook || "").trim(),
    twitter: String(source?.twitter || "").trim(),
    yelp: String(source?.yelp || "").trim()
  };
}

function mergeImageList(...collections) {
  return [...new Set(collections.flat().map((item) => String(item || "").trim()).filter(Boolean))];
}

function normalizePersonalInfoObject(value) {
  const source = parseJsonField(value, value && typeof value === "object" ? value : {});

  return {
    displayName: String(source?.displayName || "").trim(),
    pronouns: toList(source?.pronouns || []),
    profession: String(source?.profession || "").trim(),
    about: String(source?.about || "").trim(),
    email: String(source?.email || "").trim(),
    phone: String(source?.phone || "").trim(),
    websitePath: String(source?.websitePath || "").trim()
  };
}

function normalizeBusinessInfoObject(value) {
  const source = parseJsonField(value, value && typeof value === "object" ? value : {});

  return {
    businessName: String(source?.businessName || "").trim(),
    salonNumber: String(source?.salonNumber || "").trim(),
    personalPhoneNumber: String(source?.personalPhoneNumber || "").trim(),
    numberShownOnProfile:
      source?.numberShownOnProfile === "personalPhoneNumber" ? "personalPhoneNumber" : "salonNumber",
    smsNotificationsPhoneNumber: String(source?.smsNotificationsPhoneNumber || "").trim(),
    mobileBusiness: Boolean(source?.mobileBusiness),
    streetAddress: String(source?.streetAddress || "").trim(),
    suite: String(source?.suite || "").trim(),
    city: String(source?.city || "").trim(),
    state: String(source?.state || "").trim(),
    zip: String(source?.zip || "").trim(),
    locationInstructions: String(source?.locationInstructions || "").trim()
  };
}

function normalizePortfolioItems(value) {
  const source = parseJsonField(value, []);

  if (!Array.isArray(source)) {
    return [];
  }

  return source
    .map((item, index) => {
      if (typeof item === "string") {
        const url = item.trim();
        return url
          ? {
              id: `media-${index + 1}`,
              url,
              type: "image",
              serviceId: "",
              clientName: "",
              caption: "",
              pinned: false
            }
          : null;
      }

      const url = String(item?.url || "").trim();

      if (!url) {
        return null;
      }

      return {
        id: String(item?.id || `media-${index + 1}`).trim(),
        url,
        type: item?.type === "video" ? "video" : "image",
        serviceId: String(item?.serviceId || "").trim(),
        clientName: String(item?.clientName || "").trim(),
        caption: String(item?.caption || "").trim(),
        pinned: Boolean(item?.pinned)
      };
    })
    .filter(Boolean);
}

function normalizeProductsList(value) {
  const source = parseJsonField(value, []);

  if (!Array.isArray(source)) {
    return [];
  }

  return source
    .map((item, index) => ({
      id: String(item?.id || `product-${index + 1}`).trim(),
      name: String(item?.name || "").trim(),
      price: Number(item?.price || 0),
      category: String(item?.category || "Shampoo").trim(),
      description: String(item?.description || "").trim()
    }))
    .filter((item) => item.name);
}

function normalizeServiceType(value) {
  const serviceType = String(value || "service").trim();
  return SERVICE_MENU_TYPES.has(serviceType) ? serviceType : "service";
}

function normalizeServiceMetadata(value) {
  const source = parseJsonField(value, value && typeof value === "object" ? value : {});

  return {
    priceIsStartingAt: Boolean(source?.priceIsStartingAt),
    timeAdded: ["before", "after"].includes(String(source?.timeAdded || "").trim())
      ? String(source.timeAdded).trim()
      : "after",
    limitedDays: Boolean(source?.limitedDays),
    requireDeposit: Boolean(source?.requireDeposit)
  };
}

function normalizeServiceIdList(value) {
  const source = parseJsonField(value, value);
  const list = Array.isArray(source) ? source : toList(source);
  return [...new Set(list.map((item) => String(item || "").trim()).filter(Boolean))];
}

function isBookableService(service) {
  const serviceType = normalizeServiceType(service?.serviceType);
  return serviceType === "service" || serviceType === "combined";
}

function splitServiceMenuEntries(services = []) {
  const activeServices = services.filter((service) => service.isActive !== false);

  return {
    services: activeServices.filter(isBookableService),
    addons: activeServices.filter((service) => service.serviceType === "addon"),
    serviceCategories: activeServices.filter((service) => service.serviceType === "category")
  };
}

function normalizeVendorCoordinate(value, fallback = null) {
  return normalizeCoordinate(value, fallback);
}

function hasVendorCoordinates(vendor) {
  const lat = vendor?.latitude;
  const lng = vendor?.longitude;
  return (
    lat !== null &&
    lat !== undefined &&
    lat !== "" &&
    lng !== null &&
    lng !== undefined &&
    lng !== "" &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng))
  );
}

function hasVendorLocationInput(vendor) {
  return [vendor?.location, vendor?.area, vendor?.city, vendor?.state].some((value) =>
    String(value || "").trim()
  );
}

function vendorLocationChanged(nextVendor, existingVendor) {
  return ["state", "city", "area", "location"].some(
    (field) =>
      String(nextVendor?.[field] || "").trim() !== String(existingVendor?.[field] || "").trim()
  );
}

async function syncVendorMapLocation(nextVendor, existingVendor) {
  if (!hasVendorLocationInput(nextVendor)) {
    return {
      ...nextVendor,
      latitude: null,
      longitude: null
    };
  }

  const shouldRefreshCoordinates =
    vendorLocationChanged(nextVendor, existingVendor) || !hasVendorCoordinates(existingVendor);

  if (!shouldRefreshCoordinates) {
    return nextVendor;
  }

  try {
    const geocodedLocation = await geocodeLocationQuery({
      state: nextVendor.state,
      city: nextVendor.city,
      area: nextVendor.area,
      location: nextVendor.location
    });

    return {
      ...nextVendor,
      state: geocodedLocation.state || nextVendor.state,
      city: geocodedLocation.city || nextVendor.city,
      area: geocodedLocation.area || nextVendor.area,
      location: geocodedLocation.formattedAddress || nextVendor.location,
      latitude: geocodedLocation.latitude ?? null,
      longitude: geocodedLocation.longitude ?? null
    };
  } catch (error) {
    // Geocoding is optional — don't block profile saves when the map service
    // is unavailable, unconfigured, or can't resolve the address.
    return {
      ...nextVendor,
      latitude: existingVendor?.latitude ?? null,
      longitude: existingVendor?.longitude ?? null
    };
  }
}

function mapVendorRow(row) {
  if (!row) {
    return null;
  }

  const location = normalizeVendorLocationFields({
    state: row.state,
    city: row.city,
    area: row.area,
    location: row.location
  });

  return hydrateVendorWindows({
    id: row.id,
    slug: row.slug,
    name: row.name,
    owner: row.owner,
    category: row.category,
    state: location.state,
    city: location.city,
    area: location.area,
    location: location.location,
    latitude: normalizeVendorCoordinate(row.latitude),
    longitude: normalizeVendorCoordinate(row.longitude),
    locationPrecision: normalizeLocationPrecision(
      row.location_precision || row.locationPrecision || "approx_area"
    ),
    rating: Number(row.rating || 0),
    reviewCount: Number(row.review_count || 0),
    priceFrom: Number(row.price_from || 0),
    responseTime: row.response_time || "",
    verified: Boolean(row.verified),
    heroTag: row.hero_tag || "",
    tagline: row.tagline || "",
    bio: row.bio || "",
    coverImage: row.cover_image || "",
    avatar: row.avatar || "",
    galleryImages: parseJsonField(row.gallery_images, []),
    portfolioItems: normalizePortfolioItems(row.portfolio_items),
    portfolioImages: mergeImageList(
      parseJsonField(row.portfolio_images, parseJsonField(row.gallery_images, [])),
      normalizePortfolioItems(row.portfolio_items)
        .filter((item) => item.type !== "video")
        .map((item) => item.url)
    ),
    specialties: parseJsonField(row.specialties, []),
    amenities: parseJsonField(row.amenities, []),
    serviceLocationType: normalizeServiceLocationType(
      row.service_location_type ?? row.serviceLocationType,
      "studio"
    ),
    policies: normalizePoliciesObject(row.policies),
    socialLinks: normalizeSocialLinksObject(row.social_links),
    personalInfo: normalizePersonalInfoObject(row.personal_info),
    businessInfo: normalizeBusinessInfoObject(row.business_info),
    products: normalizeProductsList(row.products),
    coverGradient: row.cover_gradient || "",
    metrics: parseJsonField(row.metrics, {}),
    gallery: parseJsonField(row.gallery, []),
    reviews: parseJsonField(row.reviews, []),
    bookingWindows: parseJsonField(row.booking_windows, []),
    availabilityRules: parseJsonField(row.availability_rules, []),
    availabilityOverrides: parseJsonField(row.availability_overrides, []),
    blackoutDates: parseJsonField(row.blackout_dates, []),
    status: row.status || "pending",
    callStatus: row.call_status || "available",
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  });
}

function mapServiceRow(row) {
  if (!row) {
    return null;
  }
  const serviceType = normalizeServiceType(row.service_type || row.serviceType);

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
    bookingMethod: row.booking_method || "approval",
    isActive: Boolean(row.is_active ?? true),
    serviceType,
    parentCategoryId: row.parent_category_id || row.parentCategoryId || "",
    includedServiceIds: normalizeServiceIdList(row.included_service_ids ?? row.includedServiceIds ?? []),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    metadata: normalizeServiceMetadata(row.metadata || {}),
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
    appointmentDate: normalizeDateOnly(row.appointment_date),
    appointmentSlot: row.appointment_slot,
    total: Number(row.total || 0),
    depositAmount: Number(row.deposit_amount || 0),
    remainingAmount: Number(row.remaining_amount || 0),
    paymentStatus: row.payment_status || "pay_later",
    paymentIntentId: row.payment_intent_id || "",
    notes: row.notes || "",
    status: row.status || "confirmed",
    bookingMethod: row.booking_method || "approval",
    cancelledAt: toIsoString(row.cancelled_at),
    cancellationReason: row.cancellation_reason || "",
    rescheduledAt: toIsoString(row.rescheduled_at),
    previousAppointmentDate: normalizeDateOnly(row.previous_appointment_date),
    previousAppointmentSlot: row.previous_appointment_slot || "",
    requestedAt: toIsoString(row.requested_at || row.created_at),
    approvedAt: toIsoString(row.approved_at),
    declinedAt: toIsoString(row.declined_at),
    source: row.source || "web",
    notificationsSent: Boolean(row.notifications_sent),
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

function mapClientNotificationRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id || row.userId,
    type: row.type || "info",
    title: row.title,
    message: row.message,
    ctaLabel: row.cta_label || row.ctaLabel || "",
    ctaHref: row.cta_href || row.ctaHref || "",
    metadata: parseJsonField(row.metadata, {}),
    readAt: toIsoString(row.read_at || row.readAt),
    createdAt: toIsoString(row.created_at || row.createdAt),
    updatedAt: toIsoString(row.updated_at || row.updatedAt)
  };
}

function mapVendorNotificationRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    vendorSlug: row.vendor_slug || row.vendorSlug || "",
    type: row.type || "info",
    title: row.title || "",
    message: row.message || "",
    bookingId: row.booking_id || row.bookingId || "",
    conversationId: row.conversation_id || row.conversationId || "",
    clientName: row.client_name || row.clientName || "",
    clientAvatar: row.client_avatar || row.clientAvatar || "",
    serviceName: row.service_name || row.serviceName || "",
    appointmentDate: normalizeDateOnly(row.appointment_date || row.appointmentDate),
    appointmentSlot: row.appointment_slot || row.appointmentSlot || "",
    metadata: parseJsonField(row.metadata, {}),
    readAt: toIsoString(row.read_at || row.readAt),
    createdAt: toIsoString(row.created_at || row.createdAt),
    updatedAt: toIsoString(row.updated_at || row.updatedAt)
  };
}

function mapNotificationPreferencesRow(row) {
  return {
    bookingUpdates: row ? (row.booking_updates ?? row.bookingUpdates) !== false : true,
    clientMessages: row ? (row.client_messages ?? row.clientMessages) !== false : true,
    reminders: row ? row.reminders !== false : true,
    paymentAlerts: row ? (row.payment_alerts ?? row.paymentAlerts) !== false : true,
    reviewRequests: row ? (row.review_requests ?? row.reviewRequests) !== false : true,
    recommendations: row ? row.recommendations !== false : true,
    securityAlerts: row ? (row.security_alerts ?? row.securityAlerts) !== false : true,
    marketingTexts: row ? (row.marketing_texts ?? row.marketingTexts) !== false : true,
    quietHoursEnabled: row ? (row.quiet_hours_enabled ?? row.quietHoursEnabled) !== false : true,
    quietHoursFrom: row ? (row.quiet_hours_from || row.quietHoursFrom || "09:00") : "09:00",
    quietHoursTo: row ? (row.quiet_hours_to || row.quietHoursTo || "22:00") : "22:00",
    updatedAt: row ? toIsoString(row.updated_at || row.updatedAt) : null
  };
}

function mapPaymentMethodRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id || row.userId,
    provider: row.provider || "stripe",
    brand: row.brand || "Card",
    last4: String(row.last4 || row.last_4 || row.last4 || row.last_4 || "").slice(-4),
    expMonth: Number(row.exp_month ?? row.expMonth ?? 0),
    expYear: Number(row.exp_year ?? row.expYear ?? 0),
    holderName: row.holder_name || row.holderName || "",
    isDefault: Boolean(row.is_default ?? row.isDefault),
    createdAt: toIsoString(row.created_at || row.createdAt),
    updatedAt: toIsoString(row.updated_at || row.updatedAt)
  };
}

function mapPaymentRecordRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id || row.userId,
    bookingId: row.booking_id || row.bookingId || null,
    paymentMethodId: row.payment_method_id || row.paymentMethodId || null,
    amount: Number(row.amount || 0),
    currency: row.currency || "USD",
    status: row.status || "succeeded",
    type: row.type || "deposit",
    provider: row.provider || "stripe",
    paymentIntentId: row.payment_intent_id || row.paymentIntentId || "",
    receiptUrl: row.receipt_url || row.receiptUrl || "",
    description: row.description || "",
    bookingServiceName: row.booking_service_name || "",
    bookingVendorName: row.booking_vendor_name || "",
    bookingVendorSlug: row.booking_vendor_slug || "",
    bookingAppointmentDate: normalizeDateOnly(row.booking_appointment_date),
    paymentMethodBrand: row.payment_method_brand || "",
    paymentMethodLast4: row.payment_method_last4 || "",
    createdAt: toIsoString(row.created_at || row.createdAt),
    updatedAt: toIsoString(row.updated_at || row.updatedAt)
  };
}

function mapConversationRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    bookingId: row.booking_id || row.bookingId,
    vendorSlug: row.vendor_slug || row.vendorSlug,
    clientId: row.client_id || row.clientId || null,
    vendorUnreadCount: Number(row.vendor_unread_count ?? row.vendorUnreadCount ?? 0),
    clientUnreadCount: Number(row.client_unread_count ?? row.clientUnreadCount ?? 0),
    lastMessageAt: toIsoString(row.last_message_at || row.lastMessageAt),
    createdAt: toIsoString(row.created_at || row.createdAt),
    updatedAt: toIsoString(row.updated_at || row.updatedAt),
    bookingStatus: row.booking_status || row.bookingStatus || "",
    appointmentDate: normalizeDateOnly(row.appointment_date || row.appointmentDate),
    appointmentSlot: row.appointment_slot || row.appointmentSlot || "",
    serviceName: row.service_name || row.serviceName || "",
    customerName: row.customer_name || row.client_name || row.customerName || row.clientName || "",
    customerEmail: row.customer_email || row.customerEmail || "",
    vendorName: row.vendor_name || row.vendor_profile_name || row.vendorName || "",
    lastMessagePreview: row.last_message_preview || row.lastMessagePreview || ""
  };
}

function mapBookingMessageRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    conversationId: row.conversation_id || row.conversationId,
    bookingId: row.booking_id || row.bookingId,
    senderId: row.sender_id || row.senderId || null,
    senderRole: row.sender_role || row.senderRole || "vendor",
    body: row.body || "",
    readAt: toIsoString(row.read_at || row.readAt),
    createdAt: toIsoString(row.created_at || row.createdAt),
    updatedAt: toIsoString(row.updated_at || row.updatedAt)
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

function normalizeServiceLocationType(value, fallback = "studio") {
  if (value === undefined || value === null) {
    return String(fallback || "").trim();
  }

  return String(value).trim();
}

function buildVendorOwnerName(payload = {}) {
  const explicitName = String(payload.name || "").trim();

  if (explicitName) {
    return explicitName;
  }

  return [payload.firstName, payload.lastName]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join(" ");
}

function normalizeServicePayload(payload) {
  const serviceType = normalizeServiceType(payload.serviceType || payload.type);
  const metadata = normalizeServiceMetadata(payload.metadata || {
    priceIsStartingAt: payload.priceIsStartingAt,
    timeAdded: payload.timeAdded,
    limitedDays: payload.limitedDays,
    requireDeposit: payload.requireDeposit
  });

  return {
    title: String(payload.title || "").trim(),
    duration: serviceType === "category" ? "" : String(payload.duration || "").trim(),
    price: serviceType === "category" ? 0 : Number(payload.price || 0),
    description: String(payload.description || "").trim(),
    depositType: payload.depositType === "fixed" ? "fixed" : "percentage",
    depositValue: metadata.requireDeposit ? Number(payload.depositValue || 0) : Number(payload.depositValue || 0),
    imageUrl: String(payload.imageUrl || "").trim(),
    featured: serviceType === "category" || serviceType === "addon" ? false : Boolean(payload.featured),
    bookingMethod: payload.bookingMethod === "instant" ? "instant" : "approval",
    isActive: payload.isActive !== false,
    serviceType,
    parentCategoryId: serviceType === "category" ? "" : String(payload.parentCategoryId || "").trim(),
    includedServiceIds: serviceType === "combined" ? normalizeServiceIdList(payload.includedServiceIds) : [],
    sortOrder: Number(payload.sortOrder || 0),
    metadata
  };
}

function normalizeVendorPayload(existingVendor, payload) {
  const nextPolicies = normalizePoliciesObject(payload.policies || existingVendor.policies);
  const nextSocialLinks = normalizeSocialLinksObject(payload.socialLinks || existingVendor.socialLinks);
  const nextPersonalInfo = normalizePersonalInfoObject(payload.personalInfo || existingVendor.personalInfo);
  const nextBusinessInfo = normalizeBusinessInfoObject(payload.businessInfo || existingVendor.businessInfo);
  const nextPortfolioItems = normalizePortfolioItems(
    payload.portfolioItems !== undefined ? payload.portfolioItems : existingVendor.portfolioItems
  );
  const nextPortfolioImages = Array.isArray(payload.portfolioImages)
    ? mergeImageList(payload.portfolioImages)
    : mergeImageList(existingVendor.portfolioImages);
  const businessLocation = [
    nextBusinessInfo.streetAddress,
    nextBusinessInfo.suite,
    nextBusinessInfo.city,
    nextBusinessInfo.state,
    nextBusinessInfo.zip
  ]
    .filter(Boolean)
    .join(", ");
  const nextLocationValue = payload.location ?? (businessLocation || existingVendor.location);
  const nextLocation = normalizeVendorLocationFields({
    state: payload.state ?? nextBusinessInfo.state ?? existingVendor.state,
    city: payload.city ?? nextBusinessInfo.city ?? existingVendor.city,
    area: payload.area ?? existingVendor.area,
    location: nextLocationValue
  });

  return {
    ...existingVendor,
    name: String(nextPersonalInfo.displayName || payload.name || existingVendor.name || "").trim(),
    owner: String(payload.owner || nextPersonalInfo.displayName || existingVendor.owner || "").trim(),
    category: String(nextPersonalInfo.profession || payload.category || existingVendor.category || "").trim(),
    state: nextLocation.state,
    city: nextLocation.city,
    area: nextLocation.area,
    location: nextLocation.location,
    latitude: normalizeVendorCoordinate(payload.latitude, existingVendor.latitude ?? null),
    longitude: normalizeVendorCoordinate(payload.longitude, existingVendor.longitude ?? null),
    locationPrecision: normalizeLocationPrecision(
      payload.locationPrecision || existingVendor.locationPrecision || "approx_area"
    ),
    heroTag: String(payload.heroTag || existingVendor.heroTag || "").trim(),
    tagline: String(payload.tagline || existingVendor.tagline || "").trim(),
    bio: String(payload.bio || existingVendor.bio || "").trim(),
    coverImage: String(payload.coverImage || existingVendor.coverImage || "").trim(),
    avatar: String(payload.avatar || existingVendor.avatar || "").trim(),
    portfolioItems: nextPortfolioItems,
    portfolioImages: mergeImageList(
      nextPortfolioImages,
      nextPortfolioItems.filter((item) => item.type !== "video").map((item) => item.url)
    ),
    specialties: toList(payload.specialties || existingVendor.specialties),
    amenities: toList(payload.amenities || existingVendor.amenities),
    serviceLocationType: normalizeServiceLocationType(
      payload.serviceLocationType ?? existingVendor.serviceLocationType,
      "studio"
    ),
    policies: nextPolicies,
    socialLinks: nextSocialLinks,
    personalInfo: nextPersonalInfo,
    businessInfo: nextBusinessInfo,
    products: normalizeProductsList(payload.products !== undefined ? payload.products : existingVendor.products)
  };
}

function recalculateVendorPrice(vendorSlug, services, vendors) {
  const vendorServices = services.filter(
    (service) =>
      service.vendorSlug === vendorSlug &&
      service.isActive !== false &&
      isBookableService(service)
  );
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
    vendor.state,
    vendor.city,
    vendor.area,
    vendor.location,
    vendor.tagline,
    vendor.bio,
    vendor.heroTag,
    vendor.avatar,
    ...(vendor.specialties || []),
    ...(vendor.amenities || []),
    vendor.coverImage,
    vendor.personalInfo?.profession,
    vendor.businessInfo?.businessName,
    vendor.socialLinks?.instagram,
    ...(vendor.products || []).map((product) => product.name),
    ...(vendor.portfolioItems || []).map((item) => item.url)
  ];
  const completedFields = profileFields.filter(Boolean).length;
  const profileStrength = Math.min(100, Math.round((completedFields / 14) * 100));

  return {
    revenue,
    bookingsToday,
    servicesCount: services.length,
    repeatClientCount,
    profileStrength
  };
}

function buildVendorNotificationsPreview(notifications) {
  const sorted = [...(notifications || [])].sort(
    (left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()
  );

  return {
    notifications: sorted,
    unreadNotificationCount: sorted.filter((item) => !item.readAt).length
  };
}

function assertClientUser(user) {
  if (!user || user.role !== "client") {
    throw new Error("Client access required.");
  }
}

function assertDashboardAccountUser(user) {
  if (!user || !["client", "vendor"].includes(user.role)) {
    throw new Error("Dashboard account access required.");
  }
}

function getAppointmentDateTime(appointmentDate, appointmentSlot) {
  const date = String(appointmentDate || "").slice(0, 10);
  const time = toTwentyFourHour(appointmentSlot);
  const parsed = new Date(`${date}T${time}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isCancelledBooking(booking) {
  return String(booking?.status || "").toLowerCase() === "cancelled";
}

function isDeclinedBooking(booking) {
  return String(booking?.status || "").toLowerCase() === "declined";
}

function bookingBlocksSlot(booking) {
  return !isCancelledBooking(booking) && !isDeclinedBooking(booking);
}

function isPastBooking(booking) {
  if (isCancelledBooking(booking) || isDeclinedBooking(booking)) {
    return true;
  }

  const appointment = getAppointmentDateTime(booking.appointmentDate, booking.appointmentSlot);

  if (!appointment) {
    return false;
  }

  return appointment.getTime() < Date.now();
}

function canSelfServeBooking(booking) {
  if (!booking || isCancelledBooking(booking) || isDeclinedBooking(booking)) {
    return false;
  }

  const appointment = getAppointmentDateTime(booking.appointmentDate, booking.appointmentSlot);

  if (!appointment) {
    return false;
  }

  return appointment.getTime() - Date.now() >= 24 * 60 * 60 * 1000;
}

function decorateClientBooking(booking) {
  const appointment = getAppointmentDateTime(booking.appointmentDate, booking.appointmentSlot);
  const isUpcoming =
    Boolean(appointment) &&
    !isCancelledBooking(booking) &&
    !isDeclinedBooking(booking) &&
    appointment.getTime() >= Date.now();
  return {
    ...booking,
    appointmentAt: appointment ? appointment.toISOString() : null,
    isUpcoming,
    isPast: !isUpcoming || isCancelledBooking(booking),
    canCancel: canSelfServeBooking(booking),
    canReschedule: canSelfServeBooking(booking)
  };
}

function sortBookings(bookings, direction = "asc") {
  const factor = direction === "desc" ? -1 : 1;

  return [...bookings].sort((left, right) => {
    const leftTime = getAppointmentDateTime(left.appointmentDate, left.appointmentSlot)?.getTime() || 0;
    const rightTime = getAppointmentDateTime(right.appointmentDate, right.appointmentSlot)?.getTime() || 0;
    return (leftTime - rightTime) * factor;
  });
}

function detectBrowser(userAgent) {
  const source = String(userAgent || "");

  if (/Edg\//i.test(source)) {
    return "Edge";
  }

  if (/Chrome\//i.test(source) && !/Edg\//i.test(source)) {
    return "Chrome";
  }

  if (/Safari\//i.test(source) && !/Chrome\//i.test(source)) {
    return "Safari";
  }

  if (/Firefox\//i.test(source)) {
    return "Firefox";
  }

  if (/OPR\//i.test(source) || /Opera/i.test(source)) {
    return "Opera";
  }

  return "Browser";
}

function detectPlatform(userAgent) {
  const source = String(userAgent || "");

  if (/iPhone|iPad|iPod/i.test(source)) {
    return "iOS";
  }

  if (/Android/i.test(source)) {
    return "Android";
  }

  if (/Windows/i.test(source)) {
    return "Windows";
  }

  if (/Mac OS X|Macintosh/i.test(source)) {
    return "macOS";
  }

  if (/Linux/i.test(source)) {
    return "Linux";
  }

  return "Device";
}

function buildDeviceLabel(browser, platform) {
  return `${browser} on ${platform}`;
}

function createSessionMetadata(meta = {}) {
  const userAgent = String(meta.userAgent || "").trim();
  const browser = detectBrowser(userAgent);
  const platform = detectPlatform(userAgent);

  return {
    userAgent,
    ipAddress: String(meta.ipAddress || "").trim(),
    browser,
    platform,
    deviceLabel: buildDeviceLabel(browser, platform)
  };
}

function mapAuthSessionRow(row) {
  if (!row) {
    return null;
  }

  const revokedAt = toIsoString(row.revoked_at ?? row.revokedAt);
  const expiresAt = toIsoString(row.expires_at ?? row.expiresAt);

  return {
    id: row.id,
    userId: row.user_id ?? row.userId,
    deviceLabel: row.device_label ?? row.deviceLabel ?? "Current device",
    browser: row.browser || "Browser",
    platform: row.platform || "Device",
    userAgent: row.user_agent ?? row.userAgent ?? "",
    ipAddress: row.ip_address ?? row.ipAddress ?? "",
    createdAt: toIsoString(row.created_at ?? row.createdAt),
    lastSeenAt: toIsoString(row.last_seen_at ?? row.lastSeenAt),
    revokedAt,
    expiresAt,
    isRevoked: Boolean(revokedAt),
    isExpired: expiresAt ? new Date(expiresAt).getTime() <= Date.now() : false
  };
}

function getAccountAuthProvider(user = {}) {
  if (user.googleId) {
    return "google";
  }

  if (user.appleId) {
    return "apple";
  }

  if (user.email) {
    return "email";
  }

  return "phone";
}

function buildAccountSecurity(user = {}) {
  const authProvider = getAccountAuthProvider(user);
  const canUsePasswordLogin = authProvider === "email";

  return {
    email: user.email || "",
    authProvider,
    canChangeLoginEmail: canUsePasswordLogin,
    canChangePassword: canUsePasswordLogin,
    linkedMethods: [
      { id: "email", label: "Email", connected: Boolean(user.email) },
      { id: "phone", label: "Phone", connected: Boolean(user.phoneNormalized || normalizePhone(user.phone)) },
      { id: "google", label: "Google", connected: Boolean(user.googleId) },
      { id: "apple", label: "Apple", connected: Boolean(user.appleId) }
    ]
  };
}

function buildClientProfile(user) {
  const accountSecurity = buildAccountSecurity(user);

  return {
    id: user.id,
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    city: user.city || "",
    avatar: user.avatar || "",
    timezone: user.timezone || DEFAULT_CLIENT_TIMEZONE,
    country: user.country || DEFAULT_CLIENT_COUNTRY,
    phoneCountryCode: user.phoneCountryCode || DEFAULT_CLIENT_PHONE_COUNTRY_CODE,
    accessibility: {
      reducedMotion: Boolean(user.reducedMotion),
      highContrast: Boolean(user.highContrast),
      largerText: Boolean(user.largerText)
    },
    linkedMethods: accountSecurity.linkedMethods.filter((method) => method.id !== "apple" || method.connected),
    canChangePassword: accountSecurity.canChangePassword
  };
}

function buildClientOverview(upcomingBookings, pastBookings, favorites, notifications) {
  const nextBooking = upcomingBookings[0] || null;
  const unreadNotifications = notifications.filter((item) => !item.readAt).length;
  const pendingPayments = upcomingBookings.filter(
    (booking) =>
      booking.status !== "pending_approval" &&
      booking.paymentStatus !== "deposit_paid" &&
      Number(booking.remainingAmount || 0) > 0
  ).length;
  const completedVisits = pastBookings.filter(
    (booking) => !isCancelledBooking(booking) && String(booking.status || "").toLowerCase() !== "no_show"
  ).length;

  return {
    nextBooking,
    unreadNotifications,
    favoritesCount: favorites.length,
    pendingPayments,
    completedVisits,
    recentActivity: notifications.slice(0, 4)
  };
}

function getBookingPaymentDueAmount(booking) {
  if (!booking || isCancelledBooking(booking) || isDeclinedBooking(booking) || booking.status === "pending_approval") {
    return 0;
  }

  if (booking.paymentStatus === "failed") {
    return Number(booking.depositAmount || booking.remainingAmount || booking.total || 0);
  }

  if (booking.paymentStatus === "deposit_due") {
    return Number(booking.depositAmount || 0);
  }

  if (booking.paymentStatus === "pay_later") {
    return Number(booking.remainingAmount || booking.total || 0);
  }

  return 0;
}

function buildClientPayments(bookings, paymentMethods, paymentHistory) {
  const outstandingBookings = bookings
    .map((booking) => ({
      ...booking,
      amountDue: getBookingPaymentDueAmount(booking)
    }))
    .filter((booking) => booking.amountDue > 0);
  const successfulPayments = paymentHistory.filter((record) => record.status === "succeeded");
  const defaultMethod =
    paymentMethods.find((method) => method.isDefault) ||
    paymentMethods[0] ||
    null;
  const latestPayment = paymentHistory[0] || null;
  const outstandingTotal = outstandingBookings.reduce(
    (sum, booking) => sum + Number(booking.amountDue || 0),
    0
  );

  return {
    summary: {
      defaultMethod,
      outstandingTotal,
      unpaidBookingsCount: outstandingBookings.length,
      latestPayment,
      failedPaymentsCount: paymentHistory.filter((record) => record.status === "failed").length
    },
    savedMethods: paymentMethods,
    history: paymentHistory,
    receipts: successfulPayments.map((record) => ({
      id: record.id,
      paymentRecordId: record.id,
      bookingId: record.bookingId,
      title: record.description || "Booking payment receipt",
      amount: record.amount,
      currency: record.currency,
      receiptUrl: record.receiptUrl,
      createdAt: record.createdAt,
      bookingServiceName: record.bookingServiceName,
      bookingVendorName: record.bookingVendorName
    })),
    outstandingBookings
  };
}

function addDaysToIsoDate(value, days) {
  const parsed = value ? new Date(value) : new Date();
  const baseDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  baseDate.setDate(baseDate.getDate() + Number(days || 0));
  return baseDate.toISOString().slice(0, 10);
}

function buildVendorBilling(user, paymentMethods = []) {
  const defaultMethod =
    paymentMethods.find((method) => method.isDefault) ||
    paymentMethods[0] ||
    null;
  const trialEndsAt = addDaysToIsoDate(user?.createdAt, 21);

  return {
    plan: {
      name: "Premium Plan",
      priceMonthly: 35,
      currency: "USD",
      status: defaultMethod ? "active" : "trialing",
      trialEndsAt,
      nextBillingDate: trialEndsAt,
      features: [
        "New Client Connections",
        "AI-powered Smart Pricing",
        "Enhanced marketplace placement",
        "AI-powered Marketing Suite",
        "Online booking and self-service tools",
        "Processing fees starting at 2.5% + $0.30",
        "Credit, debit, Tap-to-Pay, and card-on-file payments",
        "Deposits and cancellation policies",
        "Automated client communication",
        "Advanced scheduling and calendar tools",
        "Earnings insights and business reports",
        "Product sales"
      ]
    },
    paymentMethods,
    defaultPaymentMethod: defaultMethod
  };
}

function normalizeClientProfilePayload(payload) {
  const name = String(payload.name || "").trim();
  const phone = String(payload.phone || "").trim();

  if (!name) {
    throw new Error("Name is required.");
  }

  const phoneNormalized = normalizePhone(phone);

  if (phone && phoneNormalized.length < 10) {
    throw new Error("Enter a valid phone number.");
  }

  return {
    name,
    phone,
    phoneNormalized: phoneNormalized || null,
    city: String(payload.city || "").trim(),
    avatar: String(payload.avatar || "").trim()
  };
}

function normalizeNotificationPreferencesPayload(payload) {
  const quietHoursFrom = normalizeTwentyFourHourTime(payload.quietHoursFrom || "09:00", "09:00");
  const quietHoursTo = normalizeTwentyFourHourTime(payload.quietHoursTo || "22:00", "22:00");

  return {
    bookingUpdates: payload.bookingUpdates !== false,
    clientMessages: payload.clientMessages !== false,
    reminders: payload.reminders !== false,
    paymentAlerts: payload.paymentAlerts !== false,
    reviewRequests: payload.reviewRequests !== false,
    recommendations: payload.recommendations !== false,
    securityAlerts: payload.securityAlerts !== false,
    marketingTexts: payload.marketingTexts !== false,
    quietHoursEnabled: payload.quietHoursEnabled !== false,
    quietHoursFrom,
    quietHoursTo
  };
}

function normalizeTwentyFourHourTime(value, fallback) {
  const input = String(value || "").trim();

  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(input)) {
    return input;
  }

  return fallback;
}

function normalizePaymentMethodPayload(payload) {
  const brand = String(payload.brand || "").trim();
  const last4 = String(payload.last4 || "").replace(/\D/g, "").slice(-4);
  const expMonth = Number(payload.expMonth || 0);
  const expYear = Number(payload.expYear || 0);
  const holderName = String(payload.holderName || "").trim();

  if (!brand) {
    throw new Error("Card brand is required.");
  }

  if (last4.length !== 4) {
    throw new Error("Enter the last 4 digits of the card.");
  }

  if (!Number.isInteger(expMonth) || expMonth < 1 || expMonth > 12) {
    throw new Error("Enter a valid expiry month.");
  }

  if (!Number.isInteger(expYear) || expYear < new Date().getFullYear()) {
    throw new Error("Enter a valid expiry year.");
  }

  return {
    provider: "stripe",
    brand,
    last4,
    expMonth,
    expYear,
    holderName,
    isDefault: Boolean(payload.isDefault)
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

async function getUserRowByPhoneNormalized(phoneNormalized) {
  const result = await queryPostgres(
    `
      SELECT *
      FROM users
      WHERE phone_normalized = $1
         OR REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '', 'g') = $1
      LIMIT 1
    `,
    [phoneNormalized]
  );
  return result.rows[0] || null;
}

async function recordUserSignIn(userId) {
  const result = await queryPostgres(
    `
      UPDATE users
      SET last_signin_at = NOW(),
          signin_count = COALESCE(signin_count, 0) + 1,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [userId]
  );

  return result.rows[0] || null;
}

async function getBookingRowById(bookingId) {
  const result = await queryPostgres(`SELECT * FROM bookings WHERE id = $1 LIMIT 1`, [bookingId]);
  return result.rows[0] || null;
}

async function getBookingRowsForClient(user) {
  if (user?.email) {
    const result = await queryPostgres(
      `
        SELECT *
        FROM bookings
        WHERE customer_id = $1 OR LOWER(customer_email) = LOWER($2)
        ORDER BY appointment_date ASC, created_at DESC
      `,
      [user.id, user.email]
    );
    return result.rows;
  }

  const result = await queryPostgres(
    `
      SELECT *
      FROM bookings
      WHERE customer_id = $1
      ORDER BY appointment_date ASC, created_at DESC
    `,
    [user.id]
  );
  return result.rows;
}

async function getFavoriteVendorRowsByUserId(userId) {
  const result = await queryPostgres(
    `
      SELECT
        vendor_profiles.*,
        client_favorites.created_at AS favorite_created_at
      FROM client_favorites
      INNER JOIN vendor_profiles ON vendor_profiles.slug = client_favorites.vendor_slug
      WHERE client_favorites.user_id = $1
      ORDER BY client_favorites.created_at DESC
    `,
    [userId]
  );
  return result.rows;
}

async function getNotificationRowsByUserId(userId) {
  const result = await queryPostgres(
    `
      SELECT *
      FROM client_notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
    `,
    [userId]
  );
  return result.rows;
}

async function getPaymentMethodRowsByUserId(userId) {
  const result = await queryPostgres(
    `
      SELECT *
      FROM client_payment_methods
      WHERE user_id = $1
      ORDER BY is_default DESC, created_at DESC
    `,
    [userId]
  );
  return result.rows;
}

async function getPaymentRecordRowsByUserId(userId) {
  const result = await queryPostgres(
    `
      SELECT
        client_payment_records.*,
        bookings.service_name AS booking_service_name,
        bookings.vendor_name AS booking_vendor_name,
        bookings.vendor_slug AS booking_vendor_slug,
        bookings.appointment_date AS booking_appointment_date,
        client_payment_methods.brand AS payment_method_brand,
        client_payment_methods.last4 AS payment_method_last4
      FROM client_payment_records
      LEFT JOIN bookings ON bookings.id = client_payment_records.booking_id
      LEFT JOIN client_payment_methods ON client_payment_methods.id = client_payment_records.payment_method_id
      WHERE client_payment_records.user_id = $1
      ORDER BY client_payment_records.created_at DESC
    `,
    [userId]
  );
  return result.rows;
}

async function getNotificationPreferencesRowByUserId(userId) {
  const result = await queryPostgres(
    `
      SELECT *
      FROM client_notification_preferences
      WHERE user_id = $1
      LIMIT 1
    `,
    [userId]
  );
  return result.rows[0] || null;
}

async function ensureNotificationPreferencesRow(userId) {
  let row = await getNotificationPreferencesRowByUserId(userId);

  if (row) {
    return row;
  }

  const inserted = await queryPostgres(
    `
      INSERT INTO client_notification_preferences (
        user_id, booking_updates, reminders, recommendations, security_alerts, updated_at
      ) VALUES ($1, TRUE, TRUE, TRUE, TRUE, NOW())
      ON CONFLICT (user_id) DO UPDATE SET updated_at = client_notification_preferences.updated_at
      RETURNING *
    `,
    [userId]
  );

  row = inserted.rows[0];
  return row || null;
}

async function getAuthSessionRowById(sessionId) {
  const result = await queryPostgres(
    `
      SELECT *
      FROM auth_sessions
      WHERE id = $1
      LIMIT 1
    `,
    [sessionId]
  );
  return result.rows[0] || null;
}

async function createClientNotification(payload) {
  const record = {
    id: payload.id || `ntf-${randomUUID()}`,
    userId: payload.userId,
    type: payload.type || "info",
    title: String(payload.title || "").trim(),
    message: String(payload.message || "").trim(),
    ctaLabel: String(payload.ctaLabel || "").trim(),
    ctaHref: String(payload.ctaHref || "").trim(),
    metadata: payload.metadata || {},
    readAt: payload.readAt || null,
    createdAt: payload.createdAt || new Date().toISOString(),
    updatedAt: payload.updatedAt || payload.createdAt || new Date().toISOString()
  };

  if (!record.userId || !record.title || !record.message) {
    return null;
  }

  if (!hasDatabase) {
    const store = getDemoStore();

    if (!Array.isArray(store.notifications)) {
      store.notifications = [];
    }

    store.notifications.unshift(record);
    return record;
  }

  const { rows } = await queryPostgres(
    `
      INSERT INTO client_notifications (
        id, user_id, type, title, message, cta_label, cta_href, metadata,
        read_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8::jsonb,
        $9, $10, $11
      )
      RETURNING *
    `,
    [
      record.id,
      record.userId,
      record.type,
      record.title,
      record.message,
      record.ctaLabel || "",
      record.ctaHref || "",
      JSON.stringify(record.metadata || {}),
      record.readAt,
      record.createdAt,
      record.updatedAt
    ]
  );

  return mapClientNotificationRow(rows[0]);
}

export async function createVendorNotification(payload) {
  const record = {
    id: payload.id || `vntf-${randomUUID()}`,
    vendorSlug: String(payload.vendorSlug || "").trim(),
    type: payload.type || "info",
    title: String(payload.title || "").trim(),
    message: String(payload.message || "").trim(),
    bookingId: String(payload.bookingId || "").trim(),
    conversationId: String(payload.conversationId || "").trim(),
    clientName: String(payload.clientName || "").trim(),
    clientAvatar: String(payload.clientAvatar || "").trim(),
    serviceName: String(payload.serviceName || "").trim(),
    appointmentDate: normalizeDateOnly(payload.appointmentDate),
    appointmentSlot: String(payload.appointmentSlot || "").trim(),
    metadata: payload.metadata || {},
    readAt: payload.readAt || null,
    createdAt: payload.createdAt || new Date().toISOString(),
    updatedAt: payload.updatedAt || payload.createdAt || new Date().toISOString()
  };

  if (!record.vendorSlug || !record.title || !record.message) {
    return null;
  }

  if (!hasDatabase) {
    const store = getDemoStore();

    if (!Array.isArray(store.vendorNotifications)) {
      store.vendorNotifications = [];
    }

    store.vendorNotifications.unshift(record);
    return mapVendorNotificationRow(record);
  }

  const { rows } = await queryPostgres(
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
      RETURNING *
    `,
    [
      record.id,
      record.vendorSlug,
      record.type,
      record.title,
      record.message,
      record.bookingId || "",
      record.conversationId || "",
      record.clientName || "",
      record.clientAvatar || "",
      record.serviceName || "",
      record.appointmentDate || null,
      record.appointmentSlot || "",
      JSON.stringify(record.metadata || {}),
      record.readAt,
      record.createdAt,
      record.updatedAt
    ]
  );

  return mapVendorNotificationRow(rows[0]);
}

export async function listVendorNotificationsForUser(user) {
  assertVendorUser(user);

  if (!hasDatabase) {
    const notifications = (getDemoStore().vendorNotifications || [])
      .filter((item) => item.vendorSlug === user.vendorSlug)
      .map(mapVendorNotificationRow);

    return buildVendorNotificationsPreview(notifications);
  }

  const { rows } = await queryPostgres(
    `
      SELECT *
      FROM vendor_notifications
      WHERE vendor_slug = $1
      ORDER BY created_at DESC
    `,
    [user.vendorSlug]
  );

  return buildVendorNotificationsPreview(rows.map(mapVendorNotificationRow));
}

export async function markVendorNotificationRead(user, notificationId) {
  assertVendorUser(user);

  if (!hasDatabase) {
    const store = getDemoStore();
    const notification = (store.vendorNotifications || []).find(
      (item) => item.id === notificationId && item.vendorSlug === user.vendorSlug
    );

    if (!notification) {
      throw new Error("Notification not found.");
    }

    notification.readAt = notification.readAt || new Date().toISOString();
    notification.updatedAt = new Date().toISOString();
    return mapVendorNotificationRow(notification);
  }

  const { rows } = await queryPostgres(
    `
      UPDATE vendor_notifications
      SET read_at = COALESCE(read_at, NOW()),
          updated_at = NOW()
      WHERE id = $1 AND vendor_slug = $2
      RETURNING *
    `,
    [notificationId, user.vendorSlug]
  );

  if (!rows.length) {
    throw new Error("Notification not found.");
  }

  return mapVendorNotificationRow(rows[0]);
}

export async function markAllVendorNotificationsRead(user) {
  assertVendorUser(user);

  if (!hasDatabase) {
    const now = new Date().toISOString();
    (getDemoStore().vendorNotifications || []).forEach((item) => {
      if (item.vendorSlug === user.vendorSlug && !item.readAt) {
        item.readAt = now;
        item.updatedAt = now;
      }
    });

    return listVendorNotificationsForUser(user);
  }

  await queryPostgres(
    `
      UPDATE vendor_notifications
      SET read_at = COALESCE(read_at, NOW()),
          updated_at = NOW()
      WHERE vendor_slug = $1 AND read_at IS NULL
    `,
    [user.vendorSlug]
  );

  return listVendorNotificationsForUser(user);
}

async function createVendorBookingNotification(booking, payload = {}) {
  if (!booking?.vendorSlug) {
    return null;
  }

  return createVendorNotification({
    vendorSlug: booking.vendorSlug,
    bookingId: booking.id,
    clientName: booking.customerName || "",
    serviceName: booking.serviceName || "",
    appointmentDate: booking.appointmentDate,
    appointmentSlot: booking.appointmentSlot,
    ...payload,
    metadata: {
      bookingId: booking.id,
      vendorSlug: booking.vendorSlug,
      customerEmail: booking.customerEmail || "",
      customerPhone: booking.customerPhone || "",
      bookingStatus: booking.status || "",
      ...(payload.metadata || {})
    }
  });
}

function mapFavoriteVendor(vendor, favoriteCreatedAt) {
  return {
    ...vendor,
    favoriteCreatedAt: favoriteCreatedAt || null
  };
}

function buildRescheduleWindows(vendor, vendorBookings, ignoredBookingId) {
  return buildLiveBookingWindows(vendor, vendorBookings, {
    ignoredBookingId,
    minLeadHours: 24,
    daysAhead: 45,
    maxWindows: 12
  });
}

async function getClientBookingById(user, bookingId) {
  const booking = !hasDatabase
    ? getDemoStore().bookings.find((item) => String(item.id) === String(bookingId))
    : mapBookingRow(await getBookingRowById(bookingId));

  if (!booking) {
    throw new Error("Booking not found.");
  }

  const ownsBooking =
    booking.customerId === user.id ||
    (user.email && normalizeEmail(booking.customerEmail) === normalizeEmail(user.email));

  if (!ownsBooking) {
    throw new Error("Booking not found.");
  }

  return decorateClientBooking(booking);
}

function decorateConversationRecord(conversation, booking, messages = []) {
  return mapConversationRow({
    ...conversation,
    booking_id: conversation.bookingId || booking?.id,
    vendor_slug: conversation.vendorSlug || booking?.vendorSlug,
    client_id: conversation.clientId || booking?.customerId || null,
    vendor_unread_count: conversation.vendorUnreadCount || 0,
    client_unread_count: conversation.clientUnreadCount || 0,
    last_message_at: conversation.lastMessageAt || messages[messages.length - 1]?.createdAt || null,
    created_at: conversation.createdAt,
    updated_at: conversation.updatedAt,
    vendor_name: booking?.vendorName || "",
    customer_name: booking?.customerName || "",
    customer_email: booking?.customerEmail || "",
    service_name: booking?.serviceName || "",
    appointment_date: booking?.appointmentDate || "",
    appointment_slot: booking?.appointmentSlot || "",
    booking_status: booking?.status || "",
    last_message_preview: messages[messages.length - 1]?.body || ""
  });
}

function userCanAccessConversation(user, conversation) {
  if (!user || !conversation) {
    return false;
  }

  if (user.role === "vendor") {
    return user.vendorSlug === conversation.vendorSlug;
  }

  if (user.role === "client") {
    return (
      conversation.clientId === user.id ||
      (user.email && normalizeEmail(conversation.customerEmail) === normalizeEmail(user.email))
    );
  }

  return false;
}

async function createOrGetBookingConversation(booking) {
  if (!booking?.id) {
    return null;
  }

  if (!hasDatabase) {
    const store = getDemoStore();

    if (!Array.isArray(store.conversations)) {
      store.conversations = [];
    }

    const existing = store.conversations.find((item) => item.bookingId === booking.id);

    if (existing) {
      return decorateConversationRecord(
        existing,
        booking,
        (store.messages || []).filter((item) => item.conversationId === existing.id)
      );
    }

    const record = {
      id: `conv-${randomUUID()}`,
      bookingId: booking.id,
      vendorSlug: booking.vendorSlug,
      clientId: booking.customerId || null,
      vendorUnreadCount: 0,
      clientUnreadCount: 0,
      lastMessageAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    store.conversations.unshift(record);
    return decorateConversationRecord(record, booking, []);
  }

  const existing = await getConversationRowByBookingId(booking.id);

  if (existing) {
    return mapConversationRow(existing);
  }

  const record = {
    id: `conv-${randomUUID()}`,
    bookingId: booking.id,
    vendorSlug: booking.vendorSlug,
    clientId: booking.customerId || null
  };

  const { rows } = await queryPostgres(
    `
      INSERT INTO booking_conversations (
        id, booking_id, vendor_slug, client_id, vendor_unread_count, client_unread_count,
        last_message_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 0, 0, NULL, NOW(), NOW())
      RETURNING *
    `,
    [record.id, record.bookingId, record.vendorSlug, record.clientId]
  );

  return mapConversationRow(rows[0]);
}

async function listBookingConversationsForUser(user) {
  if (!user) {
    return [];
  }

  if (!hasDatabase) {
    const store = getDemoStore();
    const conversations = (store.conversations || [])
      .map((conversation) => {
        const booking = conversation.bookingId
          ? (store.bookings || []).find((item) => item.id === conversation.bookingId)
          : null;
        const messages = (store.messages || []).filter((item) => item.conversationId === conversation.id);
        return decorateConversationRecord(conversation, booking, messages);
      })
      .filter(Boolean)
      .filter((conversation) => userCanAccessConversation(user, conversation))
      .sort(
        (left, right) =>
          new Date(right.lastMessageAt || right.createdAt || 0).getTime() -
          new Date(left.lastMessageAt || left.createdAt || 0).getTime()
      );

    return conversations;
  }

  const rows =
    user.role === "vendor"
      ? await getConversationRowsByVendorSlug(user.vendorSlug)
      : await getConversationRowsForClient(user);

  return rows.map(mapConversationRow);
}

async function markConversationReadForUser(user, conversation) {
  if (!user || !conversation) {
    return;
  }

  const readAt = new Date().toISOString();

  if (!hasDatabase) {
    const store = getDemoStore();

    if (Array.isArray(store.messages)) {
      store.messages.forEach((message) => {
        if (
          message.conversationId === conversation.id &&
          message.senderRole !== user.role &&
          !message.readAt
        ) {
          message.readAt = readAt;
          message.updatedAt = readAt;
        }
      });
    }

    const existingConversation = (store.conversations || []).find((item) => item.id === conversation.id);

    if (existingConversation) {
      if (user.role === "vendor") {
        existingConversation.vendorUnreadCount = 0;
      } else if (user.role === "client") {
        existingConversation.clientUnreadCount = 0;
      }
      existingConversation.updatedAt = readAt;
    }

    return;
  }

  const unreadField = user.role === "vendor" ? "vendor_unread_count" : "client_unread_count";

  await withPostgresTransaction(async (db) => {
    await db.query(
      `
        UPDATE booking_messages
        SET read_at = COALESCE(read_at, NOW()),
            updated_at = NOW()
        WHERE conversation_id = $1
          AND sender_role <> $2
          AND read_at IS NULL
      `,
      [conversation.id, user.role]
    );

    await db.query(
      `
        UPDATE booking_conversations
        SET ${unreadField} = 0,
            updated_at = NOW()
        WHERE id = $1
      `,
      [conversation.id]
    );
  });
}

export async function getBookingConversationForUser(user, conversationId) {
  if (!user) {
    throw new Error("Unauthorized.");
  }

  if (!hasDatabase) {
    const store = getDemoStore();
    const rawConversation = (store.conversations || []).find((item) => String(item.id) === String(conversationId));

    if (!rawConversation) {
      throw new Error("Conversation not found.");
    }

    const booking = rawConversation.bookingId
      ? (store.bookings || []).find((item) => item.id === rawConversation.bookingId)
      : null;
    const messages = (store.messages || [])
      .filter((item) => item.conversationId === rawConversation.id)
      .map(mapBookingMessageRow);
    const conversation = decorateConversationRecord(rawConversation, booking, messages);

    if (!userCanAccessConversation(user, conversation)) {
      throw new Error("Conversation not found.");
    }

    await markConversationReadForUser(user, conversation);
    const refreshedConversation = await listBookingConversationsForUser(user).then((items) =>
      items.find((item) => item.id === conversation.id)
    );

    return {
      conversation: refreshedConversation || conversation,
      messages: (store.messages || [])
        .filter((item) => item.conversationId === rawConversation.id)
        .map(mapBookingMessageRow)
    };
  }

  const row = await getConversationRowById(conversationId);

  if (!row) {
    throw new Error("Conversation not found.");
  }

  const conversation = mapConversationRow(row);

  if (!userCanAccessConversation(user, conversation)) {
    throw new Error("Conversation not found.");
  }

  await markConversationReadForUser(user, conversation);
  const messages = (await getMessageRowsByConversationId(conversationId)).map(mapBookingMessageRow);

  return {
    conversation,
    messages
  };
}

export async function ensureBookingConversationForUser(user, bookingId) {
  if (!user) {
    throw new Error("Unauthorized.");
  }

  const booking =
    user.role === "vendor"
      ? await getVendorBookingById(user, bookingId)
      : await getClientBookingById(user, bookingId);
  const conversation = await createOrGetBookingConversation(booking);

  if (!userCanAccessConversation(user, conversation)) {
    throw new Error("Conversation not found.");
  }

  return getBookingConversationForUser(user, conversation.id);
}

export async function ensureDirectConversation(clientUser, vendorSlug) {
  if (!clientUser || clientUser.role !== "client") {
    throw new Error("Only clients can start direct conversations.");
  }

  if (!vendorSlug) {
    throw new Error("Vendor slug is required.");
  }

  if (!hasDatabase) {
    const store = getDemoStore();

    if (!Array.isArray(store.conversations)) {
      store.conversations = [];
    }

    const existing = store.conversations.find(
      (item) => !item.bookingId && item.vendorSlug === vendorSlug && item.clientId === clientUser.id
    );

    if (existing) {
      const messages = (store.messages || []).filter((item) => item.conversationId === existing.id);
      return decorateConversationRecord(existing, null, messages);
    }

    const record = {
      id: `conv-${randomUUID()}`,
      bookingId: null,
      vendorSlug,
      clientId: clientUser.id,
      vendorUnreadCount: 0,
      clientUnreadCount: 0,
      lastMessageAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    store.conversations.push(record);
    return decorateConversationRecord(record, null, []);
  }

  const existingRow = await queryPostgres(
    `SELECT * FROM booking_conversations WHERE booking_id IS NULL AND vendor_slug = $1 AND client_id = $2 LIMIT 1`,
    [vendorSlug, clientUser.id]
  );

  if (existingRow.rows[0]) {
    return getBookingConversationForUser(clientUser, existingRow.rows[0].id);
  }

  const id = `conv-${randomUUID()}`;

  await queryPostgres(
    `
      INSERT INTO booking_conversations (id, booking_id, vendor_slug, client_id, vendor_unread_count, client_unread_count, created_at, updated_at)
      VALUES ($1, NULL, $2, $3, 0, 0, NOW(), NOW())
    `,
    [id, vendorSlug, clientUser.id]
  );

  return getBookingConversationForUser(clientUser, id);
}

export async function sendBookingMessage(user, conversationId, payload) {
  if (!user) {
    throw new Error("Unauthorized.");
  }

  const body = String(payload.body || "").trim();

  if (!body) {
    throw new Error("Message cannot be empty.");
  }

  const { conversation } = await getBookingConversationForUser(user, conversationId);
  const sentAt = new Date().toISOString();

  if (!hasDatabase) {
    const store = getDemoStore();
    const message = {
      id: `msg-${randomUUID()}`,
      conversationId: conversation.id,
      bookingId: conversation.bookingId,
      senderId: user.id || null,
      senderRole: user.role === "vendor" ? "vendor" : "client",
      body,
      readAt: null,
      createdAt: sentAt,
      updatedAt: sentAt
    };

    if (!Array.isArray(store.messages)) {
      store.messages = [];
    }

    store.messages.push(message);

    const currentConversation = (store.conversations || []).find((item) => item.id === conversation.id);

    if (currentConversation) {
      currentConversation.lastMessageAt = sentAt;
      currentConversation.updatedAt = sentAt;
      if (user.role === "vendor") {
        currentConversation.clientUnreadCount = Number(currentConversation.clientUnreadCount || 0) + 1;
      } else {
        currentConversation.vendorUnreadCount = Number(currentConversation.vendorUnreadCount || 0) + 1;
      }
    }
  } else {
    const unreadField = user.role === "vendor" ? "client_unread_count" : "vendor_unread_count";

    await withPostgresTransaction(async (db) => {
      await db.query(
        `
          INSERT INTO booking_messages (
            id, conversation_id, booking_id, sender_id, sender_role, body, read_at, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, NULL, NOW(), NOW())
        `,
        [
          `msg-${randomUUID()}`,
          conversation.id,
          conversation.bookingId,
          user.id || null,
          user.role === "vendor" ? "vendor" : "client",
          body
        ]
      );

      await db.query(
        `
          UPDATE booking_conversations
          SET ${unreadField} = ${unreadField} + 1,
              last_message_at = NOW(),
              updated_at = NOW()
          WHERE id = $1
        `,
        [conversation.id]
      );
    });
  }

  const isDirect = !conversation.bookingId;

  // Fire notifications in the background — don't block the response
  if (user.role === "vendor" && conversation.clientId) {
    createClientNotification({
      userId: conversation.clientId,
      type: isDirect ? "direct_message" : "booking_message",
      title: isDirect ? "New direct message" : "New message from your stylist",
      message: isDirect
        ? `${conversation.vendorName} sent you a message.`
        : `${conversation.vendorName} sent an update about your ${conversation.serviceName} booking.`,
      ctaLabel: "Open messages",
      ctaHref: "/dashboard?tab=messages",
      metadata: { conversationId: conversation.id, bookingId: conversation.bookingId }
    }).catch(() => {
      // Notification failure is non-critical
    });
  }

  if (user.role !== "vendor") {
    createVendorNotification({
      vendorSlug: conversation.vendorSlug,
      type: isDirect ? "direct_message" : "booking_message",
      title: isDirect ? "New direct message" : "New client message",
      message: isDirect
        ? `${conversation.customerName || "A client"} sent you a direct message.`
        : `${conversation.customerName || "A client"} sent a message about ${conversation.serviceName}.`,
      bookingId: conversation.bookingId,
      conversationId: conversation.id,
      clientName: conversation.customerName || "Client",
      serviceName: conversation.serviceName,
      appointmentDate: conversation.appointmentDate,
      appointmentSlot: conversation.appointmentSlot,
      metadata: {
        conversationId: conversation.id,
        bookingId: conversation.bookingId,
        preview: body
      }
    }).catch(() => {
      // Notification failure is non-critical
    });
  }

  return getBookingConversationForUser(user, conversationId);
}

async function getVendorBookingsForReschedule(vendorSlug) {
  if (!hasDatabase) {
    return getDemoStore().bookings
      .filter((booking) => booking.vendorSlug === vendorSlug)
      .map(decorateClientBooking);
  }

  const rows = await getBookingRowsByVendorSlug(vendorSlug);
  return rows.map(mapBookingRow).map(decorateClientBooking);
}

async function getVendorBookingById(user, bookingId) {
  assertVendorUser(user);
  const booking = !hasDatabase
    ? getDemoStore().bookings.find((item) => String(item.id) === String(bookingId))
    : mapBookingRow(await getBookingRowById(bookingId));

  if (!booking || booking.vendorSlug !== user.vendorSlug) {
    throw new Error("Booking not found.");
  }

  return booking;
}

export async function getStylistAvailability(slug, options = {}) {
  const stylist = await getStylistBySlug(slug);

  if (!stylist) {
    throw new Error("Stylist not found.");
  }

  const serviceId = String(options.serviceId || "").trim();
  const service = serviceId
    ? stylist.services.find((item) => String(item.id) === serviceId)
    : stylist.services[0];

  if (!service) {
    throw new Error("Service not found.");
  }

  const vendorBookings = await getVendorBookingsForReschedule(slug);
  const windows = buildLiveBookingWindows(stylist, vendorBookings, {
    ignoredBookingId: String(options.ignoredBookingId || ""),
    minLeadHours: Number(options.minLeadHours || 0),
    daysAhead: Number(options.daysAhead || 45),
    maxWindows: Number(options.maxWindows || 12)
  });

  const view = String(options.view || "").toLowerCase();
  const includeMonth = view === "month" || options.includeMonth === true;
  let month = null;

  if (includeMonth) {
    const referenceDate = String(options.referenceDate || "").trim();
    const ignoredBookingId = String(options.ignoredBookingId || "");
    const filteredBookings = vendorBookings.filter((booking) => booking.id !== ignoredBookingId);
    const snapshot = buildVendorAvailabilitySnapshot(
      stylist,
      stylist.services || [],
      filteredBookings,
      {
        referenceDate,
        view: "month",
        timezone: options.timezone
      }
    );

    month = {
      referenceDate: snapshot.referenceDate,
      rangeStart: snapshot.rangeStart,
      rangeEnd: snapshot.rangeEnd,
      rangeLabel: snapshot.rangeLabel,
      days: snapshot.days.map((day) => ({
        date: day.date,
        weekdayShort: day.weekdayShort,
        dayNumber: day.dayNumber,
        monthShort: day.monthShort,
        isToday: day.isToday,
        isCurrentMonth: day.isCurrentMonth,
        slotCount: day.slotCount,
        status: day.status,
        slots: day.freeSlots
      }))
    };
  }

  return {
    vendorSlug: stylist.slug,
    service,
    windows,
    month
  };
}

async function buildClientDashboardPayload(user) {
  const clientUser = await getUserById(user.id);
  const safeUser = clientUser || user;

  if (!hasDatabase) {
    const store = getDemoStore();
    const bookings = store.bookings
      .filter(
        (booking) =>
          booking.customerId === safeUser.id ||
          (safeUser.email && normalizeEmail(booking.customerEmail) === normalizeEmail(safeUser.email))
      )
      .map(decorateClientBooking);
    const favoriteSlugs = new Set(
      (store.favorites || [])
        .filter((item) => item.userId === safeUser.id)
        .map((item) => item.vendorSlug)
    );
    const favorites = (store.favorites || [])
      .filter((item) => item.userId === safeUser.id)
      .map((favorite) => {
        const vendor = store.vendors.find((item) => item.slug === favorite.vendorSlug);
        return vendor ? mapFavoriteVendor(hydrateVendorWindows(vendor), favorite.createdAt) : null;
      })
      .filter(Boolean);
    const notifications = (store.notifications || [])
      .filter((item) => item.userId === safeUser.id)
      .map(mapClientNotificationRow);
    const paymentMethods = (store.paymentMethods || [])
      .filter((item) => item.userId === safeUser.id)
      .map(mapPaymentMethodRow)
      .sort((left, right) => Number(right.isDefault) - Number(left.isDefault));
    const paymentHistory = (store.paymentRecords || [])
      .filter((item) => item.userId === safeUser.id)
      .map(mapPaymentRecordRow)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
    const preferences = mapNotificationPreferencesRow(
      (store.notificationPreferences || []).find((item) => item.userId === safeUser.id) || null
    );
    const recommendations = store.vendors
      .filter((vendor) => vendor.status === "active" && !favoriteSlugs.has(vendor.slug))
      .slice(0, 4)
      .map((vendor) => hydrateVendorWindows(vendor));
    const upcomingBookings = sortBookings(bookings.filter((booking) => booking.isUpcoming), "asc");
    const pastBookings = sortBookings(bookings.filter((booking) => booking.isPast), "desc");
    const conversations = await listBookingConversationsForUser(safeUser);

    return {
      kind: "client",
      overview: buildClientOverview(upcomingBookings, pastBookings, favorites, notifications),
      payments: buildClientPayments(bookings, paymentMethods, paymentHistory),
      bookings: sortBookings(bookings, "asc"),
      upcomingBookings,
      pastBookings,
      favorites,
      notifications,
      notificationPreferences: preferences,
      profile: buildClientProfile(safeUser),
      recommendations,
      conversations
    };
  }

  const [bookingRows, favoriteRows, notificationRows, paymentMethodRows, paymentRecordRows, preferenceRow, recommendations] = await Promise.all([
    getBookingRowsForClient(safeUser),
    getFavoriteVendorRowsByUserId(safeUser.id),
    getNotificationRowsByUserId(safeUser.id),
    getPaymentMethodRowsByUserId(safeUser.id),
    getPaymentRecordRowsByUserId(safeUser.id),
    ensureNotificationPreferencesRow(safeUser.id),
    getFeaturedStylists()
  ]);

  const bookings = bookingRows.map(mapBookingRow).map(decorateClientBooking);
  const upcomingBookings = sortBookings(bookings.filter((booking) => booking.isUpcoming), "asc");
  const pastBookings = sortBookings(bookings.filter((booking) => booking.isPast), "desc");
  const favorites = favoriteRows.map((row) =>
    mapFavoriteVendor(mapVendorRow(row), toIsoString(row.favorite_created_at))
  );
  const favoriteSlugs = new Set(favorites.map((item) => item.slug));
  const notifications = notificationRows.map(mapClientNotificationRow);
  const paymentMethods = paymentMethodRows.map(mapPaymentMethodRow);
  const paymentHistory = paymentRecordRows.map(mapPaymentRecordRow);
  const conversations = await listBookingConversationsForUser(safeUser);

  return {
    kind: "client",
    overview: buildClientOverview(upcomingBookings, pastBookings, favorites, notifications),
    payments: buildClientPayments(bookings, paymentMethods, paymentHistory),
    bookings: sortBookings(bookings, "asc"),
    upcomingBookings,
    pastBookings,
    favorites,
    notifications,
    notificationPreferences: mapNotificationPreferencesRow(preferenceRow),
    profile: buildClientProfile(safeUser),
    recommendations: recommendations.filter((vendor) => !favoriteSlugs.has(vendor.slug)).slice(0, 4),
    conversations
  };
}

async function issuePhoneOtpSession(phone, phoneNormalized) {
  const code = generateOtpCode();
  const codeHash = createOtpHash(code, phoneNormalized);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString();

  if (!hasDatabase) {
    const sessions = getDemoPhoneOtpSessions();

    sessions.forEach((session) => {
      if (session.phoneNormalized === phoneNormalized && !session.consumedAt) {
        session.consumedAt = new Date().toISOString();
      }
    });

    sessions.unshift({
      id: `otp-${Date.now()}`,
      phone,
      phoneNormalized,
      codeHash,
      attemptsRemaining: 5,
      expiresAt,
      consumedAt: null
    });

    return {
      phone,
      expiresIn: OTP_TTL_SECONDS
    };
  }

  await withPostgresTransaction(async (db) => {
    await db.query(
      `
        UPDATE phone_otp_sessions
        SET consumed_at = NOW(),
            updated_at = NOW()
        WHERE phone_normalized = $1 AND consumed_at IS NULL
      `,
      [phoneNormalized]
    );

    await db.query(
      `
        INSERT INTO phone_otp_sessions (
          id, phone, phone_normalized, code_hash, attempts_remaining, expires_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `,
      [`otp-${Date.now()}`, phone, phoneNormalized, codeHash, 5, expiresAt]
    );
  });

  return {
    phone,
    expiresIn: OTP_TTL_SECONDS
  };
}

async function issuePasswordResetOtpSession(email, emailNormalized) {
  const code = generateOtpCode();
  const codeHash = createOtpHash(code, emailNormalized);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString();

  if (!hasDatabase) {
    const sessions = getDemoPasswordResetSessions();
    const consumedAt = new Date().toISOString();

    sessions.forEach((session) => {
      if (session.emailNormalized === emailNormalized && !session.consumedAt) {
        session.consumedAt = consumedAt;
      }
    });

    sessions.unshift({
      id: `pwd-reset-${randomUUID()}`,
      email,
      emailNormalized,
      codeHash,
      attemptsRemaining: 5,
      expiresAt,
      verifiedAt: null,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
      consumedAt: null
    });

    return {
      email,
      expiresIn: OTP_TTL_SECONDS,
      code
    };
  }

  await withPostgresTransaction(async (db) => {
    await db.query(
      `
        UPDATE password_reset_sessions
        SET consumed_at = NOW(),
            updated_at = NOW()
        WHERE email_normalized = $1 AND consumed_at IS NULL
      `,
      [emailNormalized]
    );

    await db.query(
      `
        INSERT INTO password_reset_sessions (
          id, email, email_normalized, code_hash, attempts_remaining, expires_at, created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `,
      [`pwd-reset-${randomUUID()}`, email, emailNormalized, codeHash, 5, expiresAt]
    );
  });

  return {
    email,
    expiresIn: OTP_TTL_SECONDS,
    code
  };
}

async function consumePhoneOtpSession(phone, code) {
  const submittedPhone = String(phone || "").trim();
  const phoneNormalized = normalizePhone(submittedPhone);
  const normalizedCode = String(code || "").replace(/\D/g, "").slice(0, OTP_LENGTH);

  if (phoneNormalized.length < 10) {
    throw new Error("Enter a valid phone number.");
  }

  if (normalizedCode.length !== OTP_LENGTH) {
    throw new Error(`Enter the ${OTP_LENGTH}-digit verification code.`);
  }

  if (!hasDatabase) {
    const sessions = getDemoPhoneOtpSessions();
    const activeSession = sessions.find(
      (session) => session.phoneNormalized === phoneNormalized && !session.consumedAt
    );

    if (!activeSession) {
      throw new Error("Request a fresh verification code first.");
    }

    if (new Date(activeSession.expiresAt).getTime() <= Date.now()) {
      throw new Error("This code has expired. Request a new one.");
    }

    if (activeSession.codeHash !== createOtpHash(normalizedCode, phoneNormalized)) {
      activeSession.attemptsRemaining = Math.max(0, Number(activeSession.attemptsRemaining || 0) - 1);

      if (!activeSession.attemptsRemaining) {
        activeSession.consumedAt = new Date().toISOString();
        throw new Error("Too many incorrect attempts. Request a new code.");
      }

      throw new Error(
        `Incorrect code. ${activeSession.attemptsRemaining} attempt${activeSession.attemptsRemaining === 1 ? "" : "s"} left.`
      );
    }

    activeSession.consumedAt = new Date().toISOString();

    return {
      phone: activeSession.phone || submittedPhone,
      phoneNormalized
    };
  }

  return withPostgresTransaction(async (db) => {
    const sessionResult = await db.query(
      `
        SELECT *
        FROM phone_otp_sessions
        WHERE phone_normalized = $1 AND consumed_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
      `,
      [phoneNormalized]
    );
    const activeSession = sessionResult.rows[0];

    if (!activeSession) {
      throw new Error("Request a fresh verification code first.");
    }

    if (new Date(activeSession.expires_at).getTime() <= Date.now()) {
      throw new Error("This code has expired. Request a new one.");
    }

    if (activeSession.code_hash !== createOtpHash(normalizedCode, phoneNormalized)) {
      const attemptsRemaining = Math.max(0, Number(activeSession.attempts_remaining || 0) - 1);

      await db.query(
        `
          UPDATE phone_otp_sessions
          SET attempts_remaining = $2,
              consumed_at = CASE WHEN $2 = 0 THEN NOW() ELSE consumed_at END,
              updated_at = NOW()
          WHERE id = $1
        `,
        [activeSession.id, attemptsRemaining]
      );

      if (!attemptsRemaining) {
        throw new Error("Too many incorrect attempts. Request a new code.");
      }

      throw new Error(
        `Incorrect code. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} left.`
      );
    }

    await db.query(
      `
        UPDATE phone_otp_sessions
        SET consumed_at = NOW(),
            updated_at = NOW()
        WHERE id = $1
      `,
      [activeSession.id]
    );

    return {
      phone: activeSession.phone || submittedPhone,
      phoneNormalized
    };
  });
}

async function verifyPasswordResetOtpSession(email, code) {
  const submittedEmail = normalizeEmail(email);
  const normalizedCode = String(code || "").replace(/\D/g, "").slice(0, OTP_LENGTH);

  if (!submittedEmail || !submittedEmail.includes("@")) {
    throw new Error("Enter a valid email address.");
  }

  if (isPhonePlaceholderEmail(submittedEmail)) {
    throw new Error("This account does not support email password reset.");
  }

  if (normalizedCode.length !== OTP_LENGTH) {
    throw new Error(`Enter the ${OTP_LENGTH}-digit verification code.`);
  }

  if (!hasDatabase) {
    const sessions = getDemoPasswordResetSessions();
    const activeSession = sessions.find(
      (session) => session.emailNormalized === submittedEmail && !session.consumedAt
    );

    if (!activeSession) {
      throw new Error("Request a fresh verification code first.");
    }

    if (new Date(activeSession.expiresAt).getTime() <= Date.now()) {
      throw new Error("This code has expired. Request a new one.");
    }

    if (activeSession.codeHash !== createOtpHash(normalizedCode, submittedEmail)) {
      activeSession.attemptsRemaining = Math.max(
        0,
        Number(activeSession.attemptsRemaining || 0) - 1
      );

      if (!activeSession.attemptsRemaining) {
        activeSession.consumedAt = new Date().toISOString();
        throw new Error("Too many incorrect attempts. Request a new code.");
      }

      throw new Error(
        `Incorrect code. ${activeSession.attemptsRemaining} attempt${activeSession.attemptsRemaining === 1 ? "" : "s"} left.`
      );
    }

    const resetToken = randomUUID();
    activeSession.verifiedAt = new Date().toISOString();
    activeSession.resetTokenHash = hashOpaqueToken(resetToken, submittedEmail);
    activeSession.resetTokenExpiresAt = new Date(
      Date.now() + PASSWORD_RESET_TOKEN_TTL_SECONDS * 1000
    ).toISOString();

    return {
      email: activeSession.email || submittedEmail,
      resetToken,
      expiresIn: PASSWORD_RESET_TOKEN_TTL_SECONDS
    };
  }

  return withPostgresTransaction(async (db) => {
    const sessionResult = await db.query(
      `
        SELECT *
        FROM password_reset_sessions
        WHERE email_normalized = $1 AND consumed_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
      `,
      [submittedEmail]
    );
    const activeSession = sessionResult.rows[0];

    if (!activeSession) {
      throw new Error("Request a fresh verification code first.");
    }

    if (new Date(activeSession.expires_at).getTime() <= Date.now()) {
      throw new Error("This code has expired. Request a new one.");
    }

    if (activeSession.code_hash !== createOtpHash(normalizedCode, submittedEmail)) {
      const attemptsRemaining = Math.max(0, Number(activeSession.attempts_remaining || 0) - 1);

      await db.query(
        `
          UPDATE password_reset_sessions
          SET attempts_remaining = $2,
              consumed_at = CASE WHEN $2 = 0 THEN NOW() ELSE consumed_at END,
              updated_at = NOW()
          WHERE id = $1
        `,
        [activeSession.id, attemptsRemaining]
      );

      if (!attemptsRemaining) {
        throw new Error("Too many incorrect attempts. Request a new code.");
      }

      throw new Error(
        `Incorrect code. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} left.`
      );
    }

    const resetToken = randomUUID();
    const resetTokenExpiresAt = new Date(
      Date.now() + PASSWORD_RESET_TOKEN_TTL_SECONDS * 1000
    ).toISOString();

    await db.query(
      `
        UPDATE password_reset_sessions
        SET verified_at = NOW(),
            reset_token_hash = $2,
            reset_token_expires_at = $3,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        activeSession.id,
        hashOpaqueToken(resetToken, activeSession.email_normalized || submittedEmail),
        resetTokenExpiresAt
      ]
    );

    return {
      email: activeSession.email || submittedEmail,
      resetToken,
      expiresIn: PASSWORD_RESET_TOKEN_TTL_SECONDS
    };
  });
}

async function consumePasswordResetToken(email, resetToken, password) {
  const submittedEmail = normalizeEmail(email);
  const submittedResetToken = String(resetToken || "").trim();

  if (!submittedEmail || !submittedEmail.includes("@")) {
    throw new Error("Enter a valid email address.");
  }

  if (isPhonePlaceholderEmail(submittedEmail)) {
    throw new Error("This account does not support email password reset.");
  }

  if (!submittedResetToken) {
    throw new Error("Verify your email code first.");
  }

  if (String(password || "").length < 8) {
    throw new Error("Your new password must be at least 8 characters.");
  }

  if (!hasDatabase) {
    const store = getDemoStore();
    const user = store.users.find((item) => normalizeEmail(item.email) === submittedEmail);

    if (!user) {
      throw new Error("No account found for this email.");
    }

    const session = getDemoPasswordResetSessions().find(
      (item) =>
        item.emailNormalized === submittedEmail &&
        !item.consumedAt &&
        item.resetTokenHash === hashOpaqueToken(submittedResetToken, submittedEmail)
    );

    if (!session || !session.verifiedAt) {
      throw new Error("This password reset session is no longer valid. Request a new code.");
    }

    if (new Date(session.resetTokenExpiresAt).getTime() <= Date.now()) {
      session.consumedAt = new Date().toISOString();
      throw new Error("Your reset session has expired. Request a new code.");
    }

    user.passwordHash = await hash(password, 10);

    const consumedAt = new Date().toISOString();
    getDemoPasswordResetSessions().forEach((item) => {
      if (item.emailNormalized === submittedEmail && !item.consumedAt) {
        item.consumedAt = consumedAt;
      }
    });

    return sanitizeUser(user);
  }

  return withPostgresTransaction(async (db) => {
    const sessionResult = await db.query(
      `
        SELECT *
        FROM password_reset_sessions
        WHERE email_normalized = $1
          AND reset_token_hash = $2
          AND consumed_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
        FOR UPDATE
      `,
      [submittedEmail, hashOpaqueToken(submittedResetToken, submittedEmail)]
    );
    const session = sessionResult.rows[0];

    if (!session || !session.verified_at) {
      throw new Error("This password reset session is no longer valid. Request a new code.");
    }

    if (new Date(session.reset_token_expires_at).getTime() <= Date.now()) {
      await db.query(
        `
          UPDATE password_reset_sessions
          SET consumed_at = NOW(),
              updated_at = NOW()
          WHERE id = $1
        `,
        [session.id]
      );

      throw new Error("Your reset session has expired. Request a new code.");
    }

    const userResult = await db.query(
      `
        SELECT *
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
        FOR UPDATE
      `,
      [submittedEmail]
    );
    const user = userResult.rows[0];

    if (!user) {
      throw new Error("No account found for this email.");
    }

    const passwordHash = await hash(password, 10);
    const updatedUser = await db.query(
      `
        UPDATE users
        SET password_hash = $2,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [user.id, passwordHash]
    );

    await db.query(
      `
        UPDATE password_reset_sessions
        SET consumed_at = NOW(),
            updated_at = NOW()
        WHERE email_normalized = $1 AND consumed_at IS NULL
      `,
      [submittedEmail]
    );

    return mapUserRow(updatedUser.rows[0]);
  });
}

async function getVendorRowBySlug(slug) {
  const result = await queryPostgres(`SELECT * FROM vendor_profiles WHERE slug = $1 LIMIT 1`, [slug]);
  return result.rows[0] || null;
}

async function getServiceRowsByVendorSlug(vendorSlug, orderBy = "price ASC") {
  // SECURITY: Validate and sanitize ORDER BY clause to prevent SQL injection
  const validOrderByClauses = [
    "price ASC",
    "price DESC",
    "created_at ASC",
    "created_at DESC",
    "title ASC",
    "title DESC",
    "featured DESC",
    "featured DESC, price ASC",
    "sort_order ASC, created_at ASC"
  ];
  
  const sanitizedOrderBy = validOrderByClauses.includes(orderBy.trim())
    ? orderBy.trim()
    : "price ASC";

  const result = await queryPostgres(
    `SELECT * FROM services WHERE vendor_slug = $1 ORDER BY ${sanitizedOrderBy}`,
    [vendorSlug]
  );
  return result.rows;
}

async function getServiceRowsByVendorSlugs(vendorSlugs, orderBy = "featured DESC, price ASC") {
  if (!vendorSlugs.length) {
    return [];
  }

  // SECURITY: Validate and sanitize ORDER BY clause to prevent SQL injection
  const validOrderByClauses = [
    "price ASC",
    "price DESC",
    "created_at ASC",
    "created_at DESC",
    "title ASC",
    "title DESC",
    "featured DESC",
    "featured DESC, price ASC",
    "sort_order ASC, created_at ASC"
  ];
  
  const sanitizedOrderBy = validOrderByClauses.includes(orderBy.trim())
    ? orderBy.trim()
    : "featured DESC, price ASC";

  const result = await queryPostgres(
    `SELECT * FROM services WHERE vendor_slug = ANY($1::text[]) ORDER BY ${sanitizedOrderBy}`,
    [vendorSlugs]
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

async function getConversationRowById(conversationId) {
  const result = await queryPostgres(
    `
      SELECT
        booking_conversations.*,
        bookings.vendor_name,
        bookings.customer_name,
        bookings.customer_email,
        bookings.service_name,
        bookings.appointment_date,
        bookings.appointment_slot,
        bookings.status AS booking_status,
        users.name AS client_name,
        (
          SELECT body
          FROM booking_messages
          WHERE booking_messages.conversation_id = booking_conversations.id
          ORDER BY created_at DESC
          LIMIT 1
        ) AS last_message_preview
      FROM booking_conversations
      LEFT JOIN bookings ON bookings.id = booking_conversations.booking_id
      LEFT JOIN users ON users.id = booking_conversations.client_id
      WHERE booking_conversations.id = $1
      LIMIT 1
    `,
    [conversationId]
  );
  return result.rows[0] || null;
}

async function getConversationRowByBookingId(bookingId) {
  const result = await queryPostgres(
    `SELECT * FROM booking_conversations WHERE booking_id = $1 LIMIT 1`,
    [bookingId]
  );
  return result.rows[0] || null;
}

async function getMessageRowsByConversationId(conversationId) {
  const result = await queryPostgres(
    `SELECT * FROM booking_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [conversationId]
  );
  return result.rows;
}

async function getConversationRowsByVendorSlug(vendorSlug) {
  const result = await queryPostgres(
    `
      SELECT
        booking_conversations.*,
        bookings.vendor_name,
        bookings.customer_name,
        bookings.customer_email,
        bookings.service_name,
        bookings.appointment_date,
        bookings.appointment_slot,
        bookings.status AS booking_status,
        users.name AS client_name,
        (
          SELECT body
          FROM booking_messages
          WHERE booking_messages.conversation_id = booking_conversations.id
          ORDER BY created_at DESC
          LIMIT 1
        ) AS last_message_preview
      FROM booking_conversations
      LEFT JOIN bookings ON bookings.id = booking_conversations.booking_id
      LEFT JOIN users ON users.id = booking_conversations.client_id
      WHERE booking_conversations.vendor_slug = $1
      ORDER BY COALESCE(booking_conversations.last_message_at, booking_conversations.created_at) DESC
    `,
    [vendorSlug]
  );
  return result.rows;
}

async function getConversationRowsForClient(user) {
  const params = [user.id];
  const emailFilter = user.email ? " OR LOWER(bookings.customer_email) = LOWER($2)" : "";

  if (user.email) {
    params.push(user.email);
  }

  const result = await queryPostgres(
    `
      SELECT
        booking_conversations.*,
        bookings.vendor_name,
        bookings.customer_name,
        bookings.customer_email,
        bookings.service_name,
        bookings.appointment_date,
        bookings.appointment_slot,
        bookings.status AS booking_status,
        vendor_profiles.name AS vendor_profile_name,
        (
          SELECT body
          FROM booking_messages
          WHERE booking_messages.conversation_id = booking_conversations.id
          ORDER BY created_at DESC
          LIMIT 1
        ) AS last_message_preview
      FROM booking_conversations
      LEFT JOIN bookings ON bookings.id = booking_conversations.booking_id
      LEFT JOIN vendor_profiles ON vendor_profiles.slug = booking_conversations.vendor_slug
      WHERE booking_conversations.client_id = $1${emailFilter}
      ORDER BY COALESCE(booking_conversations.last_message_at, booking_conversations.created_at) DESC
    `,
    params
  );
  return result.rows;
}

function buildLiveBookingWindows(vendor, vendorBookings, options = {}) {
  const {
    ignoredBookingId = "",
    minLeadHours = 0,
    daysAhead = 45,
    maxWindows = 12
  } = options;
  const windows = buildBookingWindowsFromRules(
    vendor.availabilityRules,
    vendor.blackoutDates,
    daysAhead,
    maxWindows,
    {
      availabilityOverrides: vendor.availabilityOverrides
    }
  );
  const occupied = new Set(
    vendorBookings
      .filter((booking) => booking.id !== ignoredBookingId && bookingBlocksSlot(booking))
      .map((booking) => `${booking.appointmentDate}|${booking.appointmentSlot}`)
  );
  const leadThreshold = Date.now() + Number(minLeadHours || 0) * 60 * 60 * 1000;

  return windows
    .map((window) => ({
      ...window,
      slots: window.slots.filter((slot) => {
        const appointment = getAppointmentDateTime(window.date, slot);

        if (!appointment || appointment.getTime() < leadThreshold) {
          return false;
        }

        return !occupied.has(`${window.date}|${slot}`);
      })
    }))
    .filter((window) => window.slots.length);
}

function buildVendorAvailabilitySnapshot(vendor, services, bookings, options = {}) {
  return buildAvailabilityAgenda({
    availabilityRules: vendor.availabilityRules,
    blackoutDates: vendor.blackoutDates,
    availabilityOverrides: vendor.availabilityOverrides,
    bookings,
    services,
    referenceDate: options.referenceDate,
    view: options.view,
    timezone: options.timezone || DEFAULT_CLIENT_TIMEZONE
  });
}

async function getVendorAvailabilityProfile(user) {
  if (!hasDatabase) {
    const vendor = getDemoStore().vendors.find((item) => item.slug === user.vendorSlug);

    if (!vendor) {
      throw new Error("Vendor profile not found.");
    }

    return hydrateVendorWindows(vendor);
  }

  const vendorRow = await getVendorRowBySlug(user.vendorSlug);

  if (!vendorRow) {
    throw new Error("Vendor profile not found.");
  }

  return mapVendorRow(vendorRow);
}

async function persistVendorAvailabilityState(user, nextState) {
  const nextRules = nextState.availabilityRules;
  const nextOverrides = normalizeAvailabilityOverrides(nextState.availabilityOverrides);
  const nextBlackoutDates = toList(nextState.blackoutDates);
  const nextWindows = buildBookingWindowsFromRules(nextRules, nextBlackoutDates, 21, 6, {
    availabilityOverrides: nextOverrides
  });

  if (!hasDatabase) {
    const store = getDemoStore();
    const vendor = store.vendors.find((item) => item.slug === user.vendorSlug);

    if (!vendor) {
      throw new Error("Vendor profile not found.");
    }

    vendor.availabilityRules = nextRules;
    vendor.availabilityOverrides = nextOverrides;
    vendor.blackoutDates = nextBlackoutDates;
    vendor.bookingWindows = nextWindows;
    vendor.updatedAt = new Date().toISOString();
    return getDashboardDataForUser(user);
  }

  const result = await queryPostgres(
    `
      UPDATE vendor_profiles
      SET availability_rules = $2::jsonb,
          availability_overrides = $3::jsonb,
          blackout_dates = $4::jsonb,
          booking_windows = $5::jsonb,
          updated_at = NOW()
      WHERE slug = $1
      RETURNING id
    `,
    [
      user.vendorSlug,
      JSON.stringify(nextRules),
      JSON.stringify(nextOverrides),
      JSON.stringify(nextBlackoutDates),
      JSON.stringify(nextWindows)
    ]
  );

  if (!result.rows.length) {
    throw new Error("Vendor profile not found.");
  }

  return getDashboardDataForUser(user);
}

function normalizeUserTimezone(value, fallback = DEFAULT_CLIENT_TIMEZONE) {
  const timezone = String(value || "").trim();
  return timezone || fallback;
}

async function updateDashboardUserTimezone(user, timezone) {
  const nextTimezone = normalizeUserTimezone(timezone, user?.timezone || DEFAULT_CLIENT_TIMEZONE);

  if (!user?.id) {
    return nextTimezone;
  }

  if (!hasDatabase) {
    const store = getDemoStore();
    const currentUser = store.users.find((item) => item.id === user.id);

    if (currentUser) {
      currentUser.timezone = nextTimezone;
      currentUser.updatedAt = new Date().toISOString();
    }

    return nextTimezone;
  }

  await queryPostgres(
    `
      UPDATE users
      SET timezone = $2,
          updated_at = NOW()
      WHERE id = $1
    `,
    [user.id, nextTimezone]
  );

  return nextTimezone;
}

async function refreshVendorPrice(db, vendorSlug) {
  const { rows } = await db.query(
    `
      SELECT COALESCE(MIN(price), 0) AS price_from
      FROM services
      WHERE vendor_slug = $1
        AND is_active IS NOT FALSE
        AND COALESCE(service_type, 'service') IN ('service', 'combined')
    `,
    [vendorSlug]
  );
  const priceFrom = Number(rows[0]?.price_from || 0);

  await db.query(
    `UPDATE vendor_profiles SET price_from = $2, updated_at = NOW() WHERE slug = $1`,
    [vendorSlug, priceFrom]
  );
}

function normalizeDiscoverBoolean(value) {
  return value === true || value === "true" || value === "1";
}

function normalizeDiscoverSort(value) {
  const supported = new Set([
    "highest_rated",
    "most_reviewed",
    "price_low",
    "next_available",
    "nearest"
  ]);
  return supported.has(value) ? value : "highest_rated";
}

function normalizeDiscoverLimit(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 12;
  }

  return Math.min(24, Math.max(1, Math.round(parsed)));
}

function normalizeDiscoverPage(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 1;
  }

  return Math.max(1, Math.round(parsed));
}

function compareNullableNumbers(left, right) {
  const leftValid = Number.isFinite(left);
  const rightValid = Number.isFinite(right);

  if (!leftValid && !rightValid) {
    return 0;
  }

  if (!leftValid) {
    return 1;
  }

  if (!rightValid) {
    return -1;
  }

  return left - right;
}

function sortServicesForDiscover(services = []) {
  return [...services].sort(
    (left, right) =>
      Number(right.featured) - Number(left.featured) ||
      Number(left.price || 0) - Number(right.price || 0)
  );
}

function buildDiscoverTopServices(services = []) {
  return sortServicesForDiscover(services)
    .slice(0, 3)
    .map((service) => ({
      id: service.id,
      title: service.title,
      price: Number(service.price || 0),
      duration: service.duration,
      bookingMethod: service.bookingMethod || "approval",
      featured: Boolean(service.featured)
    }));
}

function buildDiscoverBadges(vendor, services = []) {
  const badges = [];

  if (vendor.verified) {
    badges.push("Verified");
  }

  if (services.some((service) => service.bookingMethod !== "approval")) {
    badges.push("Instant book");
  }

  if (Number(vendor.rating || 0) >= 4.8) {
    badges.push("Top rated");
  }

  return badges;
}

function buildDiscoverStylist(vendor, services = [], filters = {}) {
  const activeServices = sortServicesForDiscover(
    services.filter((service) => service.isActive !== false)
  );
  const topServices = buildDiscoverTopServices(activeServices);
  const nextAvailability = getNextAvailabilityMeta(vendor.bookingWindows || []);
  const distanceMiles =
    Number.isFinite(Number(filters.nearLat)) &&
    Number.isFinite(Number(filters.nearLng)) &&
    Number.isFinite(Number(vendor.latitude)) &&
    Number.isFinite(Number(vendor.longitude))
      ? distanceMilesBetween(filters.nearLat, filters.nearLng, vendor.latitude, vendor.longitude)
      : null;

  return {
    ...vendor,
    topServices,
    badges: buildDiscoverBadges(vendor, activeServices),
    hasInstantBook: activeServices.some((service) => service.bookingMethod !== "approval"),
    nextAvailabilityLabel: nextAvailability.label,
    nextAvailabilityTimestamp: nextAvailability.timestamp,
    distanceMiles,
    distanceLabel: formatDistanceLabel(distanceMiles),
    locationLabel: buildVendorLocationLabel(vendor),
    cityStateLabel: buildVendorCityStateLabel(vendor),
    mapPinLabel: buildVendorMapPinLabel(vendor),
    coverImage:
      vendor.coverImage ||
      vendor.avatar ||
      activeServices.find((service) => service.imageUrl)?.imageUrl ||
      ""
  };
}

function sortDiscoverStylists(items, sort) {
  const fallbackCompare = (left, right) =>
    Number(right.rating || 0) - Number(left.rating || 0) ||
    Number(right.reviewCount || 0) - Number(left.reviewCount || 0) ||
    compareNullableNumbers(left.distanceMiles, right.distanceMiles) ||
    Number(left.priceFrom || 0) - Number(right.priceFrom || 0);

  return [...items].sort((left, right) => {
    if (sort === "most_reviewed") {
      return Number(right.reviewCount || 0) - Number(left.reviewCount || 0) || fallbackCompare(left, right);
    }

    if (sort === "price_low") {
      return Number(left.priceFrom || 0) - Number(right.priceFrom || 0) || fallbackCompare(left, right);
    }

    if (sort === "next_available") {
      return (
        compareNullableNumbers(left.nextAvailabilityTimestamp, right.nextAvailabilityTimestamp) ||
        fallbackCompare(left, right)
      );
    }

    if (sort === "nearest") {
      return compareNullableNumbers(left.distanceMiles, right.distanceMiles) || fallbackCompare(left, right);
    }

    return fallbackCompare(left, right);
  });
}

export async function searchDiscoverStylists(filters = {}) {
  const normalizedFilters = {
    query: String(filters.query || "").trim(),
    state: String(filters.state || filters.city || "").trim(),
    sort: normalizeDiscoverSort(String(filters.sort || "").trim()),
    priceRange: String(filters.priceRange || "").trim(),
    verifiedOnly: normalizeDiscoverBoolean(filters.verifiedOnly),
    instantOnly: normalizeDiscoverBoolean(filters.instantOnly),
    nearLat: normalizeVendorCoordinate(filters.nearLat),
    nearLng: normalizeVendorCoordinate(filters.nearLng),
    page: normalizeDiscoverPage(filters.page),
    limit: normalizeDiscoverLimit(filters.limit)
  };

  let stylists = [];
  const servicesByVendor = new Map();

  if (!hasDatabase) {
    const store = getDemoStore();
    stylists = filterStylists(
      store.vendors.filter((vendor) => vendor.status === "active"),
      normalizedFilters
    );
    const activeServices = store.services
      .filter((service) => service.isActive !== false)
      .filter(isBookableService);

    for (const service of activeServices) {
      const current = servicesByVendor.get(service.vendorSlug) || [];
      current.push(service);
      servicesByVendor.set(service.vendorSlug, current);
    }
  } else {
    stylists = await getStylists(normalizedFilters);
    const vendorSlugs = stylists.map((vendor) => vendor.slug);
    const serviceRows = await getServiceRowsByVendorSlugs(vendorSlugs);

    for (const service of serviceRows.map(mapServiceRow).filter((item) => item.isActive !== false && isBookableService(item))) {
      const current = servicesByVendor.get(service.vendorSlug) || [];
      current.push(service);
      servicesByVendor.set(service.vendorSlug, current);
    }
  }

  const enriched = stylists
    .map((vendor) => buildDiscoverStylist(vendor, servicesByVendor.get(vendor.slug) || [], normalizedFilters))
    .filter(
      (vendor) =>
        (!normalizedFilters.verifiedOnly || vendor.verified) &&
        (!normalizedFilters.instantOnly || vendor.hasInstantBook) &&
        matchPriceRange(vendor.priceFrom, normalizedFilters.priceRange)
    );
  const sorted = sortDiscoverStylists(enriched, normalizedFilters.sort);
  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / normalizedFilters.limit));
  const page = Math.min(normalizedFilters.page, totalPages);
  const startIndex = (page - 1) * normalizedFilters.limit;
  const items = sorted.slice(startIndex, startIndex + normalizedFilters.limit);

  return {
    stylists: items,
    meta: {
      page,
      limit: normalizedFilters.limit,
      total,
      totalPages,
      hasMore: page < totalPages
    }
  };
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
    const stylist = demoStylistBySlug(slug);

    if (!stylist) {
      return null;
    }

    const menuEntries = getDemoStore()
      .services.filter((service) => service.vendorSlug === slug)
      .filter((service) => service.isActive !== false)
      .sort((left, right) => Number(right.featured) - Number(left.featured) || Number(left.price || 0) - Number(right.price || 0));
    const menu = splitServiceMenuEntries(menuEntries);

  return {
    ...stylist,
    portfolioItems: normalizePortfolioItems(stylist.portfolioItems || []),
    portfolioImages: mergeImageList(
      stylist.portfolioImages || [],
      normalizePortfolioItems(stylist.portfolioItems || [])
        .filter((item) => item.type !== "video")
        .map((item) => item.url),
      stylist.galleryImages || [],
      menu.services.map((service) => service.imageUrl)
    ),
      services: menu.services,
      addons: menu.addons,
      serviceCategories: menu.serviceCategories
    };
  }

  const vendorRow = await getVendorRowBySlug(slug);

  if (!vendorRow) {
    return null;
  }

  const serviceRows = await getServiceRowsByVendorSlug(slug);
  const menuEntries = serviceRows
    .map(mapServiceRow)
    .filter((service) => service.isActive !== false)
    .sort(
      (left, right) =>
        Number(right.featured) - Number(left.featured) || Number(left.price || 0) - Number(right.price || 0)
    );
  const menu = splitServiceMenuEntries(menuEntries);
  return {
    ...mapVendorRow(vendorRow),
    portfolioImages: mergeImageList(
      parseJsonField(vendorRow.portfolio_images, parseJsonField(vendorRow.gallery_images, [])),
      normalizePortfolioItems(vendorRow.portfolio_items)
        .filter((item) => item.type !== "video")
        .map((item) => item.url),
      parseJsonField(vendorRow.gallery_images, []),
      menu.services.map((service) => service.imageUrl)
    ),
    services: menu.services,
    addons: menu.addons,
    serviceCategories: menu.serviceCategories
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
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  if (!hasDatabase) {
    return sanitizeUser(
      getDemoStore().users.find((user) => normalizeEmail(user.email) === normalizedEmail)
    );
  }

  return mapUserRow(await getUserRowByEmail(normalizedEmail));
}

function createAccountDeletionError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export async function deleteUserAccount(user) {
  if (!user?.id) {
    throw createAccountDeletionError("Unauthorized.", 401);
  }

  if (!hasDatabase) {
    const store = getDemoStore();
    const currentUser = store.users.find((item) => item.id === user.id);

    if (!currentUser) {
      return { ok: true };
    }

    if (currentUser.role === "admin") {
      throw createAccountDeletionError(
        "Admin accounts cannot be deleted from the dashboard.",
        403
      );
    }

    const now = new Date().toISOString();

    if (currentUser.role === "vendor" && currentUser.vendorSlug) {
      const vendorSlug = currentUser.vendorSlug;
      const deletedBookingIds = new Set(
        store.bookings
          .filter((booking) => booking.vendorSlug === vendorSlug)
          .map((booking) => String(booking.id))
      );
      const deletedConversationIds = new Set(
        store.conversations
          .filter(
            (conversation) =>
              conversation.vendorSlug === vendorSlug ||
              deletedBookingIds.has(String(conversation.bookingId))
          )
          .map((conversation) => String(conversation.id))
      );

      store.vendors = store.vendors.filter((vendor) => vendor.slug !== vendorSlug);
      store.services = store.services.filter((service) => service.vendorSlug !== vendorSlug);
      store.bookings = store.bookings.filter((booking) => booking.vendorSlug !== vendorSlug);
      store.conversations = store.conversations.filter(
        (conversation) => !deletedConversationIds.has(String(conversation.id))
      );
      store.messages = store.messages.filter(
        (message) =>
          !deletedConversationIds.has(String(message.conversationId)) &&
          !deletedBookingIds.has(String(message.bookingId))
      );
      store.favorites = store.favorites.filter(
        (favorite) => favorite.userId !== currentUser.id && favorite.vendorSlug !== vendorSlug
      );
      store.vendorNotifications = (store.vendorNotifications || []).filter(
        (notification) => notification.vendorSlug !== vendorSlug
      );
    } else {
      store.bookings = store.bookings.map((booking) =>
        booking.customerId === currentUser.id
          ? {
              ...booking,
              customerId: null,
              updatedAt: now
            }
          : booking
      );
      store.conversations = store.conversations.map((conversation) =>
        conversation.clientId === currentUser.id
          ? {
              ...conversation,
              clientId: null,
              clientUnreadCount: 0,
              updatedAt: now
            }
          : conversation
      );
      store.messages = store.messages.map((message) =>
        message.senderId === currentUser.id
          ? {
              ...message,
              senderId: null,
              updatedAt: now
            }
          : message
      );
      store.favorites = store.favorites.filter((favorite) => favorite.userId !== currentUser.id);
    }

    store.notifications = store.notifications.filter(
      (notification) => notification.userId !== currentUser.id
    );
    store.notificationPreferences = store.notificationPreferences.filter(
      (preference) => preference.userId !== currentUser.id
    );
    store.paymentMethods = store.paymentMethods.filter(
      (paymentMethod) => paymentMethod.userId !== currentUser.id
    );
    store.paymentRecords = store.paymentRecords.filter(
      (paymentRecord) => paymentRecord.userId !== currentUser.id
    );
    store.authSessions = getDemoAuthSessions().filter((session) => session.userId !== currentUser.id);
    store.deleteRequests = getDemoDeleteRequests().filter(
      (request) => request.userId !== currentUser.id
    );
    store.users = store.users.filter((item) => item.id !== currentUser.id);
    return { ok: true };
  }

  return withPostgresTransaction(async (db) => {
    const result = await db.query(`SELECT * FROM users WHERE id = $1 LIMIT 1`, [user.id]);
    const currentUser = result.rows[0];

    if (!currentUser) {
      return { ok: true };
    }

    if (currentUser.role === "admin") {
      throw createAccountDeletionError(
        "Admin accounts cannot be deleted from the dashboard.",
        403
      );
    }

    if (currentUser.role === "client") {
      await db.query(
        `
          UPDATE bookings
          SET customer_id = NULL,
              updated_at = NOW()
          WHERE customer_id = $1
        `,
        [currentUser.id]
      );
      await db.query(
        `
          UPDATE booking_conversations
          SET client_id = NULL,
              client_unread_count = 0,
              updated_at = NOW()
          WHERE client_id = $1
        `,
        [currentUser.id]
      );
      await db.query(
        `
          UPDATE booking_messages
          SET sender_id = NULL,
              updated_at = NOW()
          WHERE sender_id = $1
        `,
        [currentUser.id]
      );
    }

    if (currentUser.role === "vendor" && currentUser.vendor_slug) {
      await db.query(`DELETE FROM vendor_profiles WHERE slug = $1`, [currentUser.vendor_slug]);
    }

    await db.query(`DELETE FROM users WHERE id = $1`, [currentUser.id]);
    return { ok: true };
  });
}

export async function createAuthSession(user, meta = {}) {
  if (!user?.id) {
    throw new Error("User is required to create a session.");
  }

  const session = {
    id: `sess-${randomUUID()}`,
    userId: user.id,
    verifier: randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, ""),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + AUTH_SESSION_MAX_AGE_SECONDS * 1000).toISOString(),
    revokedAt: null,
    lastSeenAt: new Date().toISOString(),
    ...createSessionMetadata(meta)
  };
  const tokenHash = hashOpaqueToken(session.verifier, "auth-session");

  if (!hasDatabase) {
    const sessions = getDemoAuthSessions();

    sessions.unshift({
      id: session.id,
      userId: session.userId,
      tokenHash,
      userAgent: session.userAgent,
      ipAddress: session.ipAddress,
      deviceLabel: session.deviceLabel,
      browser: session.browser,
      platform: session.platform,
      createdAt: session.createdAt,
      lastSeenAt: session.lastSeenAt,
      revokedAt: null,
      expiresAt: session.expiresAt
    });

    return session;
  }

  await queryPostgres(
    `
      INSERT INTO auth_sessions (
        id, user_id, token_hash, user_agent, ip_address, device_label, browser, platform,
        created_at, last_seen_at, revoked_at, expires_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12
      )
    `,
    [
      session.id,
      session.userId,
      tokenHash,
      session.userAgent,
      session.ipAddress,
      session.deviceLabel,
      session.browser,
      session.platform,
      session.createdAt,
      session.lastSeenAt,
      session.revokedAt,
      session.expiresAt
    ]
  );

  return session;
}

export async function getUserByAuthSession(sessionId, verifier, options = {}) {
  const sessionKey = String(sessionId || "").trim();
  const verifierValue = String(verifier || "").trim();

  if (!sessionKey || !verifierValue) {
    return null;
  }

  const tokenHash = hashOpaqueToken(verifierValue, "auth-session");

  if (!hasDatabase) {
    const session = getDemoAuthSessions().find(
      (item) =>
        item.id === sessionKey &&
        item.tokenHash === tokenHash &&
        !item.revokedAt &&
        new Date(item.expiresAt || 0).getTime() > Date.now()
    );

    if (!session) {
      return null;
    }

    if (options.touch !== false) {
      session.lastSeenAt = new Date().toISOString();
    }

    const user = getDemoStore().users.find((item) => item.id === session.userId);

    if (!user) {
      return null;
    }

    return {
      ...sanitizeUser(user),
      sessionId: session.id
    };
  }

  const result = await queryPostgres(
    `
      SELECT
        users.*,
        auth_sessions.id AS auth_session_id
      FROM auth_sessions
      INNER JOIN users ON users.id = auth_sessions.user_id
      WHERE auth_sessions.id = $1
        AND auth_sessions.token_hash = $2
        AND auth_sessions.revoked_at IS NULL
        AND auth_sessions.expires_at > NOW()
      LIMIT 1
    `,
    [sessionKey, tokenHash]
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  if (options.touch !== false) {
    await queryPostgres(
      `
        UPDATE auth_sessions
        SET last_seen_at = NOW()
        WHERE id = $1
      `,
      [sessionKey]
    );
  }

  return {
    ...mapUserRow(row),
    sessionId: row.auth_session_id
  };
}

export async function revokeAuthSession(user, sessionId) {
  if (!user?.id || !sessionId) {
    return null;
  }

  if (!hasDatabase) {
    const session = getDemoAuthSessions().find(
      (item) => item.userId === user.id && String(item.id) === String(sessionId)
    );

    if (!session) {
      throw new Error("Session not found.");
    }

    session.revokedAt = session.revokedAt || new Date().toISOString();
    return mapAuthSessionRow(session);
  }

  const { rows } = await queryPostgres(
    `
      UPDATE auth_sessions
      SET revoked_at = COALESCE(revoked_at, NOW())
      WHERE id = $1
        AND user_id = $2
      RETURNING *
    `,
    [sessionId, user.id]
  );

  if (!rows.length) {
    throw new Error("Session not found.");
  }

  return mapAuthSessionRow(rows[0]);
}

export async function signupUser(payload) {
  const email = normalizeEmail(payload.email);
  const phone = String(payload.phone || "").trim();
  const phoneNormalized = normalizePhone(phone);
  const smsOptIn = Boolean(payload.smsOptIn);
  const promoCode = String(payload.promoCode || "").trim();

  if (!hasDatabase) {
    const store = getDemoStore();
    const exists = store.users.find((user) => normalizeEmail(user.email) === email);

    if (exists) {
      throw new Error("An account with this email already exists.");
    }

    const user = {
      id: `usr-${Date.now()}`,
      name: payload.name,
      email,
      phone,
      phoneNormalized: phoneNormalized || null,
      city: payload.city,
      role: payload.role || "client",
      vendorSlug: payload.vendorSlug || null,
      avatar: payload.avatar || "",
      timezone: DEFAULT_CLIENT_TIMEZONE,
      country: DEFAULT_CLIENT_COUNTRY,
      phoneCountryCode: DEFAULT_CLIENT_PHONE_COUNTRY_CODE,
      smsOptIn,
      promoCode,
      reducedMotion: false,
      highContrast: false,
      largerText: false,
      lastSignInAt: null,
      signInCount: 0,
      passwordHash: await hash(payload.password, 10)
    };

    store.users.unshift(user);
    return sanitizeUser(user);
  }

  const existing = await getUserRowByEmail(email);

  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  try {
    const passwordHash = await hash(payload.password, 10);
    const userId = `usr-${Date.now()}`;
    const { rows } = await queryPostgres(
      `
        INSERT INTO users (
          id, name, email, phone, phone_normalized, city, vendor_slug, role, password_hash, avatar, sms_opt_in, promo_code, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
        RETURNING *
      `,
      [
        userId,
        payload.name,
        email,
        phone,
        phoneNormalized || null,
        payload.city || "",
        payload.vendorSlug || null,
        payload.role || "client",
        passwordHash,
        payload.avatar || "",
        smsOptIn,
        promoCode
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

// SECURITY: Pre-computed bcrypt hash used as a dummy compare target when the
// requested user does not exist. This keeps signin response time constant
// regardless of whether the email is registered, preventing user-enumeration
// via timing oracles. The hash is for the string "hairforce-no-account" — it
// will never match any legitimate password.
const DUMMY_PASSWORD_HASH =
  "$2a$10$CwTycUXWue0Thq9StjUM0uJ8eXcZ27nKZ9z7QH3qO5RxQp1wYQwQS";

export async function signinUser(payload) {
  const email = normalizeEmail(payload.email);
  const allowedRoles = normalizeAllowedRoles(payload.allowedRoles);
  const submittedPassword = String(payload.password || "");

  if (!hasDatabase) {
    const user = getDemoStore().users.find((item) => normalizeEmail(item.email) === email);

    if (!user) {
      // Run a dummy compare so the response time matches the wrong-password path.
      await compare(submittedPassword, DUMMY_PASSWORD_HASH);
      throw new Error("Invalid email or password.");
    }

    const isValid = await compare(submittedPassword, user.passwordHash);

    if (!isValid) {
      throw new Error("Invalid email or password.");
    }

    assertUserAllowedRoles(user, allowedRoles);
    user.lastSignInAt = new Date().toISOString();
    user.signInCount = Number(user.signInCount || 0) + 1;

    return sanitizeUser(user);
  }

  const user = await getUserRowByEmail(email);

  if (!user) {
    // Run a dummy compare so the response time matches the wrong-password path.
    await compare(submittedPassword, DUMMY_PASSWORD_HASH);
    throw new Error("Invalid email or password.");
  }

  const isValid = await compare(submittedPassword, user.password_hash);

  if (!isValid) {
    throw new Error("Invalid email or password.");
  }

  assertUserAllowedRoles(user, allowedRoles);
  const signedInUser = await recordUserSignIn(user.id);
  return mapUserRow(signedInUser || user);
}

function buildGoogleVendorBusinessName(name, email) {
  const ownerName = String(name || email.split("@")[0] || "Hair Force Partner").trim();

  if (!ownerName) {
    return "Hair Force Partner";
  }

  if (/(studio|salon|beauty|barber|spa|nails|braids|collective|atelier)/i.test(ownerName)) {
    return ownerName;
  }

  return `${ownerName} Studio`;
}

function buildGoogleVendorSeed({ name, email, avatar }) {
  const ownerName = String(name || email.split("@")[0] || "Hair Force Partner").trim();
  const businessName = buildGoogleVendorBusinessName(ownerName, email);
  const availabilityRules = createDefaultAvailabilityRules();
  const availabilityOverrides = [];
  const bookingWindows = buildBookingWindowsFromRules(availabilityRules, [], 21, 6, {
    availabilityOverrides
  });

  return {
    ownerName,
    businessName,
    category: DEFAULT_GOOGLE_VENDOR_CATEGORY,
    heroTag: "Google-connected stylist account",
    tagline: "Complete your stylist profile to go live on Hair Force.",
    bio: "This stylist account was created with Google sign in and is ready for profile setup.",
    specialties: toList(DEFAULT_GOOGLE_VENDOR_CATEGORY),
    amenities: ["Online booking", "Marketplace profile"],
    coverGradient: "linear-gradient(135deg, rgba(54,110,255,.55), rgba(53,223,255,.2))",
    metrics: {
      repeatClients: "0%",
      monthlyBookings: "0",
      showUpRate: "0%"
    },
    avatar,
    availabilityRules,
    availabilityOverrides,
    bookingWindows,
    policies: {
      deposit: "Deposits are collected after approval when required.",
      cancellation: "Please cancel at least 24 hours before the appointment.",
      lateArrival: "Late arrivals may reduce service time.",
      prepInstructions: "Share photos and arrive prepared for your chosen service."
    }
  };
}

async function createDemoVendorUserFromGoogle({ name, email, googleId, avatar }) {
  const store = getDemoStore();
  const vendorSeed = buildGoogleVendorSeed({ name, email, avatar });
  const vendorSlug = makeVendorSlug(
    vendorSeed.businessName,
    store.vendors.map((vendor) => vendor.slug)
  );
  const userId = `usr-${Date.now()}`;
  const vendorId = `vendor-${Date.now()}`;
  const passwordHash = await hash(`google-${googleId}-${randomUUID()}`, 10);
  const now = new Date().toISOString();
  const user = {
    id: userId,
    name: vendorSeed.ownerName,
    email,
    phone: "",
    city: "",
    role: "vendor",
    vendorSlug,
    avatar,
    googleId,
    phoneNormalized: null,
    timezone: DEFAULT_CLIENT_TIMEZONE,
    country: DEFAULT_CLIENT_COUNTRY,
    phoneCountryCode: DEFAULT_CLIENT_PHONE_COUNTRY_CODE,
    reducedMotion: false,
    highContrast: false,
    largerText: false,
    lastSignInAt: now,
    signInCount: 1,
    passwordHash
  };
  const vendor = {
    id: vendorId,
    slug: vendorSlug,
    name: vendorSeed.businessName,
    owner: vendorSeed.ownerName,
    category: vendorSeed.category,
    state: "",
    city: "",
    area: "",
    location: "",
    latitude: null,
    longitude: null,
    locationPrecision: "approx_area",
    rating: 5,
    reviewCount: 0,
    priceFrom: 0,
    responseTime: "Pending approval",
    verified: false,
    heroTag: vendorSeed.heroTag,
    tagline: vendorSeed.tagline,
    bio: vendorSeed.bio,
    avatar: avatar || "",
    specialties: vendorSeed.specialties,
    amenities: vendorSeed.amenities,
    coverGradient: vendorSeed.coverGradient,
    metrics: vendorSeed.metrics,
    coverImage: "",
    galleryImages: [],
    portfolioImages: [],
    availabilityRules: vendorSeed.availabilityRules,
    availabilityOverrides: vendorSeed.availabilityOverrides,
    blackoutDates: [],
    gallery: [],
    reviews: [],
    bookingWindows: vendorSeed.bookingWindows,
    serviceLocationType: "studio",
    policies: vendorSeed.policies,
    socialLinks: {},
    status: "active",
    createdAt: now,
    updatedAt: now
  };

  store.users.unshift(user);
  store.vendors.unshift(vendor);
  return sanitizeUser(user);
}

async function createPostgresVendorUserFromGoogle(db, { name, email, googleId, avatar }) {
  const vendorSeed = buildGoogleVendorSeed({ name, email, avatar });
  const slugResult = await db.query(`SELECT slug FROM vendor_profiles`);
  const vendorSlug = makeVendorSlug(
    vendorSeed.businessName,
    slugResult.rows.map((row) => row.slug)
  );
  const passwordHash = await hash(`google-${googleId}-${randomUUID()}`, 10);
  const userId = `usr-${Date.now()}`;
  const vendorId = `vendor-${Date.now()}`;

  const userResult = await db.query(
    `
      INSERT INTO users (
        id, name, email, phone, phone_normalized, city, vendor_slug, role, password_hash, avatar,
        google_id, last_signin_at, signin_count, created_at, updated_at
      ) VALUES (
        $1, $2, $3, '', NULL, '', $4, 'vendor', $5, $6,
        $7, NOW(), 1, NOW(), NOW()
      )
      RETURNING *
    `,
    [userId, vendorSeed.ownerName, email, vendorSlug, passwordHash, avatar, googleId]
  );

  await db.query(
    `
      INSERT INTO vendor_profiles (
        id, slug, name, owner, category, state, city, area, location, latitude, longitude,
        location_precision, rating, review_count, price_from, response_time, verified, hero_tag,
        tagline, bio, cover_image, avatar, gallery_images, portfolio_images, specialties,
        amenities, cover_gradient, metrics, gallery, reviews, booking_windows, availability_rules,
        availability_overrides, blackout_dates, service_location_type, policies, social_links,
        status, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, '', '', '', '', NULL, NULL,
        'approx_area', 5, 0, 0, $6, FALSE, $7,
        $8, $9, '', $10, '[]'::jsonb, '[]'::jsonb, $11::jsonb,
        $12::jsonb, $13, $14::jsonb, '[]'::jsonb, '[]'::jsonb, $15::jsonb, $16::jsonb,
        $17::jsonb, '[]'::jsonb, 'studio', $18::jsonb, '{}'::jsonb, 'active', NOW(), NOW()
      )
    `,
    [
      vendorId,
      vendorSlug,
      vendorSeed.businessName,
      vendorSeed.ownerName,
      vendorSeed.category,
      "Pending approval",
      vendorSeed.heroTag,
      vendorSeed.tagline,
      vendorSeed.bio,
      avatar || "",
      JSON.stringify(vendorSeed.specialties),
      JSON.stringify(vendorSeed.amenities),
      vendorSeed.coverGradient,
      JSON.stringify(vendorSeed.metrics),
      JSON.stringify(vendorSeed.bookingWindows),
      JSON.stringify(vendorSeed.availabilityRules),
      JSON.stringify(vendorSeed.availabilityOverrides),
      JSON.stringify(vendorSeed.policies)
    ]
  );

  return mapUserRow(userResult.rows[0]);
}

export async function signinWithGoogle(payload) {
  const email = normalizeEmail(payload.email);
  const name = String(payload.name || email.split("@")[0] || "Hair Force Client").trim();
  const googleId = String(payload.googleId || "").trim();
  const avatar = String(payload.avatar || "").trim();
  const accountRole = normalizeGoogleAuthAccountRole(payload.accountRole);
  const allowedRoles = normalizeAllowedRoles(payload.allowedRoles);

  if (!email || !googleId) {
    throw new Error("A verified Google account is required.");
  }

  if (!hasDatabase) {
    const store = getDemoStore();
    let user = store.users.find(
      (item) => item.googleId === googleId || normalizeEmail(item.email) === email
    );

    if (!user) {
      if (accountRole === "vendor") {
        return createDemoVendorUserFromGoogle({ name, email, googleId, avatar });
      }

      if (allowedRoles.length) {
        throw createRoleRestrictedAuthError(allowedRoles);
      }

      user = {
        id: `usr-${Date.now()}`,
        name,
        email,
        phone: "",
        city: "",
        role: "client",
        vendorSlug: null,
        avatar,
        googleId,
        phoneNormalized: null,
        timezone: DEFAULT_CLIENT_TIMEZONE,
        country: DEFAULT_CLIENT_COUNTRY,
        phoneCountryCode: DEFAULT_CLIENT_PHONE_COUNTRY_CODE,
        reducedMotion: false,
        highContrast: false,
        largerText: false,
        lastSignInAt: null,
        signInCount: 0,
        passwordHash: await hash(`google-${googleId}-${randomUUID()}`, 10)
      };

      store.users.unshift(user);
    } else {
      assertGoogleSignInRoleAccess(user, accountRole, allowedRoles);

      if (user.googleId && user.googleId !== googleId) {
        throw new Error("This email is already linked to a different Google account.");
      }

      user.googleId = googleId;
      user.avatar = avatar || user.avatar || "";
      user.name = user.name || name;
    }

    user.lastSignInAt = new Date().toISOString();
    user.signInCount = Number(user.signInCount || 0) + 1;

    return sanitizeUser(user);
  }

  return withPostgresTransaction(async (db) => {
    const existingGoogleUser = await db.query(
      `SELECT * FROM users WHERE google_id = $1 LIMIT 1`,
      [googleId]
    );

    if (existingGoogleUser.rows[0]) {
      const current = existingGoogleUser.rows[0];
      assertGoogleSignInRoleAccess(current, accountRole, allowedRoles);
      const updatedGoogleUser = await db.query(
        `
          UPDATE users
          SET email = $2,
              name = CASE
                WHEN COALESCE(NULLIF(name, ''), '') = '' THEN $3
                ELSE name
              END,
              avatar = CASE
                WHEN $4 <> '' THEN $4
                ELSE avatar
              END,
              last_signin_at = NOW(),
              signin_count = COALESCE(signin_count, 0) + 1,
              updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [current.id, email, name, avatar]
      );

      return mapUserRow(updatedGoogleUser.rows[0]);
    }

    const existingEmailUser = await db.query(
      `SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [email]
    );

    if (existingEmailUser.rows[0]) {
      const current = existingEmailUser.rows[0];
      assertGoogleSignInRoleAccess(current, accountRole, allowedRoles);

      if (current.google_id && current.google_id !== googleId) {
        throw new Error("This email is already linked to a different Google account.");
      }

      const updatedEmailUser = await db.query(
        `
          UPDATE users
          SET google_id = $2,
              avatar = CASE
                WHEN $3 <> '' THEN $3
                ELSE avatar
              END,
              last_signin_at = NOW(),
              signin_count = COALESCE(signin_count, 0) + 1,
              updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [current.id, googleId, avatar]
      );

      return mapUserRow(updatedEmailUser.rows[0]);
    }

    if (accountRole === "vendor") {
      return createPostgresVendorUserFromGoogle(db, { name, email, googleId, avatar });
    }

    if (allowedRoles.length) {
      throw createRoleRestrictedAuthError(allowedRoles);
    }

    const passwordHash = await hash(`google-${googleId}-${randomUUID()}`, 10);
    const { rows } = await db.query(
      `
        INSERT INTO users (
          id, name, email, phone, phone_normalized, city, vendor_slug, role, password_hash, avatar,
          google_id, last_signin_at, signin_count, created_at, updated_at
        ) VALUES (
          $1, $2, $3, '', NULL, '', NULL, 'client', $4, $5,
          $6, NOW(), 1, NOW(), NOW()
        )
        RETURNING *
      `,
      [`usr-${Date.now()}`, name, email, passwordHash, avatar, googleId]
    );

    return mapUserRow(rows[0]);
  });
}

export async function requestPhoneSignupOtp(payload) {
  const phone = String(payload.phone || "").trim();
  const phoneNormalized = normalizePhone(phone);

  if (phoneNormalized.length < 10) {
    throw new Error("Enter a valid phone number.");
  }

  return issuePhoneOtpSession(phone, phoneNormalized);
}

export async function verifyPhoneSignupOtp(payload) {
  const verifiedPhone = await consumePhoneOtpSession(payload.phone, payload.code);
  const { phone, phoneNormalized } = verifiedPhone;

  if (!hasDatabase) {
    const store = getDemoStore();
    let user = findDemoUserByPhoneNormalized(phoneNormalized);

    if (!user) {
      user = {
        id: `usr-${Date.now()}`,
        name: "Hair Force Client",
        email: createPhonePlaceholderEmail(phoneNormalized),
        phone,
        phoneNormalized,
        city: "",
        role: "client",
        vendorSlug: null,
        avatar: "",
        timezone: DEFAULT_CLIENT_TIMEZONE,
        country: DEFAULT_CLIENT_COUNTRY,
        phoneCountryCode: DEFAULT_CLIENT_PHONE_COUNTRY_CODE,
        reducedMotion: false,
        highContrast: false,
        largerText: false,
        lastSignInAt: null,
        signInCount: 0,
        passwordHash: await hash(`phone-${phoneNormalized}-${randomUUID()}`, 10)
      };

      store.users.unshift(user);
    }

    user.phone = phone;
    user.phoneNormalized = phoneNormalized;
    user.lastSignInAt = new Date().toISOString();
    user.signInCount = Number(user.signInCount || 0) + 1;

    return sanitizeUser(user);
  }

  return withPostgresTransaction(async (db) => {
    const existingUser = await getUserRowByPhoneNormalized(phoneNormalized);

    if (existingUser) {
      const updatedExistingUser = await db.query(
        `
          UPDATE users
          SET phone = $2,
              phone_normalized = $3,
              last_signin_at = NOW(),
              signin_count = COALESCE(signin_count, 0) + 1,
              updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `,
        [existingUser.id, phone, phoneNormalized]
      );

      return mapUserRow(updatedExistingUser.rows[0]);
    }

    const passwordHash = await hash(`phone-${phoneNormalized}-${randomUUID()}`, 10);
    const createdUser = await db.query(
      `
        INSERT INTO users (
          id, name, email, phone, phone_normalized, city, vendor_slug, role, password_hash, avatar,
          last_signin_at, signin_count, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, '', NULL, 'client', $6, '',
          NOW(), 1, NOW(), NOW()
        )
        RETURNING *
      `,
      [
        `usr-${Date.now()}`,
        "Hair Force Client",
        createPhonePlaceholderEmail(phoneNormalized),
        phone,
        phoneNormalized,
        passwordHash
      ]
    );

    return mapUserRow(createdUser.rows[0]);
  });
}

export async function requestPhoneSigninOtp(payload) {
  const phone = String(payload.phone || "").trim();
  const phoneNormalized = normalizePhone(phone);
  const allowedRoles = normalizeAllowedRoles(payload.allowedRoles);

  if (phoneNormalized.length < 10) {
    throw new Error("Enter a valid phone number.");
  }

  if (!hasDatabase) {
    const user = findDemoUserByPhoneNormalized(phoneNormalized);

    if (!user) {
      throw new Error("No account found for this number.");
    }

    assertUserAllowedRoles(user, allowedRoles);
    return issuePhoneOtpSession(phone, phoneNormalized);
  }

  const existingUser = await getUserRowByPhoneNormalized(phoneNormalized);

  if (!existingUser) {
    throw new Error("No account found for this number.");
  }

  assertUserAllowedRoles(existingUser, allowedRoles);
  return issuePhoneOtpSession(phone, phoneNormalized);
}

export async function verifyPhoneSigninOtp(payload) {
  const verifiedPhone = await consumePhoneOtpSession(payload.phone, payload.code);
  const { phone, phoneNormalized } = verifiedPhone;
  const allowedRoles = normalizeAllowedRoles(payload.allowedRoles);

  if (!hasDatabase) {
    const user = findDemoUserByPhoneNormalized(phoneNormalized);

    if (!user) {
      throw new Error("No account found for this number.");
    }

    assertUserAllowedRoles(user, allowedRoles);
    user.phone = phone;
    user.phoneNormalized = phoneNormalized;
    user.lastSignInAt = new Date().toISOString();
    user.signInCount = Number(user.signInCount || 0) + 1;

    return sanitizeUser(user);
  }

  const user = await getUserRowByPhoneNormalized(phoneNormalized);

  if (!user) {
    throw new Error("No account found for this number.");
  }

  assertUserAllowedRoles(user, allowedRoles);
  const { rows } = await queryPostgres(
    `
      UPDATE users
      SET phone = CASE
            WHEN $2 <> '' THEN $2
            ELSE phone
          END,
          phone_normalized = $3,
          last_signin_at = NOW(),
          signin_count = COALESCE(signin_count, 0) + 1,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [user.id, phone, phoneNormalized]
  );

  return mapUserRow(rows[0] || user);
}

export async function requestPasswordResetOtp(payload) {
  const email = normalizeEmail(payload.email);

  if (!email || !email.includes("@")) {
    throw new Error("Enter a valid email address.");
  }

  if (isPhonePlaceholderEmail(email)) {
    throw new Error("This account does not support email password reset.");
  }

  if (!hasDatabase) {
    const user = getDemoStore().users.find((item) => normalizeEmail(item.email) === email);

    if (!user) {
      throw new Error("No account found for this email.");
    }

    return issuePasswordResetOtpSession(toPublicEmail(user.email) || email, email);
  }

  const user = await getUserRowByEmail(email);

  if (!user || isPhonePlaceholderEmail(user.email)) {
    throw new Error("No account found for this email.");
  }

  return issuePasswordResetOtpSession(toPublicEmail(user.email) || email, email);
}

export async function verifyPasswordResetOtp(payload) {
  return verifyPasswordResetOtpSession(payload.email, payload.code);
}

export async function resetPasswordWithToken(payload) {
  return consumePasswordResetToken(payload.email, payload.resetToken, payload.password);
}

export async function createVendorAccount(payload) {
  const ownerName = buildVendorOwnerName(payload);
  const normalizedEmail = normalizeEmail(payload.email);
  const businessName =
    String(payload.businessName || "").trim() ||
    buildGoogleVendorBusinessName(ownerName || normalizedEmail, normalizedEmail);
  const normalizedPhone = normalizePhone(payload.phone);
  const category =
    String(payload.category || DEFAULT_GOOGLE_VENDOR_CATEGORY).trim() || DEFAULT_GOOGLE_VENDOR_CATEGORY;
  const city = String(payload.city || "").trim();
  const location = String(payload.location || "").trim();
  const serviceLocationType = normalizeServiceLocationType(payload.serviceLocationType, "");

  if (!ownerName) {
    throw new Error("Your name is required.");
  }

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
      name: ownerName,
      email: payload.email,
      phone: payload.phone,
      city,
      password: payload.password,
      role: "vendor",
      vendorSlug,
      smsOptIn: payload.smsOptIn,
      promoCode: payload.promoCode
    });

    const vendor = {
      id: `vendor-${Date.now()}`,
      slug: vendorSlug,
      name: businessName,
      owner: ownerName,
      category,
      state: "",
      city,
      area: "",
      location,
      latitude: null,
      longitude: null,
      locationPrecision: "approx_area",
      rating: 5,
      reviewCount: 0,
      priceFrom: 0,
      responseTime: "Pending approval",
      verified: false,
      heroTag: payload.heroTag || "New Hair Force partner",
      tagline: payload.notes || "Complete your stylist profile to start getting booked.",
      bio: payload.notes || "This stylist account is setting up their Hair Force storefront.",
      specialties: toList(payload.specialties || category),
      amenities: ["Online booking", "Marketplace profile"],
      coverGradient: "linear-gradient(135deg, rgba(54,110,255,.55), rgba(53,223,255,.2))",
      metrics: {
        repeatClients: "0%",
        monthlyBookings: "0",
        showUpRate: "0%"
      },
      coverImage: "",
      avatar: "",
      galleryImages: [],
      portfolioImages: [],
      availabilityRules: [],
      availabilityOverrides: [],
      blackoutDates: [],
      gallery: [],
      reviews: [],
      bookingWindows: [],
      serviceLocationType,
      policies: {
        deposit: "Deposits are collected after approval when required.",
        cancellation: "Please cancel at least 24 hours before the appointment.",
        lateArrival: "Late arrivals may reduce service time.",
        prepInstructions: "Share photos and arrive prepared for your chosen service."
      },
      socialLinks: {},
      status: "active"
    };

    store.vendors.unshift(vendor);
    return { user, vendor };
  }

  return withPostgresTransaction(async (db) => {
    const existingUser = await db.query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
      [normalizedEmail]
    );

    if (existingUser.rows.length) {
      throw new Error("An account with this email already exists.");
    }

    const slugResult = await db.query(`SELECT slug FROM vendor_profiles`);
    const vendorSlug = makeVendorSlug(
      businessName,
      slugResult.rows.map((row) => row.slug)
    );
    const availabilityRules = [];
    const availabilityOverrides = [];
    const bookingWindows = [];
    const passwordHash = await hash(payload.password, 10);
    const userId = `usr-${Date.now()}`;
    const vendorId = `vendor-${Date.now()}`;

    const userResult = await db.query(
      `
        INSERT INTO users (
          id, name, email, phone, phone_normalized, city, vendor_slug, role, password_hash, avatar, sms_opt_in, promo_code, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'vendor', $8, $9, $10, $11, NOW(), NOW())
        RETURNING *
      `,
      [
        userId,
        ownerName,
        normalizedEmail,
        payload.phone || "",
        normalizedPhone || null,
        city,
        vendorSlug,
        passwordHash,
        "",
        Boolean(payload.smsOptIn),
        String(payload.promoCode || "").trim()
      ]
    );

    const vendorResult = await db.query(
      `
        INSERT INTO vendor_profiles (
          id, slug, name, owner, category, city, location, rating, review_count, price_from,
          response_time, verified, hero_tag, tagline, bio, cover_image, avatar, gallery_images,
          portfolio_images, specialties, amenities, cover_gradient, metrics, gallery, reviews,
          booking_windows, availability_rules, availability_overrides, blackout_dates,
          service_location_type, policies, social_links, state, area, latitude, longitude,
          location_precision, status, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, 5, 0, 0,
          $8, FALSE, $9, $10, $11, '', '', '[]'::jsonb,
          '[]'::jsonb, $12::jsonb, $13::jsonb, $14, $15::jsonb, '[]'::jsonb, '[]'::jsonb,
          $16::jsonb, $17::jsonb, $18::jsonb, '[]'::jsonb, $19, $20::jsonb, '{}'::jsonb,
          '', '', NULL, NULL, 'approx_area', 'active', NOW(), NOW()
        )
        RETURNING *
      `,
      [
        vendorId,
        vendorSlug,
        businessName,
        ownerName,
        category,
        city,
        location,
        "Pending approval",
        payload.heroTag || "New Hair Force partner",
        payload.notes || "Complete your stylist profile to start getting booked.",
        payload.notes || "This stylist account is setting up their Hair Force storefront.",
        JSON.stringify(toList(payload.specialties || category)),
        JSON.stringify(["Online booking", "Marketplace profile"]),
        "linear-gradient(135deg, rgba(54,110,255,.55), rgba(53,223,255,.2))",
        JSON.stringify({
          repeatClients: "0%",
          monthlyBookings: "0",
          showUpRate: "0%"
        }),
        JSON.stringify(bookingWindows),
        JSON.stringify(availabilityRules),
        JSON.stringify(availabilityOverrides),
        serviceLocationType,
        JSON.stringify({
          deposit: "Deposits are collected after approval when required.",
          cancellation: "Please cancel at least 24 hours before the appointment.",
          lateArrival: "Late arrivals may reduce service time.",
          prepInstructions: "Share photos and arrive prepared for your chosen service."
        })
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

  const availability = await getStylistAvailability(stylist.slug, {
    serviceId: service.id,
    minLeadHours: 0
  });
  const slotAvailable = availability.windows.some(
    (window) =>
      window.date === String(payload.appointmentDate || "").trim() &&
      window.slots.includes(String(payload.appointmentSlot || "").trim())
  );

  if (!slotAvailable) {
    throw new Error("That time is no longer available.");
  }

  const isApprovalBooking = true;
  const total = Math.round(Number(payload.total || service.price || 0));
  const calculatedDeposit = calculateDeposit(service, total);
  const depositAmount = Math.round(
    isApprovalBooking
      ? Number(payload.depositAmount ?? calculatedDeposit)
      : Number(payload.depositAmount ?? calculatedDeposit)
  );
  const paymentStatus = isApprovalBooking
    ? "pay_later"
    : payload.paymentStatus || (depositAmount ? "deposit_due" : "pay_later");
  const bookingStatus = isApprovalBooking ? "pending_approval" : payload.status || "confirmed";
  const requestedAt = new Date().toISOString();
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
    paymentStatus,
    paymentIntentId: payload.paymentIntentId || "",
    notes: payload.notes || "",
    status: bookingStatus,
    bookingMethod: service.bookingMethod || "approval",
    cancelledAt: null,
    cancellationReason: "",
    rescheduledAt: null,
    previousAppointmentDate: "",
    previousAppointmentSlot: "",
    requestedAt,
    approvedAt: isApprovalBooking ? null : requestedAt,
    declinedAt: null,
    source: payload.source || "web",
    createdAt: requestedAt
  };

  if (!hasDatabase) {
    const store = getDemoStore();
    store.bookings.unshift(bookingRecord);
    const conversation = await createOrGetBookingConversation(bookingRecord);
    await createVendorBookingNotification(bookingRecord, {
      type: isApprovalBooking ? "booking_request" : "booking_confirmed",
      title: isApprovalBooking ? "New booking request" : "New booking confirmed",
      message: isApprovalBooking
        ? `${bookingRecord.customerName} requested ${bookingRecord.serviceName} for ${bookingRecord.appointmentDate} at ${bookingRecord.appointmentSlot}.`
        : `${bookingRecord.customerName} booked ${bookingRecord.serviceName} for ${bookingRecord.appointmentDate} at ${bookingRecord.appointmentSlot}.`,
      conversationId: conversation?.id || "",
      metadata: {
        conversationId: conversation?.id || ""
      }
    });
    if (bookingRecord.customerId) {
      await createClientNotification({
        userId: bookingRecord.customerId,
        type: isApprovalBooking ? "booking_request" : "booking_confirmed",
        title: isApprovalBooking ? "Booking request sent" : "Appointment confirmed",
        message: isApprovalBooking
          ? `Your ${bookingRecord.serviceName} request with ${bookingRecord.vendorName} is waiting for approval.`
          : `Your ${bookingRecord.serviceName} appointment with ${bookingRecord.vendorName} is booked for ${bookingRecord.appointmentDate} at ${bookingRecord.appointmentSlot}.`,
        ctaLabel: isApprovalBooking ? "View request" : "Manage booking",
        ctaHref: "/dashboard?tab=bookings",
        metadata: {
          bookingId: bookingRecord.id,
          vendorSlug: bookingRecord.vendorSlug
        }
      });
    }
    return bookingRecord;
  }

  let rows;

  try {
    ({ rows } = await queryPostgres(
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
          $17, $18, $19, $20, NOW(), $21, $22,
          $23, $24, $25, $26,
          $27, $28, $29
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
        bookingRecord.createdAt,
        bookingRecord.cancelledAt,
        bookingRecord.cancellationReason,
        bookingRecord.rescheduledAt,
        bookingRecord.previousAppointmentDate || null,
        bookingRecord.previousAppointmentSlot || null,
        bookingRecord.bookingMethod,
        bookingRecord.requestedAt,
        bookingRecord.approvedAt,
        bookingRecord.declinedAt
      ]
    ));
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error("That time was just booked. Please choose another slot.");
    }

    throw error;
  }

  const booking = mapBookingRow(rows[0]);
  const conversation = await createOrGetBookingConversation(booking);
  await createVendorBookingNotification(booking, {
    type: isApprovalBooking ? "booking_request" : "booking_confirmed",
    title: isApprovalBooking ? "New booking request" : "New booking confirmed",
    message: isApprovalBooking
      ? `${booking.customerName} requested ${booking.serviceName} for ${booking.appointmentDate} at ${booking.appointmentSlot}.`
      : `${booking.customerName} booked ${booking.serviceName} for ${booking.appointmentDate} at ${booking.appointmentSlot}.`,
    conversationId: conversation?.id || "",
    metadata: {
      conversationId: conversation?.id || ""
    }
  });

  if (booking.customerId) {
    await createClientNotification({
      userId: booking.customerId,
      type: isApprovalBooking ? "booking_request" : "booking_confirmed",
      title: isApprovalBooking ? "Booking request sent" : "Appointment confirmed",
      message: isApprovalBooking
        ? `Your ${booking.serviceName} request with ${booking.vendorName} is waiting for approval.`
        : `Your ${booking.serviceName} appointment with ${booking.vendorName} is booked for ${booking.appointmentDate} at ${booking.appointmentSlot}.`,
      ctaLabel: isApprovalBooking ? "View request" : "Manage booking",
      ctaHref: "/dashboard?tab=bookings",
      metadata: {
        bookingId: booking.id,
        vendorSlug: booking.vendorSlug
      }
    });
  }

  return booking;
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
      const paymentMethods = (store.paymentMethods || [])
        .filter((item) => item.userId === user.id)
        .map(mapPaymentMethodRow)
        .sort((left, right) => Number(right.isDefault) - Number(left.isDefault));
      const preferences = mapNotificationPreferencesRow(
        (store.notificationPreferences || []).find((item) => item.userId === user.id) || null
      );
      const [conversations, notificationPreview] = await Promise.all([
        listBookingConversationsForUser(user),
        listVendorNotificationsForUser(user)
      ]);

      return {
        kind: "vendor",
        vendor: hydrateVendorWindows(vendor),
        services,
        bookings,
        conversations,
        notifications: notificationPreview.notifications,
        unreadNotificationCount: notificationPreview.unreadNotificationCount,
        notificationPreferences: preferences,
        accountSecurity: buildAccountSecurity(user),
        billing: buildVendorBilling(user, paymentMethods),
        summary: buildVendorSummary(hydrateVendorWindows(vendor), services, bookings)
      };
    }

    const vendorRow = await getVendorRowBySlug(user.vendorSlug);

    if (!vendorRow) {
      throw new Error("Vendor profile not found.");
    }

    const [serviceRows, bookingRows, conversations, notificationPreview, paymentMethodRows, preferenceRow] = await Promise.all([
      getServiceRowsByVendorSlug(user.vendorSlug, "created_at DESC"),
      getBookingRowsByVendorSlug(user.vendorSlug),
      listBookingConversationsForUser(user),
      listVendorNotificationsForUser(user),
      getPaymentMethodRowsByUserId(user.id),
      ensureNotificationPreferencesRow(user.id)
    ]);
    const vendor = mapVendorRow(vendorRow);
    const services = serviceRows.map(mapServiceRow);
    const bookings = bookingRows.map(mapBookingRow);
    const paymentMethods = paymentMethodRows.map(mapPaymentMethodRow);

    return {
      kind: "vendor",
      vendor,
      services,
      bookings,
      conversations,
      notifications: notificationPreview.notifications,
      unreadNotificationCount: notificationPreview.unreadNotificationCount,
      notificationPreferences: mapNotificationPreferencesRow(preferenceRow),
      accountSecurity: buildAccountSecurity(user),
      billing: buildVendorBilling(user, paymentMethods),
      summary: buildVendorSummary(vendor, services, bookings)
    };
  }

  return buildClientDashboardPayload(user);
}

export async function updateClientProfile(user, payload) {
  assertClientUser(user);
  const nextProfile = normalizeClientProfilePayload(payload);

  if (!hasDatabase) {
    const store = getDemoStore();
    const currentUser = store.users.find((item) => item.id === user.id);

    if (!currentUser) {
      throw new Error("User not found.");
    }

    if (
      nextProfile.phoneNormalized &&
      store.users.some(
        (item) => item.id !== user.id && (item.phoneNormalized || normalizePhone(item.phone)) === nextProfile.phoneNormalized
      )
    ) {
      throw new Error("That phone number is already linked to another account.");
    }

    Object.assign(currentUser, nextProfile);
    return sanitizeUser(currentUser);
  }

  try {
    const { rows } = await queryPostgres(
      `
        UPDATE users
        SET name = $2,
            phone = $3,
            phone_normalized = $4,
            city = $5,
            avatar = $6,
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [
        user.id,
        nextProfile.name,
        nextProfile.phone,
        nextProfile.phoneNormalized,
        nextProfile.city,
        nextProfile.avatar
      ]
    );

    if (!rows.length) {
      throw new Error("User not found.");
    }

    return mapUserRow(rows[0]);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new Error("That phone number is already linked to another account.");
    }

    throw error;
  }
}

function normalizeLoginEmailPayload(payload) {
  const email = normalizeEmail(payload.email);

  if (!email || !email.includes("@")) {
    throw new Error("Enter a valid email address.");
  }

  if (isPhonePlaceholderEmail(email)) {
    throw new Error("Enter a valid email address.");
  }

  return email;
}

function assertEmailBasedAccount(user) {
  const security = buildAccountSecurity(user);

  if (!security.canChangeLoginEmail || !security.canChangePassword) {
    throw new Error("Login email and password changes are only available for email-based accounts.");
  }
}

export async function changeDashboardLoginEmail(user, payload) {
  assertDashboardAccountUser(user);
  assertEmailBasedAccount(user);
  const email = normalizeLoginEmailPayload(payload);

  if (!hasDatabase) {
    const store = getDemoStore();
    const currentUser = store.users.find((item) => item.id === user.id);

    if (!currentUser) {
      throw new Error("User not found.");
    }

    const existing = store.users.find(
      (item) => item.id !== user.id && normalizeEmail(item.email) === email
    );

    if (existing) {
      throw new Error("An account with this email already exists.");
    }

    currentUser.email = email;
    currentUser.updatedAt = new Date().toISOString();
    return sanitizeUser(currentUser);
  }

  const existing = await getUserRowByEmail(email);

  if (existing && existing.id !== user.id) {
    throw new Error("An account with this email already exists.");
  }

  const { rows } = await queryPostgres(
    `
      UPDATE users
      SET email = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [user.id, email]
  );

  if (!rows.length) {
    throw new Error("User not found.");
  }

  return mapUserRow(rows[0]);
}

function getDemoPasswordChangeSessions() {
  const store = getDemoStore();

  if (!Array.isArray(store.passwordChangeSessions)) {
    store.passwordChangeSessions = [];
  }

  return store.passwordChangeSessions;
}

export async function requestPasswordChangeCode(user) {
  assertDashboardAccountUser(user);
  assertEmailBasedAccount(user);

  const code = generateOtpCode();
  const codeHash = createOtpHash(code, user.id);
  const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString();

  if (!hasDatabase) {
    const sessions = getDemoPasswordChangeSessions();

    // Consume any active session for this user
    sessions.forEach((session) => {
      if (session.userId === user.id && !session.consumedAt) {
        session.consumedAt = new Date().toISOString();
      }
    });

    sessions.unshift({
      id: `pwd-change-${randomUUID()}`,
      userId: user.id,
      codeHash,
      attemptsRemaining: 5,
      expiresAt,
      consumedAt: null
    });

    return {
      email: user.email,
      expiresIn: OTP_TTL_SECONDS
    };
  }

  await withPostgresTransaction(async (db) => {
    await db.query(
      `
        UPDATE password_change_sessions
        SET consumed_at = NOW()
        WHERE user_id = $1 AND consumed_at IS NULL
      `,
      [user.id]
    );

    await db.query(
      `
        INSERT INTO password_change_sessions (
          id, user_id, code_hash, attempts_remaining, expires_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
      `,
      [`pwd-change-${randomUUID()}`, user.id, codeHash, 5, expiresAt]
    );
  });

  return {
    email: user.email,
    expiresIn: OTP_TTL_SECONDS
  };
}

export async function verifyPasswordChangeCode(user, code) {
  assertDashboardAccountUser(user);

  const normalizedCode = String(code || "").replace(/\D/g, "").slice(0, OTP_LENGTH);

  if (normalizedCode.length !== OTP_LENGTH) {
    throw new Error(`Enter the ${OTP_LENGTH}-digit verification code.`);
  }

  if (!hasDatabase) {
    const sessions = getDemoPasswordChangeSessions();
    const activeSession = sessions.find(
      (session) => session.userId === user.id && !session.consumedAt
    );

    if (!activeSession) {
      throw new Error("Request a fresh verification code first.");
    }

    if (new Date(activeSession.expiresAt).getTime() <= Date.now()) {
      throw new Error("This code has expired. Request a new one.");
    }

    if (activeSession.codeHash !== createOtpHash(normalizedCode, user.id)) {
      activeSession.attemptsRemaining = Math.max(
        0,
        Number(activeSession.attemptsRemaining || 0) - 1
      );

      if (!activeSession.attemptsRemaining) {
        activeSession.consumedAt = new Date().toISOString();
        throw new Error("Too many incorrect attempts. Request a new code.");
      }

      throw new Error(
        `Incorrect code. ${activeSession.attemptsRemaining} attempt${activeSession.attemptsRemaining === 1 ? "" : "s"} left.`
      );
    }

    activeSession.consumedAt = new Date().toISOString();
    return { verified: true };
  }

  const { rows } = await queryPostgres(
    `
      SELECT * FROM password_change_sessions
      WHERE user_id = $1 AND consumed_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [user.id]
  );

  const activeSession = rows[0];

  if (!activeSession) {
    throw new Error("Request a fresh verification code first.");
  }

  if (new Date(activeSession.expires_at).getTime() <= Date.now()) {
    throw new Error("This code has expired. Request a new one.");
  }

  if (activeSession.code_hash !== createOtpHash(normalizedCode, user.id)) {
    const attemptsRemaining = Math.max(0, Number(activeSession.attempts_remaining || 0) - 1);

    await queryPostgres(
      `
        UPDATE password_change_sessions
        SET attempts_remaining = $2,
            consumed_at = CASE WHEN $2 = 0 THEN NOW() ELSE consumed_at END
        WHERE id = $1
      `,
      [activeSession.id, attemptsRemaining]
    );

    if (!attemptsRemaining) {
      throw new Error("Too many incorrect attempts. Request a new code.");
    }

    throw new Error(
      `Incorrect code. ${attemptsRemaining} attempt${attemptsRemaining === 1 ? "" : "s"} left.`
    );
  }

  await queryPostgres(
    `
      UPDATE password_change_sessions
      SET consumed_at = NOW()
      WHERE id = $1
    `,
    [activeSession.id]
  );

  return { verified: true };
}

export async function changeDashboardPassword(user, payload) {
  assertDashboardAccountUser(user);
  assertEmailBasedAccount(user);
  const currentPassword = String(payload.currentPassword || "");
  const password = String(payload.password || "");
  const confirmPassword = String(payload.confirmPassword || "");
  const code = String(payload.code || "");

  if (!currentPassword || !password || !confirmPassword) {
    throw new Error("Current password and both new password fields are required.");
  }

  if (!code) {
    throw new Error("Verification code is required. Request a code to continue.");
  }

  if (password !== confirmPassword) {
    throw new Error("Passwords do not match.");
  }

  if (password.length < 8) {
    throw new Error("Your new password must be at least 8 characters.");
  }

  // Verify the OTP code before changing password
  await verifyPasswordChangeCode(user, code);

  if (!hasDatabase) {
    const store = getDemoStore();
    const currentUser = store.users.find((item) => item.id === user.id);

    if (!currentUser) {
      throw new Error("User not found.");
    }

    const valid = await compare(currentPassword, currentUser.passwordHash);

    if (!valid) {
      throw new Error("Current password is incorrect.");
    }

    currentUser.passwordHash = await hash(password, 10);
    return sanitizeUser(currentUser);
  }

  const currentUser = await getUserRowById(user.id);

  if (!currentUser) {
    throw new Error("User not found.");
  }

  const valid = await compare(currentPassword, currentUser.password_hash);

  if (!valid) {
    throw new Error("Current password is incorrect.");
  }

  const passwordHash = await hash(password, 10);
  const { rows } = await queryPostgres(
    `
      UPDATE users
      SET password_hash = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [user.id, passwordHash]
  );

  return mapUserRow(rows[0] || currentUser);
}

export async function changeClientPassword(user, payload) {
  assertClientUser(user);
  return changeDashboardPassword(user, payload);
}

export async function addFavoriteStylist(user, vendorSlug) {
  assertClientUser(user);
  const slug = String(vendorSlug || "").trim();

  if (!slug) {
    throw new Error("Vendor is required.");
  }

  const stylist = await getStylistBySlug(slug);

  if (!stylist) {
    throw new Error("Stylist not found.");
  }

  if (!hasDatabase) {
    const store = getDemoStore();

    if (!Array.isArray(store.favorites)) {
      store.favorites = [];
    }

    const exists = store.favorites.some(
      (favorite) => favorite.userId === user.id && favorite.vendorSlug === slug
    );

    if (!exists) {
      store.favorites.unshift({
        userId: user.id,
        vendorSlug: slug,
        createdAt: new Date().toISOString()
      });
      await createClientNotification({
        userId: user.id,
        type: "favorite_saved",
        title: "Stylist saved",
        message: `${stylist.name} was added to your saved stylists.`,
        ctaLabel: "View stylist",
        ctaHref: `/stylists/${slug}`,
        metadata: { vendorSlug: slug }
      });
    }

    return buildClientDashboardPayload(user);
  }

  await queryPostgres(
    `
      INSERT INTO client_favorites (user_id, vendor_slug, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (user_id, vendor_slug) DO NOTHING
    `,
    [user.id, slug]
  );

  await createClientNotification({
    userId: user.id,
    type: "favorite_saved",
    title: "Stylist saved",
    message: `${stylist.name} was added to your saved stylists.`,
    ctaLabel: "View stylist",
    ctaHref: `/stylists/${slug}`,
    metadata: { vendorSlug: slug }
  });

  return buildClientDashboardPayload(user);
}

export async function removeFavoriteStylist(user, vendorSlug) {
  assertClientUser(user);
  const slug = String(vendorSlug || "").trim();

  if (!slug) {
    throw new Error("Vendor is required.");
  }

  if (!hasDatabase) {
    const store = getDemoStore();
    store.favorites = (store.favorites || []).filter(
      (favorite) => !(favorite.userId === user.id && favorite.vendorSlug === slug)
    );
    return buildClientDashboardPayload(user);
  }

  await queryPostgres(
    `DELETE FROM client_favorites WHERE user_id = $1 AND vendor_slug = $2`,
    [user.id, slug]
  );

  return buildClientDashboardPayload(user);
}

export async function isFavoriteStylist(user, vendorSlug) {
  assertClientUser(user);
  const slug = String(vendorSlug || "").trim();

  if (!slug) {
    return false;
  }

  if (!hasDatabase) {
    const store = getDemoStore();
    return (store.favorites || []).some(
      (favorite) => favorite.userId === user.id && favorite.vendorSlug === slug
    );
  }

  const rows = await queryPostgres(
    `SELECT 1 FROM client_favorites WHERE user_id = $1 AND vendor_slug = $2 LIMIT 1`,
    [user.id, slug]
  );

  return rows.length > 0;
}

export async function markClientNotificationRead(user, notificationId) {
  assertClientUser(user);

  if (!hasDatabase) {
    const store = getDemoStore();
    const notification = (store.notifications || []).find(
      (item) => item.id === notificationId && item.userId === user.id
    );

    if (!notification) {
      throw new Error("Notification not found.");
    }

    notification.readAt = notification.readAt || new Date().toISOString();
    notification.updatedAt = new Date().toISOString();
    return mapClientNotificationRow(notification);
  }

  const { rows } = await queryPostgres(
    `
      UPDATE client_notifications
      SET read_at = COALESCE(read_at, NOW()),
          updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `,
    [notificationId, user.id]
  );

  if (!rows.length) {
    throw new Error("Notification not found.");
  }

  return mapClientNotificationRow(rows[0]);
}

export async function markAllClientNotificationsRead(user) {
  assertClientUser(user);

  if (!hasDatabase) {
    const now = new Date().toISOString();
    (getDemoStore().notifications || []).forEach((item) => {
      if (item.userId === user.id && !item.readAt) {
        item.readAt = now;
        item.updatedAt = now;
      }
    });

    return buildClientDashboardPayload(user);
  }

  await queryPostgres(
    `
      UPDATE client_notifications
      SET read_at = COALESCE(read_at, NOW()),
          updated_at = NOW()
      WHERE user_id = $1 AND read_at IS NULL
    `,
    [user.id]
  );

  return buildClientDashboardPayload(user);
}

export async function updateDashboardNotificationPreferences(user, payload) {
  assertDashboardAccountUser(user);
  const preferences = normalizeNotificationPreferencesPayload(payload);

  if (!hasDatabase) {
    const store = getDemoStore();

    if (!Array.isArray(store.notificationPreferences)) {
      store.notificationPreferences = [];
    }

    const existing = store.notificationPreferences.find((item) => item.userId === user.id);

    if (existing) {
      Object.assign(existing, preferences, { updatedAt: new Date().toISOString() });
    } else {
      store.notificationPreferences.unshift({
        userId: user.id,
        ...preferences,
        updatedAt: new Date().toISOString()
      });
    }

    return mapNotificationPreferencesRow(
      store.notificationPreferences.find((item) => item.userId === user.id)
    );
  }

  const { rows } = await queryPostgres(
    `
      INSERT INTO client_notification_preferences (
        user_id, booking_updates, client_messages, reminders, payment_alerts,
        review_requests, recommendations, security_alerts, marketing_texts,
        quiet_hours_enabled, quiet_hours_from, quiet_hours_to, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        booking_updates = EXCLUDED.booking_updates,
        client_messages = EXCLUDED.client_messages,
        reminders = EXCLUDED.reminders,
        payment_alerts = EXCLUDED.payment_alerts,
        review_requests = EXCLUDED.review_requests,
        recommendations = EXCLUDED.recommendations,
        security_alerts = EXCLUDED.security_alerts,
        marketing_texts = EXCLUDED.marketing_texts,
        quiet_hours_enabled = EXCLUDED.quiet_hours_enabled,
        quiet_hours_from = EXCLUDED.quiet_hours_from,
        quiet_hours_to = EXCLUDED.quiet_hours_to,
        updated_at = NOW()
      RETURNING *
    `,
    [
      user.id,
      preferences.bookingUpdates,
      preferences.clientMessages,
      preferences.reminders,
      preferences.paymentAlerts,
      preferences.reviewRequests,
      preferences.recommendations,
      preferences.securityAlerts,
      preferences.marketingTexts,
      preferences.quietHoursEnabled,
      preferences.quietHoursFrom,
      preferences.quietHoursTo
    ]
  );

  return mapNotificationPreferencesRow(rows[0]);
}

export async function updateClientNotificationPreferences(user, payload) {
  assertClientUser(user);
  return updateDashboardNotificationPreferences(user, payload);
}

async function getDashboardPaymentMethodById(user, methodId) {
  assertDashboardAccountUser(user);

  if (!hasDatabase) {
    const method = (getDemoStore().paymentMethods || []).find(
      (item) => item.userId === user.id && String(item.id) === String(methodId)
    );
    return method ? mapPaymentMethodRow(method) : null;
  }

  const { rows } = await queryPostgres(
    `
      SELECT *
      FROM client_payment_methods
      WHERE id = $1 AND user_id = $2
      LIMIT 1
    `,
    [methodId, user.id]
  );

  return mapPaymentMethodRow(rows[0] || null);
}

async function getClientPaymentMethodById(user, methodId) {
  assertClientUser(user);
  return getDashboardPaymentMethodById(user, methodId);
}

async function createClientPaymentRecord(payload) {
  const record = {
    id: payload.id || `pay-${randomUUID()}`,
    userId: payload.userId,
    bookingId: payload.bookingId || null,
    paymentMethodId: payload.paymentMethodId || null,
    amount: Number(payload.amount || 0),
    currency: payload.currency || "USD",
    status: payload.status || "succeeded",
    type: payload.type || "deposit",
    provider: payload.provider || "stripe",
    paymentIntentId: payload.paymentIntentId || "",
    receiptUrl: payload.receiptUrl || "",
    description: payload.description || "",
    createdAt: payload.createdAt || new Date().toISOString(),
    updatedAt: payload.updatedAt || payload.createdAt || new Date().toISOString()
  };

  if (!record.userId) {
    throw new Error("Payment user is required.");
  }

  if (!hasDatabase) {
    const store = getDemoStore();

    if (!Array.isArray(store.paymentRecords)) {
      store.paymentRecords = [];
    }

    store.paymentRecords.unshift(record);
    return mapPaymentRecordRow(record);
  }

  const { rows } = await queryPostgres(
    `
      INSERT INTO client_payment_records (
        id, user_id, booking_id, payment_method_id, amount, currency, status, type,
        provider, payment_intent_id, receipt_url, description, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, NOW(), NOW()
      )
      RETURNING *
    `,
    [
      record.id,
      record.userId,
      record.bookingId,
      record.paymentMethodId,
      record.amount,
      record.currency,
      record.status,
      record.type,
      record.provider,
      record.paymentIntentId,
      record.receiptUrl,
      record.description
    ]
  );

  return mapPaymentRecordRow(rows[0]);
}

export async function addDashboardPaymentMethod(user, payload) {
  assertDashboardAccountUser(user);
  const method = normalizePaymentMethodPayload(payload);

  if (!hasDatabase) {
    const store = getDemoStore();

    if (!Array.isArray(store.paymentMethods)) {
      store.paymentMethods = [];
    }

    const existingMethods = store.paymentMethods.filter((item) => item.userId === user.id);
    const shouldDefault = method.isDefault || !existingMethods.length;

    if (shouldDefault) {
      existingMethods.forEach((item) => {
        item.isDefault = false;
        item.updatedAt = new Date().toISOString();
      });
    }

    store.paymentMethods.unshift({
      id: `pm-${Date.now()}`,
      userId: user.id,
      ...method,
      isDefault: shouldDefault,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    await createClientNotification({
      userId: user.id,
      type: "payment_method_added",
      title: "Payment method added",
      message: `${method.brand} ending in ${method.last4} is ready for ${user.role === "vendor" ? "plan billing" : "upcoming bookings"}.`,
      ctaLabel: user.role === "vendor" ? "Open plan billing" : "Open payments",
      ctaHref: user.role === "vendor" ? "/dashboard?section=settings" : "/dashboard?tab=payments"
    });

    return getDashboardDataForUser(user);
  }

  return withPostgresTransaction(async (db) => {
    const existingResult = await db.query(
      `SELECT id FROM client_payment_methods WHERE user_id = $1 ORDER BY created_at DESC`,
      [user.id]
    );
    const shouldDefault = method.isDefault || !existingResult.rows.length;

    if (shouldDefault) {
      await db.query(
        `UPDATE client_payment_methods SET is_default = FALSE, updated_at = NOW() WHERE user_id = $1`,
        [user.id]
      );
    }

    await db.query(
      `
        INSERT INTO client_payment_methods (
          id, user_id, provider, brand, last4, exp_month, exp_year, holder_name, is_default, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `,
      [
        `pm-${randomUUID()}`,
        user.id,
        method.provider,
        method.brand,
        method.last4,
        method.expMonth,
        method.expYear,
        method.holderName,
        shouldDefault
      ]
    );
  }).then(async () => {
    await createClientNotification({
      userId: user.id,
      type: "payment_method_added",
      title: "Payment method added",
      message: `${method.brand} ending in ${method.last4} is ready for ${user.role === "vendor" ? "plan billing" : "upcoming bookings"}.`,
      ctaLabel: user.role === "vendor" ? "Open plan billing" : "Open payments",
      ctaHref: user.role === "vendor" ? "/dashboard?section=settings" : "/dashboard?tab=payments"
    });
    return getDashboardDataForUser(user);
  });
}

export async function addClientPaymentMethod(user, payload) {
  assertClientUser(user);
  return addDashboardPaymentMethod(user, payload);
}

export async function setDefaultDashboardPaymentMethod(user, methodId) {
  assertDashboardAccountUser(user);
  const method = await getDashboardPaymentMethodById(user, methodId);

  if (!method) {
    throw new Error("Payment method not found.");
  }

  if (!hasDatabase) {
    const store = getDemoStore();
    (store.paymentMethods || []).forEach((item) => {
      if (item.userId === user.id) {
        item.isDefault = String(item.id) === String(methodId);
        item.updatedAt = new Date().toISOString();
      }
    });
    return getDashboardDataForUser(user);
  }

  await withPostgresTransaction(async (db) => {
    await db.query(
      `UPDATE client_payment_methods SET is_default = FALSE, updated_at = NOW() WHERE user_id = $1`,
      [user.id]
    );
    await db.query(
      `UPDATE client_payment_methods SET is_default = TRUE, updated_at = NOW() WHERE id = $1 AND user_id = $2`,
      [methodId, user.id]
    );
  });

  return getDashboardDataForUser(user);
}

export async function setDefaultClientPaymentMethod(user, methodId) {
  assertClientUser(user);
  return setDefaultDashboardPaymentMethod(user, methodId);
}

export async function removeDashboardPaymentMethod(user, methodId) {
  assertDashboardAccountUser(user);
  const method = await getDashboardPaymentMethodById(user, methodId);

  if (!method) {
    throw new Error("Payment method not found.");
  }

  if (!hasDatabase) {
    const store = getDemoStore();
    const nextMethods = (store.paymentMethods || []).filter(
      (item) => !(item.userId === user.id && String(item.id) === String(methodId))
    );
    const remaining = nextMethods.filter((item) => item.userId === user.id);

    if (method.isDefault && remaining.length) {
      remaining[0].isDefault = true;
      remaining[0].updatedAt = new Date().toISOString();
    }

    store.paymentMethods = nextMethods;
    return getDashboardDataForUser(user);
  }

  await withPostgresTransaction(async (db) => {
    await db.query(
      `DELETE FROM client_payment_methods WHERE id = $1 AND user_id = $2`,
      [methodId, user.id]
    );

    if (method.isDefault) {
      const replacement = await db.query(
        `
          SELECT id
          FROM client_payment_methods
          WHERE user_id = $1
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [user.id]
      );

      if (replacement.rows[0]?.id) {
        await db.query(
          `UPDATE client_payment_methods SET is_default = TRUE, updated_at = NOW() WHERE id = $1`,
          [replacement.rows[0].id]
        );
      }
    }
  });

  return getDashboardDataForUser(user);
}

export async function removeClientPaymentMethod(user, methodId) {
  assertClientUser(user);
  return removeDashboardPaymentMethod(user, methodId);
}

export async function getClientReceipt(user, receiptId) {
  assertClientUser(user);

  if (!hasDatabase) {
    const paymentRecord = (getDemoStore().paymentRecords || []).find(
      (item) => item.userId === user.id && String(item.id) === String(receiptId)
    );

    if (!paymentRecord || paymentRecord.status !== "succeeded") {
      throw new Error("Receipt not found.");
    }

    const booking = (getDemoStore().bookings || []).find(
      (item) => String(item.id) === String(paymentRecord.bookingId)
    );
    const method = (getDemoStore().paymentMethods || []).find(
      (item) => String(item.id) === String(paymentRecord.paymentMethodId)
    );

    return {
      record: mapPaymentRecordRow({
        ...paymentRecord,
        booking_service_name: booking?.serviceName || "",
        booking_vendor_name: booking?.vendorName || "",
        booking_vendor_slug: booking?.vendorSlug || "",
        booking_appointment_date: booking?.appointmentDate || "",
        payment_method_brand: method?.brand || "",
        payment_method_last4: method?.last4 || ""
      })
    };
  }

  const { rows } = await queryPostgres(
    `
      SELECT
        client_payment_records.*,
        bookings.service_name AS booking_service_name,
        bookings.vendor_name AS booking_vendor_name,
        bookings.vendor_slug AS booking_vendor_slug,
        bookings.appointment_date AS booking_appointment_date,
        client_payment_methods.brand AS payment_method_brand,
        client_payment_methods.last4 AS payment_method_last4
      FROM client_payment_records
      LEFT JOIN bookings ON bookings.id = client_payment_records.booking_id
      LEFT JOIN client_payment_methods ON client_payment_methods.id = client_payment_records.payment_method_id
      WHERE client_payment_records.id = $1
        AND client_payment_records.user_id = $2
        AND client_payment_records.status = 'succeeded'
      LIMIT 1
    `,
    [receiptId, user.id]
  );

  if (!rows.length) {
    throw new Error("Receipt not found.");
  }

  return { record: mapPaymentRecordRow(rows[0]) };
}

export async function payClientBooking(user, bookingId, payload = {}) {
  assertClientUser(user);
  const booking = await getClientBookingById(user, bookingId);
  const paymentMethodId = String(payload.paymentMethodId || "").trim();
  const action = payload.action === "retry" ? "retry" : "pay";
  const paymentMethod = await getClientPaymentMethodById(user, paymentMethodId);

  if (!paymentMethod) {
    throw new Error("Choose a saved payment method first.");
  }

  const amount = getBookingPaymentDueAmount(booking);

  if (!amount) {
    throw new Error("This booking has no online payment due.");
  }

  const nextStatus = booking.paymentStatus === "deposit_due" ? "deposit_paid" : "paid_in_full";
  const nextRemainingAmount = nextStatus === "paid_in_full" ? 0 : Number(booking.remainingAmount || 0);
  const paymentType = booking.paymentStatus === "deposit_due" ? "deposit" : "full";
  const paymentIntentId = `pi_${randomUUID().replace(/-/g, "").slice(0, 16)}`;

  if (!hasDatabase) {
    const store = getDemoStore();
    const currentBooking = store.bookings.find((item) => String(item.id) === String(bookingId));

    if (!currentBooking) {
      throw new Error("Booking not found.");
    }

    currentBooking.paymentStatus = nextStatus;
    currentBooking.remainingAmount = nextRemainingAmount;
    currentBooking.paymentIntentId = paymentIntentId;
    currentBooking.updatedAt = new Date().toISOString();

    await createClientPaymentRecord({
      userId: user.id,
      bookingId: currentBooking.id,
      paymentMethodId: paymentMethod.id,
      amount,
      status: "succeeded",
      type: paymentType,
      provider: paymentMethod.provider,
      paymentIntentId,
      receiptUrl: `https://payments.hairforce.local/receipts/pay-${currentBooking.id}-${Date.now()}`,
      description: `${action === "retry" ? "Retry" : "Payment"} for ${currentBooking.serviceName}`
    });

    await createClientNotification({
      userId: user.id,
      type: "payment_success",
      title: "Payment received",
      message: `${formatCurrency(amount)} was applied to your ${currentBooking.serviceName} booking.`,
      ctaLabel: "View payments",
      ctaHref: "/dashboard?tab=payments",
      metadata: { bookingId: currentBooking.id }
    });

    return buildClientDashboardPayload(user);
  }

  await withPostgresTransaction(async (db) => {
    const result = await db.query(
      `
        UPDATE bookings
        SET payment_status = $3,
            remaining_amount = $4,
            payment_intent_id = $5,
            updated_at = NOW()
        WHERE id = $1
          AND (
            customer_id = $2
            OR ($6 <> '' AND LOWER(customer_email) = LOWER($6))
          )
        RETURNING id, service_name
      `,
      [bookingId, user.id, nextStatus, nextRemainingAmount, paymentIntentId, user.email || ""]
    );

    if (!result.rows.length) {
      throw new Error("Booking not found.");
    }

    await db.query(
      `
        INSERT INTO client_payment_records (
          id, user_id, booking_id, payment_method_id, amount, currency, status, type,
          provider, payment_intent_id, receipt_url, description, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, 'USD', 'succeeded', $6,
          $7, $8, $9, $10, NOW(), NOW()
        )
      `,
      [
        `pay-${randomUUID()}`,
        user.id,
        bookingId,
        paymentMethod.id,
        amount,
        paymentType,
        paymentMethod.provider,
        paymentIntentId,
        `https://payments.hairforce.local/receipts/${bookingId}-${Date.now()}`,
        `${action === "retry" ? "Retry" : "Payment"} for ${booking.serviceName}`
      ]
    );
  });

  await createClientNotification({
    userId: user.id,
    type: "payment_success",
    title: "Payment received",
    message: `${formatCurrency(amount)} was applied to your ${booking.serviceName} booking.`,
    ctaLabel: "View payments",
    ctaHref: "/dashboard?tab=payments",
    metadata: { bookingId }
  });

  return buildClientDashboardPayload(user);
}

export async function getBookingAvailabilityForClient(user, bookingId) {
  assertClientUser(user);
  const booking = await getClientBookingById(user, bookingId);

  if (!canSelfServeBooking(booking)) {
    throw new Error("This booking can only be changed more than 24 hours before the appointment.");
  }

  const stylist = await getStylistBySlug(booking.vendorSlug);

  if (!stylist) {
    throw new Error("Stylist not found.");
  }

  const vendorBookings = await getVendorBookingsForReschedule(booking.vendorSlug);
  const windows = buildRescheduleWindows(stylist, vendorBookings, booking.id);

  return {
    booking,
    windows
  };
}

export async function cancelClientBooking(user, bookingId, payload = {}) {
  assertClientUser(user);
  const booking = await getClientBookingById(user, bookingId);

  if (!canSelfServeBooking(booking)) {
    throw new Error("This booking can only be cancelled more than 24 hours before the appointment.");
  }

  const cancellationReason = String(payload.reason || "").trim();

  if (!hasDatabase) {
    const store = getDemoStore();
    const currentBooking = store.bookings.find((item) => String(item.id) === String(bookingId));

    if (!currentBooking) {
      throw new Error("Booking not found.");
    }

    currentBooking.status = "cancelled";
    currentBooking.cancelledAt = new Date().toISOString();
    currentBooking.cancellationReason = cancellationReason;
    currentBooking.updatedAt = new Date().toISOString();

    await createClientNotification({
      userId: user.id,
      type: "booking_cancelled",
      title: "Appointment cancelled",
      message: `Your ${currentBooking.serviceName} appointment with ${currentBooking.vendorName} was cancelled.`,
      ctaLabel: "Book again",
      ctaHref: `/book/${currentBooking.vendorSlug}`,
      metadata: { bookingId: currentBooking.id, vendorSlug: currentBooking.vendorSlug }
    });

    await createVendorBookingNotification(currentBooking, {
      type: "booking_cancelled",
      title: "Client cancelled appointment",
      message: `${currentBooking.customerName} cancelled ${currentBooking.serviceName} for ${currentBooking.appointmentDate} at ${currentBooking.appointmentSlot}.`,
      metadata: {
        cancellationReason
      }
    });

    return decorateClientBooking(currentBooking);
  }

  const { rows } = await queryPostgres(
    `
      UPDATE bookings
      SET status = 'cancelled',
          cancelled_at = NOW(),
          cancellation_reason = $3,
          updated_at = NOW()
      WHERE id = $1
        AND (
          customer_id = $2
          OR ($4 <> '' AND LOWER(customer_email) = LOWER($4))
        )
      RETURNING *
    `,
    [bookingId, user.id, cancellationReason, user.email || ""]
  );

  if (!rows.length) {
    throw new Error("Booking not found.");
  }

  const updatedBooking = mapBookingRow(rows[0]);

  await createClientNotification({
    userId: user.id,
    type: "booking_cancelled",
    title: "Appointment cancelled",
    message: `Your ${updatedBooking.serviceName} appointment with ${updatedBooking.vendorName} was cancelled.`,
    ctaLabel: "Book again",
    ctaHref: `/book/${updatedBooking.vendorSlug}`,
    metadata: { bookingId: updatedBooking.id, vendorSlug: updatedBooking.vendorSlug }
  });

  await createVendorBookingNotification(updatedBooking, {
    type: "booking_cancelled",
    title: "Client cancelled appointment",
    message: `${updatedBooking.customerName} cancelled ${updatedBooking.serviceName} for ${updatedBooking.appointmentDate} at ${updatedBooking.appointmentSlot}.`,
    metadata: {
      cancellationReason
    }
  });

  return decorateClientBooking(updatedBooking);
}

export async function rescheduleClientBooking(user, bookingId, payload) {
  assertClientUser(user);
  const booking = await getClientBookingById(user, bookingId);

  if (!canSelfServeBooking(booking)) {
    throw new Error("This booking can only be rescheduled more than 24 hours before the appointment.");
  }

  const appointmentDate = String(payload.appointmentDate || "").trim();
  const appointmentSlot = String(payload.appointmentSlot || "").trim();

  if (!appointmentDate || !appointmentSlot) {
    throw new Error("Choose a new date and time.");
  }

  const availability = await getBookingAvailabilityForClient(user, bookingId);
  const allowedSlot = availability.windows.some(
    (window) => window.date === appointmentDate && window.slots.includes(appointmentSlot)
  );

  if (!allowedSlot) {
    throw new Error("That slot is no longer available.");
  }

  if (appointmentDate === booking.appointmentDate && appointmentSlot === booking.appointmentSlot) {
    throw new Error("Choose a different slot to reschedule this booking.");
  }

  if (!hasDatabase) {
    const store = getDemoStore();
    const currentBooking = store.bookings.find((item) => String(item.id) === String(bookingId));

    if (!currentBooking) {
      throw new Error("Booking not found.");
    }

    currentBooking.previousAppointmentDate = currentBooking.appointmentDate;
    currentBooking.previousAppointmentSlot = currentBooking.appointmentSlot;
    currentBooking.appointmentDate = appointmentDate;
    currentBooking.appointmentSlot = appointmentSlot;
    currentBooking.rescheduledAt = new Date().toISOString();
    currentBooking.updatedAt = new Date().toISOString();

    await createClientNotification({
      userId: user.id,
      type: "booking_rescheduled",
      title: "Appointment rescheduled",
      message: `Your ${currentBooking.serviceName} appointment is now set for ${appointmentDate} at ${appointmentSlot}.`,
      ctaLabel: "Manage booking",
      ctaHref: "/dashboard?tab=bookings",
      metadata: { bookingId: currentBooking.id, vendorSlug: currentBooking.vendorSlug }
    });

    await createVendorBookingNotification(currentBooking, {
      type: "booking_rescheduled",
      title: "Client rescheduled appointment",
      message: `${currentBooking.customerName} moved ${currentBooking.serviceName} to ${appointmentDate} at ${appointmentSlot}.`,
      metadata: {
        previousAppointmentDate: currentBooking.previousAppointmentDate,
        previousAppointmentSlot: currentBooking.previousAppointmentSlot
      }
    });

    return decorateClientBooking(currentBooking);
  }

  const { rows } = await queryPostgres(
    `
      UPDATE bookings
      SET previous_appointment_date = appointment_date,
          previous_appointment_slot = appointment_slot,
          appointment_date = $3,
          appointment_slot = $4,
          rescheduled_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
        AND (
          customer_id = $2
          OR ($5 <> '' AND LOWER(customer_email) = LOWER($5))
        )
      RETURNING *
    `,
    [bookingId, user.id, appointmentDate, appointmentSlot, user.email || ""]
  );

  if (!rows.length) {
    throw new Error("Booking not found.");
  }

  const updatedBooking = mapBookingRow(rows[0]);

  await createClientNotification({
    userId: user.id,
    type: "booking_rescheduled",
    title: "Appointment rescheduled",
    message: `Your ${updatedBooking.serviceName} appointment is now set for ${appointmentDate} at ${appointmentSlot}.`,
    ctaLabel: "Manage booking",
    ctaHref: "/dashboard?tab=bookings",
    metadata: { bookingId: updatedBooking.id, vendorSlug: updatedBooking.vendorSlug }
  });

  await createVendorBookingNotification(updatedBooking, {
    type: "booking_rescheduled",
    title: "Client rescheduled appointment",
    message: `${updatedBooking.customerName} moved ${updatedBooking.serviceName} to ${appointmentDate} at ${appointmentSlot}.`,
    metadata: {
      previousAppointmentDate: updatedBooking.previousAppointmentDate,
      previousAppointmentSlot: updatedBooking.previousAppointmentSlot
    }
  });

  return decorateClientBooking(updatedBooking);
}

export async function getVendorBookingAvailability(user, bookingId) {
  const booking = await getVendorBookingById(user, bookingId);
  const stylist = await getStylistBySlug(user.vendorSlug);

  if (!stylist) {
    throw new Error("Stylist not found.");
  }

  const vendorBookings = await getVendorBookingsForReschedule(user.vendorSlug);

  return {
    booking,
    windows: buildLiveBookingWindows(stylist, vendorBookings, {
      ignoredBookingId: booking.id,
      minLeadHours: 0,
      daysAhead: 45,
      maxWindows: 12
    })
  };
}

export async function getVendorAvailabilityCalendar(user, options = {}) {
  assertVendorUser(user);
  const view = String(options.view || "week").trim().toLowerCase();
  const referenceDate = String(options.referenceDate || "").trim();

  if (!hasDatabase) {
    const store = getDemoStore();
    const rawVendor = store.vendors.find((item) => item.slug === user.vendorSlug);
    const services = store.services.filter((service) => service.vendorSlug === user.vendorSlug);
    const bookings = store.bookings.filter((booking) => booking.vendorSlug === user.vendorSlug);

    if (!rawVendor) {
      throw new Error("Vendor profile not found.");
    }

    const vendor = hydrateVendorWindows(rawVendor);

    return buildVendorAvailabilitySnapshot(vendor, services, bookings, {
      referenceDate,
      view,
      timezone: user.timezone || DEFAULT_CLIENT_TIMEZONE
    });
  }

  const [vendorRow, serviceRows, bookingRows] = await Promise.all([
    getVendorRowBySlug(user.vendorSlug),
    getServiceRowsByVendorSlug(user.vendorSlug, "created_at DESC"),
    getBookingRowsByVendorSlug(user.vendorSlug)
  ]);

  if (!vendorRow) {
    throw new Error("Vendor profile not found.");
  }

  return buildVendorAvailabilitySnapshot(
    mapVendorRow(vendorRow),
    serviceRows.map(mapServiceRow),
    bookingRows.map(mapBookingRow),
    {
      referenceDate,
      view,
      timezone: user.timezone || DEFAULT_CLIENT_TIMEZONE
    }
  );
}

export async function updateVendorBooking(user, bookingId, payload = {}) {
  assertVendorUser(user);
  const booking = await getVendorBookingById(user, bookingId);
  const action = String(payload.action || "").trim().toLowerCase();
  const reason = String(payload.reason || "").trim();
  const now = new Date().toISOString();
  let nextNotification = null;
  let vendorActivityNotification = null;

  if (!["approve", "decline", "cancel", "complete", "reschedule"].includes(action)) {
    throw new Error("Unsupported booking action.");
  }

  if (action === "approve" && booking.status !== "pending_approval") {
    throw new Error("Only pending requests can be approved.");
  }

  if (action === "decline" && booking.status !== "pending_approval") {
    throw new Error("Only pending requests can be declined.");
  }

  if (action === "reschedule") {
    const appointmentDate = String(payload.appointmentDate || "").trim();
    const appointmentSlot = String(payload.appointmentSlot || "").trim();

    if (!appointmentDate || !appointmentSlot) {
      throw new Error("Choose a new date and time.");
    }

    const availability = await getVendorBookingAvailability(user, bookingId);
    const allowedSlot = availability.windows.some(
      (window) => window.date === appointmentDate && window.slots.includes(appointmentSlot)
    );

    if (!allowedSlot) {
      throw new Error("That slot is no longer available.");
    }

    if (!hasDatabase) {
      const store = getDemoStore();
      const currentBooking = store.bookings.find((item) => String(item.id) === String(bookingId));

      if (!currentBooking) {
        throw new Error("Booking not found.");
      }

      currentBooking.previousAppointmentDate = currentBooking.appointmentDate;
      currentBooking.previousAppointmentSlot = currentBooking.appointmentSlot;
      currentBooking.appointmentDate = appointmentDate;
      currentBooking.appointmentSlot = appointmentSlot;
      currentBooking.rescheduledAt = now;
      currentBooking.updatedAt = now;
    } else {
      try {
        const result = await queryPostgres(
          `
            UPDATE bookings
            SET previous_appointment_date = appointment_date,
                previous_appointment_slot = appointment_slot,
                appointment_date = $3,
                appointment_slot = $4,
                rescheduled_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
              AND vendor_slug = $2
            RETURNING *
          `,
          [bookingId, user.vendorSlug, appointmentDate, appointmentSlot]
        );

        if (!result.rows.length) {
          throw new Error("Booking not found.");
        }
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new Error("That time was just booked. Please choose another slot.");
        }

        throw error;
      }
    }

    nextNotification = {
      type: "booking_rescheduled",
      title: "Appointment rescheduled",
      message: `Your ${booking.serviceName} appointment is now set for ${appointmentDate} at ${appointmentSlot}.`,
      ctaLabel: "Manage booking",
      ctaHref: "/dashboard?tab=bookings"
    };
    vendorActivityNotification = {
      type: "booking_rescheduled",
      title: "Booking rescheduled",
      message: `You moved ${booking.customerName}'s ${booking.serviceName} booking to ${appointmentDate} at ${appointmentSlot}.`,
      readAt: now,
      appointmentDate,
      appointmentSlot,
      metadata: {
        previousAppointmentDate: booking.appointmentDate,
        previousAppointmentSlot: booking.appointmentSlot
      }
    };
  } else if (!hasDatabase) {
    const store = getDemoStore();
    const currentBooking = store.bookings.find((item) => String(item.id) === String(bookingId));

    if (!currentBooking) {
      throw new Error("Booking not found.");
    }

    if (action === "approve") {
      currentBooking.status = "confirmed";
      currentBooking.approvedAt = now;
      currentBooking.paymentStatus = Number(currentBooking.depositAmount || 0) > 0 ? "deposit_due" : "pay_later";
      nextNotification = {
        type: "booking_approved",
        title: "Booking approved",
        message: `${currentBooking.vendorName} approved your ${currentBooking.serviceName} request.`,
        ctaLabel: "View booking",
        ctaHref: "/dashboard?tab=bookings"
      };
      vendorActivityNotification = {
        type: "booking_approved",
        title: "Request approved",
        message: `You approved ${currentBooking.customerName}'s ${currentBooking.serviceName} request.`,
        readAt: now
      };
    }

    if (action === "decline") {
      currentBooking.status = "declined";
      currentBooking.declinedAt = now;
      currentBooking.cancellationReason = reason;
      nextNotification = {
        type: "booking_declined",
        title: "Booking request declined",
        message: `${currentBooking.vendorName} could not accept your ${currentBooking.serviceName} request.`,
        ctaLabel: "Book again",
        ctaHref: `/book/${currentBooking.vendorSlug}`
      };
      vendorActivityNotification = {
        type: "booking_declined",
        title: "Request declined",
        message: `You declined ${currentBooking.customerName}'s ${currentBooking.serviceName} request.`,
        readAt: now,
        metadata: {
          reason
        }
      };
    }

    if (action === "cancel") {
      currentBooking.status = "cancelled";
      currentBooking.cancelledAt = now;
      currentBooking.cancellationReason = reason;
      nextNotification = {
        type: "booking_cancelled",
        title: "Appointment cancelled",
        message: `${currentBooking.vendorName} cancelled your ${currentBooking.serviceName} booking.`,
        ctaLabel: "Book again",
        ctaHref: `/book/${currentBooking.vendorSlug}`
      };
      vendorActivityNotification = {
        type: "booking_cancelled",
        title: "Booking cancelled",
        message: `You cancelled ${currentBooking.customerName}'s ${currentBooking.serviceName} booking.`,
        readAt: now,
        metadata: {
          reason
        }
      };
    }

    if (action === "complete") {
      currentBooking.status = "completed";
      nextNotification = {
        type: "booking_completed",
        title: "Appointment completed",
        message: `Your ${currentBooking.serviceName} appointment was marked as completed.`,
        ctaLabel: "Book again",
        ctaHref: `/book/${currentBooking.vendorSlug}`
      };
      vendorActivityNotification = {
        type: "booking_completed",
        title: "Appointment completed",
        message: `You marked ${currentBooking.customerName}'s ${currentBooking.serviceName} appointment as completed.`,
        readAt: now
      };
    }

    currentBooking.updatedAt = now;
  } else {
    let queryText = "";
    let params = [];

    if (action === "approve") {
      queryText = `
        UPDATE bookings
        SET status = 'confirmed',
            payment_status = CASE WHEN deposit_amount > 0 THEN 'deposit_due' ELSE 'pay_later' END,
            approved_at = NOW(),
            updated_at = NOW()
        WHERE id = $1 AND vendor_slug = $2
        RETURNING *
      `;
      params = [bookingId, user.vendorSlug];
      nextNotification = {
        type: "booking_approved",
        title: "Booking approved",
        message: `${booking.vendorName} approved your ${booking.serviceName} request.`,
        ctaLabel: "View booking",
        ctaHref: "/dashboard?tab=bookings"
      };
      vendorActivityNotification = {
        type: "booking_approved",
        title: "Request approved",
        message: `You approved ${booking.customerName}'s ${booking.serviceName} request.`,
        readAt: now
      };
    }

    if (action === "decline") {
      queryText = `
        UPDATE bookings
        SET status = 'declined',
            declined_at = NOW(),
            cancellation_reason = $3,
            updated_at = NOW()
        WHERE id = $1 AND vendor_slug = $2
        RETURNING *
      `;
      params = [bookingId, user.vendorSlug, reason];
      nextNotification = {
        type: "booking_declined",
        title: "Booking request declined",
        message: `${booking.vendorName} could not accept your ${booking.serviceName} request.`,
        ctaLabel: "Book again",
        ctaHref: `/book/${booking.vendorSlug}`
      };
      vendorActivityNotification = {
        type: "booking_declined",
        title: "Request declined",
        message: `You declined ${booking.customerName}'s ${booking.serviceName} request.`,
        readAt: now,
        metadata: {
          reason
        }
      };
    }

    if (action === "cancel") {
      queryText = `
        UPDATE bookings
        SET status = 'cancelled',
            cancelled_at = NOW(),
            cancellation_reason = $3,
            updated_at = NOW()
        WHERE id = $1 AND vendor_slug = $2
        RETURNING *
      `;
      params = [bookingId, user.vendorSlug, reason];
      nextNotification = {
        type: "booking_cancelled",
        title: "Appointment cancelled",
        message: `${booking.vendorName} cancelled your ${booking.serviceName} booking.`,
        ctaLabel: "Book again",
        ctaHref: `/book/${booking.vendorSlug}`
      };
      vendorActivityNotification = {
        type: "booking_cancelled",
        title: "Booking cancelled",
        message: `You cancelled ${booking.customerName}'s ${booking.serviceName} booking.`,
        readAt: now,
        metadata: {
          reason
        }
      };
    }

    if (action === "complete") {
      queryText = `
        UPDATE bookings
        SET status = 'completed',
            updated_at = NOW()
        WHERE id = $1 AND vendor_slug = $2
        RETURNING *
      `;
      params = [bookingId, user.vendorSlug];
      nextNotification = {
        type: "booking_completed",
        title: "Appointment completed",
        message: `Your ${booking.serviceName} appointment was marked as completed.`,
        ctaLabel: "Book again",
        ctaHref: `/book/${booking.vendorSlug}`
      };
      vendorActivityNotification = {
        type: "booking_completed",
        title: "Appointment completed",
        message: `You marked ${booking.customerName}'s ${booking.serviceName} appointment as completed.`,
        readAt: now
      };
    }

    const result = await queryPostgres(queryText, params);

    if (!result.rows.length) {
      throw new Error("Booking not found.");
    }
  }

  if (booking.customerId && nextNotification) {
    await createClientNotification({
      userId: booking.customerId,
      ...nextNotification,
      metadata: { bookingId: booking.id, vendorSlug: booking.vendorSlug }
    });
  }

  if (vendorActivityNotification) {
    await createVendorBookingNotification(booking, vendorActivityNotification);
  }

  // Fire-and-forget 4-channel confirmation blast (email, socket, push, SMS).
  // Failures are logged and do not block the booking approval response.
  if (action === "approve" && booking.customerId && !booking.notificationsSent) {
    sendAppointmentConfirmationNotifications(booking).catch((error) => {
      console.error("Appointment confirmation notifications failed:", error.message);
    });
  }

  return getDashboardDataForUser(user);
}

export async function updateVendorProfile(user, payload) {
  assertVendorUser(user);

  if (!hasDatabase) {
    const store = getDemoStore();
    const vendor = store.vendors.find((item) => item.slug === user.vendorSlug);

    if (!vendor) {
      throw new Error("Vendor profile not found.");
    }

    const nextVendor = await syncVendorMapLocation(
      normalizeVendorPayload(vendor, payload),
      vendor
    );

    Object.assign(vendor, nextVendor);
    return getDashboardDataForUser(user);
  }

  const existingVendor = await getVendorRowBySlug(user.vendorSlug);

  if (!existingVendor) {
    throw new Error("Vendor profile not found.");
  }

  const nextVendor = await syncVendorMapLocation(
    normalizeVendorPayload(mapVendorRow(existingVendor), payload),
    mapVendorRow(existingVendor)
  );

  await queryPostgres(
    `
      UPDATE vendor_profiles
      SET name = $2,
          owner = $3,
          category = $4,
          state = $5,
          city = $6,
          area = $7,
          location = $8,
          latitude = $9,
          longitude = $10,
          location_precision = $11,
          hero_tag = $12,
          tagline = $13,
          bio = $14,
          cover_image = $15,
          avatar = $16,
          specialties = $17::jsonb,
          amenities = $18::jsonb,
          portfolio_images = $19::jsonb,
          service_location_type = $20,
          policies = $21::jsonb,
          social_links = $22::jsonb,
          personal_info = $23::jsonb,
          business_info = $24::jsonb,
          portfolio_items = $25::jsonb,
          products = $26::jsonb,
          updated_at = NOW()
      WHERE slug = $1
    `,
    [
      user.vendorSlug,
      nextVendor.name,
      nextVendor.owner,
      nextVendor.category,
      nextVendor.state || "",
      nextVendor.city,
      nextVendor.area || "",
      nextVendor.location,
      nextVendor.latitude ?? null,
      nextVendor.longitude ?? null,
      nextVendor.locationPrecision || "approx_area",
      nextVendor.heroTag,
      nextVendor.tagline,
      nextVendor.bio,
      nextVendor.coverImage,
      nextVendor.avatar || "",
      JSON.stringify(nextVendor.specialties || []),
      JSON.stringify(nextVendor.amenities || []),
      JSON.stringify(nextVendor.portfolioImages || []),
      nextVendor.serviceLocationType || "studio",
      JSON.stringify(nextVendor.policies || {}),
      JSON.stringify(nextVendor.socialLinks || {}),
      JSON.stringify(nextVendor.personalInfo || {}),
      JSON.stringify(nextVendor.businessInfo || {}),
      JSON.stringify(nextVendor.portfolioItems || []),
      JSON.stringify(nextVendor.products || [])
    ]
  );

  return getDashboardDataForUser(user);
}

export async function updateVendorAvailability(user, payload) {
  assertVendorUser(user);
  const currentVendor = await getVendorAvailabilityProfile(user);
  const hasBookingWindowsInput = Array.isArray(payload.bookingWindows);
  const hasAvailabilityRulesInput = Array.isArray(payload.availabilityRules);
  const bookingWindows = normalizeAvailabilityPayload(payload.bookingWindows);
  const availabilityRules = normalizeAvailabilityRules(payload.availabilityRules);
  const blackoutDates =
    payload.blackoutDates !== undefined
      ? toList(payload.blackoutDates)
      : currentVendor.blackoutDates || [];
  const availabilityOverrides =
    payload.availabilityOverrides !== undefined
      ? normalizeAvailabilityOverrides(payload.availabilityOverrides)
      : currentVendor.availabilityOverrides || [];
  const nextTimezone =
    payload.timezone !== undefined
      ? normalizeUserTimezone(payload.timezone, user.timezone || DEFAULT_CLIENT_TIMEZONE)
      : "";
  const nextRules =
    hasAvailabilityRulesInput
      ? availabilityRules
      : hasBookingWindowsInput
        ? bookingWindows.length
          ? deriveRulesFromBookingWindows(bookingWindows)
          : []
        : currentVendor.availabilityRules || createDefaultAvailabilityRules();

  const dashboard = await persistVendorAvailabilityState(user, {
    availabilityRules: nextRules,
    availabilityOverrides,
    blackoutDates
  });

  if (nextTimezone && nextTimezone !== normalizeUserTimezone(user.timezone, DEFAULT_CLIENT_TIMEZONE)) {
    await updateDashboardUserTimezone(user, nextTimezone);
  }

  return dashboard;
}

export async function createVendorAvailabilityOverride(user, payload = {}) {
  assertVendorUser(user);
  const currentVendor = await getVendorAvailabilityProfile(user);
  const nextOverride = normalizeAvailabilityOverrides([
    {
      ...payload,
      id: payload.id || `avo-${randomUUID()}`
    }
  ])[0];

  if (!nextOverride) {
    throw new Error("Enter a valid availability block.");
  }

  return persistVendorAvailabilityState(user, {
    availabilityRules: currentVendor.availabilityRules,
    availabilityOverrides: [...currentVendor.availabilityOverrides, nextOverride],
    blackoutDates: currentVendor.blackoutDates
  });
}

export async function updateVendorAvailabilityOverride(user, overrideId, payload = {}) {
  assertVendorUser(user);
  const currentVendor = await getVendorAvailabilityProfile(user);
  const existingOverride = currentVendor.availabilityOverrides.find(
    (override) => String(override.id) === String(overrideId)
  );

  if (!existingOverride) {
    throw new Error("Availability block not found.");
  }

  const nextOverride = normalizeAvailabilityOverrides([
    {
      ...existingOverride,
      ...payload,
      id: existingOverride.id
    }
  ])[0];

  if (!nextOverride) {
    throw new Error("Enter a valid availability block.");
  }

  return persistVendorAvailabilityState(user, {
    availabilityRules: currentVendor.availabilityRules,
    availabilityOverrides: currentVendor.availabilityOverrides.map((override) =>
      String(override.id) === String(overrideId) ? nextOverride : override
    ),
    blackoutDates: currentVendor.blackoutDates
  });
}

export async function deleteVendorAvailabilityOverride(user, overrideId) {
  assertVendorUser(user);
  const currentVendor = await getVendorAvailabilityProfile(user);
  const nextOverrides = currentVendor.availabilityOverrides.filter(
    (override) => String(override.id) !== String(overrideId)
  );

  if (nextOverrides.length === currentVendor.availabilityOverrides.length) {
    throw new Error("Availability block not found.");
  }

  return persistVendorAvailabilityState(user, {
    availabilityRules: currentVendor.availabilityRules,
    availabilityOverrides: nextOverrides,
    blackoutDates: currentVendor.blackoutDates
  });
}

export async function copyVendorAvailabilityOverrides(user, payload = {}) {
  assertVendorUser(user);
  const currentVendor = await getVendorAvailabilityProfile(user);
  const currentOverrides = normalizeAvailabilityOverrides(currentVendor.availabilityOverrides || []);
  const nextOverrides = copyAvailabilityOverrides(currentOverrides, {
    sourceDate: payload.sourceDate,
    mode: payload.mode,
    targetDate: payload.targetDate,
    targetWeekStart: payload.targetWeekStart
  });

  if (JSON.stringify(nextOverrides) === JSON.stringify(currentOverrides)) {
    throw new Error("No availability blocks were copied.");
  }

  return persistVendorAvailabilityState(user, {
    availabilityRules: currentVendor.availabilityRules,
    availabilityOverrides: nextOverrides,
    blackoutDates: currentVendor.blackoutDates
  });
}

export async function createVendorService(user, payload) {
  assertVendorUser(user);
  const serviceData = normalizeServicePayload(payload);

  if (!serviceData.title) {
    throw new Error("Service name is required.");
  }

  if (isBookableService(serviceData) && (!serviceData.duration || !serviceData.price)) {
    throw new Error("Name, duration, and price are required.");
  }

  if (serviceData.serviceType === "addon" && !serviceData.price) {
    throw new Error("Add-on name and price are required.");
  }

  if (serviceData.serviceType === "combined" && serviceData.includedServiceIds.length < 1) {
    throw new Error("Select at least one service for a combined service.");
  }

  if (!hasDatabase) {
    const store = getDemoStore();
    const vendor = store.vendors.find((item) => item.slug === user.vendorSlug);

    if (!vendor) {
      throw new Error("Vendor profile not found.");
    }

    const service = {
      id: `srv-${randomUUID()}`,
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
          deposit_type, deposit_value, image_url, description, featured, booking_method, is_active,
          service_type, parent_category_id, included_service_ids, sort_order, metadata,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb, $18, $19::jsonb, NOW(), NOW())
      `,
      [
        `srv-${randomUUID()}`,
        user.vendorSlug,
        vendor.name,
        serviceData.title,
        vendor.category,
        serviceData.duration,
        serviceData.price,
        serviceData.depositType,
        serviceData.depositValue,
        serviceData.imageUrl,
        serviceData.description,
        Boolean(serviceData.featured),
        serviceData.bookingMethod,
        serviceData.isActive !== false,
        serviceData.serviceType,
        serviceData.parentCategoryId,
        JSON.stringify(serviceData.includedServiceIds),
        Number(serviceData.sortOrder || 0),
        JSON.stringify(serviceData.metadata)
      ]
    );

    await refreshVendorPrice(db, user.vendorSlug);
  });

  return getDashboardDataForUser(user);
}

export async function updateVendorService(user, serviceId, payload) {
  assertVendorUser(user);
  const serviceData = normalizeServicePayload(payload);

  if (!serviceData.title) {
    throw new Error("Service name is required.");
  }

  if (isBookableService(serviceData) && (!serviceData.duration || !serviceData.price)) {
    throw new Error("Name, duration, and price are required.");
  }

  if (serviceData.serviceType === "addon" && !serviceData.price) {
    throw new Error("Add-on name and price are required.");
  }

  if (serviceData.serviceType === "combined" && serviceData.includedServiceIds.length < 1) {
    throw new Error("Select at least one service for a combined service.");
  }

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
            featured = $10,
            booking_method = $11,
            is_active = $12,
            service_type = $13,
            parent_category_id = $14,
            included_service_ids = $15::jsonb,
            sort_order = $16,
            metadata = $17::jsonb,
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
        serviceData.imageUrl,
        Boolean(serviceData.featured),
        serviceData.bookingMethod,
        serviceData.isActive !== false,
        serviceData.serviceType,
        serviceData.parentCategoryId,
        JSON.stringify(serviceData.includedServiceIds),
        Number(serviceData.sortOrder || 0),
        JSON.stringify(serviceData.metadata)
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
