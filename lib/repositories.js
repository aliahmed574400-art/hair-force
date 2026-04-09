import { compare, hash } from "bcryptjs";
import Booking from "@/models/Booking";
import Service from "@/models/Service";
import User from "@/models/User";
import VendorProfile from "@/models/VendorProfile";
import {
  buildBookingWindowsFromRules,
  createDefaultAvailabilityRules,
  deriveRulesFromBookingWindows
} from "@/lib/availability";
import { connectToDatabase } from "@/lib/mongodb";
import { getDemoStore } from "@/lib/demo-store";
import { calculateDeposit, createSlug, filterStylists, toList } from "@/lib/utils";

const hasDatabase = Boolean(process.env.MONGODB_URI);

function serialize(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const clean = serialize(user);
  delete clean.passwordHash;
  return clean;
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

export async function getStylists(filters = {}) {
  if (!hasDatabase) {
    return filterStylists(
      getDemoStore().vendors.filter((vendor) => vendor.status === "active"),
      filters
    );
  }

  await connectToDatabase();
  const docs = await VendorProfile.find({ status: "active" }).sort({ rating: -1 }).lean();
  return filterStylists(serialize(docs), filters);
}

export async function getFeaturedStylists() {
  const items = await getStylists();
  return items.slice(0, 4);
}

export async function getStylistBySlug(slug) {
  if (!hasDatabase) {
    return demoStylistBySlug(slug);
  }

  await connectToDatabase();
  const vendor = await VendorProfile.findOne({ slug }).lean();

  if (!vendor) {
    return null;
  }

  const services = await Service.find({ vendorSlug: slug }).sort({ price: 1 }).lean();
  return hydrateVendorWindows({
    ...serialize(vendor),
    services: serialize(services).map((service) => ({
      ...service,
      id: service.id || service._id
    }))
  });
}

export async function getUserById(id) {
  if (!id) {
    return null;
  }

  if (!hasDatabase) {
    return sanitizeUser(getDemoStore().users.find((user) => user.id === id));
  }

  await connectToDatabase();
  const user = await User.findById(id).lean();
  return sanitizeUser(user);
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

  await connectToDatabase();
  const user = await User.findOne({ email }).lean();
  return sanitizeUser(user);
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

  await connectToDatabase();
  const existing = await User.findOne({ email: payload.email }).lean();

  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const passwordHash = await hash(payload.password, 10);
  const user = await User.create({
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    city: payload.city,
    role: payload.role || "client",
    vendorSlug: payload.vendorSlug || null,
    passwordHash
  });

  return sanitizeUser(user);
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

  await connectToDatabase();
  const user = await User.findOne({ email: payload.email });

  if (!user) {
    throw new Error("No account found for this email.");
  }

  const isValid = await compare(payload.password, user.passwordHash);

  if (!isValid) {
    throw new Error("Incorrect password.");
  }

  return sanitizeUser(user);
}

export async function createVendorAccount(payload) {
  const businessName = String(payload.businessName || "").trim();
  const existingSlugs = hasDatabase
    ? await (async () => {
        await connectToDatabase();
        const docs = await VendorProfile.find({}, { slug: 1, _id: 0 }).lean();
        return docs.map((item) => item.slug);
      })()
    : getDemoStore().vendors.map((vendor) => vendor.slug);
  const vendorSlug = makeVendorSlug(businessName, existingSlugs);

  const user = await signupUser({
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    city: payload.city,
    password: payload.password,
    role: "vendor",
    vendorSlug
  });

  if (!hasDatabase) {
    const store = getDemoStore();
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

  await connectToDatabase();
  const profile = await VendorProfile.create({
    slug: vendorSlug,
    name: businessName,
    owner: payload.name,
    category: payload.category,
    city: payload.city,
    location: payload.location || payload.city,
    heroTag: payload.heroTag || "New Hair Force partner",
    tagline: payload.notes || "Fresh profile on the marketplace.",
    bio: payload.notes || "This vendor is setting up their Hair Force storefront.",
    specialties: toList(payload.specialties || payload.category),
    amenities: ["Online booking", "Marketplace profile"],
    coverGradient: "linear-gradient(135deg, rgba(54,110,255,.55), rgba(53,223,255,.2))",
    responseTime: "Pending approval",
    availabilityRules: createDefaultAvailabilityRules(),
    blackoutDates: [],
    bookingWindows: buildBookingWindowsFromRules(createDefaultAvailabilityRules(), []),
    status: "pending"
  });

  return { user, vendor: serialize(profile) };
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

  await connectToDatabase();
  const booking = await Booking.create(bookingRecord);
  return serialize(booking);
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

    await connectToDatabase();
    const vendor = await VendorProfile.findOne({ slug: user.vendorSlug }).lean();
    const services = await Service.find({ vendorSlug: user.vendorSlug }).sort({ createdAt: -1 }).lean();
    const bookings = await Booking.find({ vendorSlug: user.vendorSlug }).sort({ createdAt: -1 }).lean();

    return {
      kind: "vendor",
      vendor: hydrateVendorWindows(serialize(vendor)),
      services: serialize(services).map((service) => ({ ...service, id: service.id || service._id })),
      bookings: serialize(bookings),
      summary: buildVendorSummary(
        hydrateVendorWindows(serialize(vendor)),
        serialize(services),
        serialize(bookings)
      )
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

  await connectToDatabase();
  const bookings = await Booking.find({ customerEmail: user.email }).sort({ createdAt: -1 }).lean();
  return {
    kind: "client",
    bookings: serialize(bookings),
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

  await connectToDatabase();
  const vendor = await VendorProfile.findOne({ slug: user.vendorSlug });

  if (!vendor) {
    throw new Error("Vendor profile not found.");
  }

  Object.assign(vendor, normalizeVendorPayload(serialize(vendor), payload));
  await vendor.save();
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

  await connectToDatabase();
  const vendor = await VendorProfile.findOne({ slug: user.vendorSlug });

  if (!vendor) {
    throw new Error("Vendor profile not found.");
  }

  vendor.availabilityRules = nextRules;
  vendor.blackoutDates = blackoutDates;
  vendor.bookingWindows = nextWindows;
  await vendor.save();
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

  await connectToDatabase();
  const vendor = await VendorProfile.findOne({ slug: user.vendorSlug }).lean();

  if (!vendor) {
    throw new Error("Vendor profile not found.");
  }

  await Service.create({
    vendorSlug: user.vendorSlug,
    vendorName: vendor.name,
    category: vendor.category,
    ...serviceData
  });

  const prices = await Service.find({ vendorSlug: user.vendorSlug }).lean();
  await VendorProfile.updateOne(
    { slug: user.vendorSlug },
    {
      $set: {
        priceFrom: prices.length
          ? Math.min(...prices.map((service) => Number(service.price || 0)).filter(Boolean))
          : 0
      }
    }
  );

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

  await connectToDatabase();
  const service = await Service.findOne({ _id: serviceId, vendorSlug: user.vendorSlug });

  if (!service) {
    throw new Error("Service not found.");
  }

  Object.assign(service, serviceData);
  await service.save();

  const prices = await Service.find({ vendorSlug: user.vendorSlug }).lean();
  await VendorProfile.updateOne(
    { slug: user.vendorSlug },
    {
      $set: {
        priceFrom: prices.length
          ? Math.min(...prices.map((item) => Number(item.price || 0)).filter(Boolean))
          : 0
      }
    }
  );

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

  await connectToDatabase();
  const deleted = await Service.findOneAndDelete({ _id: serviceId, vendorSlug: user.vendorSlug });

  if (!deleted) {
    throw new Error("Service not found.");
  }

  const prices = await Service.find({ vendorSlug: user.vendorSlug }).lean();
  await VendorProfile.updateOne(
    { slug: user.vendorSlug },
    {
      $set: {
        priceFrom: prices.length
          ? Math.min(...prices.map((service) => Number(service.price || 0)).filter(Boolean))
          : 0
      }
    }
  );

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

  await connectToDatabase();
  const vendors = await VendorProfile.find({}).sort({ createdAt: -1 }).lean();
  const docs = serialize(vendors);

  return {
    pendingVendors: docs.filter((vendor) => vendor.status === "pending"),
    activeVendors: docs.filter((vendor) => vendor.status === "active"),
    rejectedVendors: docs.filter((vendor) => vendor.status === "rejected")
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

  await connectToDatabase();
  const vendor = await VendorProfile.findOne({ slug });

  if (!vendor) {
    throw new Error("Vendor not found.");
  }

  vendor.status = nextStatus;
  vendor.verified = nextStatus === "active";
  await vendor.save();
  return getAdminDataForUser(user);
}
