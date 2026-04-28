import { hashSync } from "bcryptjs";
import {
  buildBookingWindowsFromRules,
  createDefaultAvailabilityRules,
  deriveRulesFromBookingWindows
} from "@/lib/availability";
import { stylists } from "@/lib/data";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function shiftDate(days) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString().slice(0, 10);
}

function shiftTimestamp(days, hours = 12) {
  const date = new Date();
  date.setHours(Number(hours || 12), 0, 0, 0);
  date.setDate(date.getDate() + Number(days || 0));
  return date.toISOString();
}

function normalizeServices(vendor) {
  return vendor.services.map((service, index) => ({
    ...service,
    id: service.id || `srv-${vendor.slug}-${index + 1}`,
    vendorSlug: vendor.slug,
    vendorName: vendor.name,
    category: vendor.category,
    depositType: service.depositType || "percentage",
    depositValue: service.depositValue ?? (service.price >= 200 ? 25 : 20),
    imageUrl: service.imageUrl || "",
    bookingMethod: service.bookingMethod || "instant",
    isActive: service.isActive !== false,
    featured: Boolean(service.featured)
  }));
}

function createInitialStore() {
  const vendors = clone(stylists).map((vendor) => ({
    ...vendor,
    status: vendor.status || "active",
    state: vendor.state || vendor.city || "",
    city: vendor.state ? vendor.city || "" : vendor.city || "",
    area: vendor.area || "",
    avatar: vendor.avatar || vendor.coverImage || "",
    coverImage: vendor.coverImage || "",
    galleryImages: vendor.galleryImages || [],
    portfolioImages: vendor.portfolioImages || vendor.galleryImages || [],
    availabilityRules: vendor.availabilityRules || deriveRulesFromBookingWindows(vendor.bookingWindows || []),
    blackoutDates: vendor.blackoutDates || [],
    serviceLocationType: vendor.serviceLocationType || "studio",
    latitude: vendor.latitude ?? null,
    longitude: vendor.longitude ?? null,
    locationPrecision: vendor.locationPrecision || "approx_area",
    policies: vendor.policies || {
      deposit: "A deposit may be required to secure your time.",
      cancellation: "Please cancel or reschedule at least 24 hours before the appointment.",
      lateArrival: "Arriving late may shorten the service to protect the next booking.",
      prepInstructions: "Please review service notes and arrive with clean, product-free hair where possible."
    },
    socialLinks: vendor.socialLinks || {}
  }));

  vendors.push({
    id: "vendor-pending-01",
    slug: "luna-beauty-suite",
    name: "Luna Beauty Suite",
    owner: "Luna Ahmed",
    category: "Salon",
    state: "Sindh",
    city: "Karachi",
    area: "Bahadurabad",
    location: "Bahadurabad, Karachi",
    latitude: 24.888778,
    longitude: 67.072856,
    locationPrecision: "approx_area",
    rating: 5,
    reviewCount: 0,
    priceFrom: 0,
    responseTime: "Pending approval",
    verified: false,
    heroTag: "Soft opening beauty studio",
    tagline: "Awaiting admin approval before going live on Hair Force.",
    bio: "New vendor application waiting for marketplace review.",
    avatar: "",
    specialties: ["Soft glam", "Blow dry"],
    amenities: ["Online booking"],
    coverGradient: "linear-gradient(135deg, rgba(54,110,255,.55), rgba(53,223,255,.2))",
    metrics: {
      repeatClients: "0%",
      monthlyBookings: "0",
      showUpRate: "0%"
    },
    coverImage: "",
    galleryImages: [],
    portfolioImages: [],
    services: [],
    gallery: [],
    reviews: [],
    availabilityRules: createDefaultAvailabilityRules(),
    blackoutDates: [],
    serviceLocationType: "studio",
    policies: {
      deposit: "Deposits are collected after approval.",
      cancellation: "Cancel at least 24 hours before your appointment.",
      lateArrival: "Late arrivals may need to reschedule.",
      prepInstructions: "Share inspiration photos before your visit."
    },
    socialLinks: {},
    bookingWindows: [{ date: "2026-04-22", label: "Tue 22 Apr", slots: ["12:00 PM", "3:00 PM"] }],
    status: "pending"
  });

  const hydratedVendors = vendors.map((vendor) => ({
    ...vendor,
    bookingWindows:
      vendor.bookingWindows?.length || !(vendor.availabilityRules || []).length
        ? vendor.bookingWindows || []
        : buildBookingWindowsFromRules(vendor.availabilityRules, vendor.blackoutDates || [])
  }));

  const services = hydratedVendors.flatMap(normalizeServices);
  const primaryVendor = hydratedVendors[0];
  const secondaryVendor = hydratedVendors[1] || hydratedVendors[0];
  const firstService = services[0];
  const secondService = services[1] || services[0];
  const thirdService = services.find((service) => service.vendorSlug === secondaryVendor.slug) || services[0];
  const firstWindow = primaryVendor.bookingWindows[0] || {
    date: shiftDate(3),
    label: "Soon",
    slots: ["12:00 PM"]
  };
  const secondWindow = primaryVendor.bookingWindows[1] || firstWindow;

  const users = [
    {
      id: "usr-client-demo",
      name: "Demo Client",
      email: "client@hairforce.app",
      phone: "0300 0000000",
      city: "Karachi",
      timezone: "America/Los_Angeles",
      country: "US",
      phoneCountryCode: "+1",
      reducedMotion: false,
      highContrast: false,
      largerText: false,
      role: "client",
      passwordHash: hashSync("demo12345", 10)
    },
    {
      id: "usr-vendor-demo",
      name: vendors[0].owner,
      email: "vendor@hairforce.app",
      phone: "0300 1111111",
      city: hydratedVendors[0].city,
      timezone: "America/Los_Angeles",
      country: "US",
      phoneCountryCode: "+1",
      reducedMotion: false,
      highContrast: false,
      largerText: false,
      role: "vendor",
      vendorSlug: hydratedVendors[0].slug,
      passwordHash: hashSync("demo12345", 10)
    },
    {
      id: "usr-admin-demo",
      name: "Demo Admin",
      email: "admin@hairforce.app",
      phone: "0300 2222222",
      city: "Karachi",
      timezone: "America/Los_Angeles",
      country: "US",
      phoneCountryCode: "+1",
      reducedMotion: false,
      highContrast: false,
      largerText: false,
      role: "admin",
      passwordHash: hashSync("demo12345", 10)
    }
  ];

  const bookings = [
    {
      id: "bk-demo-101",
      vendorSlug: primaryVendor.slug,
      vendorName: primaryVendor.name,
      customerId: users[0].id,
      customerName: users[0].name,
      customerEmail: users[0].email,
      customerPhone: users[0].phone,
      serviceId: firstService.id,
      serviceName: firstService.title,
      appointmentDate: firstWindow.date,
      appointmentSlot: firstWindow.slots[0],
      total: firstService.price,
      depositAmount: Math.round(firstService.price * 0.2),
      remainingAmount: firstService.price - Math.round(firstService.price * 0.2),
      paymentStatus: "deposit_paid",
      paymentIntentId: "pi_demo_101",
      notes: "Please keep the layers soft.",
      bookingMethod: firstService.bookingMethod || "instant",
      status: "confirmed",
      source: "web",
      createdAt: shiftTimestamp(-2, 15),
      requestedAt: shiftTimestamp(-2, 15),
      approvedAt: shiftTimestamp(-2, 15)
    },
    {
      id: "bk-demo-102",
      vendorSlug: primaryVendor.slug,
      vendorName: primaryVendor.name,
      customerName: "Sana Tahir",
      customerEmail: "sana@example.com",
      customerPhone: "0300 9999999",
      serviceId: secondService.id,
      serviceName: secondService.title,
      appointmentDate: secondWindow.date,
      appointmentSlot: secondWindow.slots[Math.min(1, secondWindow.slots.length - 1)],
      total: secondService.price,
      depositAmount: Math.round(secondService.price * 0.25),
      remainingAmount: secondService.price - Math.round(secondService.price * 0.25),
      paymentStatus: "pay_later",
      paymentIntentId: "",
      notes: "",
      bookingMethod: "approval",
      status: "pending_approval",
      source: "web",
      createdAt: shiftTimestamp(-1, 11),
      requestedAt: shiftTimestamp(-1, 11)
    },
    {
      id: "bk-demo-103",
      vendorSlug: secondaryVendor.slug,
      vendorName: secondaryVendor.name,
      customerId: users[0].id,
      customerName: users[0].name,
      customerEmail: users[0].email,
      customerPhone: users[0].phone,
      serviceId: thirdService.id,
      serviceName: thirdService.title,
      appointmentDate: shiftDate(-21),
      appointmentSlot: "2:00 PM",
      total: thirdService.price,
      depositAmount: 0,
      remainingAmount: thirdService.price,
      paymentStatus: "pay_later",
      paymentIntentId: "",
      notes: "Past visit for dashboard history.",
      bookingMethod: thirdService.bookingMethod || "instant",
      status: "completed",
      source: "web",
      createdAt: shiftTimestamp(-30, 14),
      requestedAt: shiftTimestamp(-30, 14),
      approvedAt: shiftTimestamp(-30, 14)
    }
  ];

  const favorites = [
    {
      userId: users[0].id,
      vendorSlug: primaryVendor.slug,
      createdAt: shiftTimestamp(-18, 10)
    },
    {
      userId: users[0].id,
      vendorSlug: secondaryVendor.slug,
      createdAt: shiftTimestamp(-12, 10)
    }
  ];

  const notificationPreferences = [
    {
      userId: users[0].id,
      bookingUpdates: true,
      reminders: true,
      recommendations: true,
      securityAlerts: true,
      updatedAt: shiftTimestamp(-1, 9)
    }
  ];

  const notifications = [
    {
      id: "ntf-demo-101",
      userId: users[0].id,
      type: "booking_confirmed",
      title: "Appointment confirmed",
      message: `Your ${firstService.title} appointment with ${primaryVendor.name} is booked for ${firstWindow.label} at ${firstWindow.slots[0]}.`,
      ctaLabel: "Manage booking",
      ctaHref: "/dashboard?tab=bookings",
      metadata: { bookingId: "bk-demo-101" },
      readAt: null,
      createdAt: shiftTimestamp(-2, 16),
      updatedAt: shiftTimestamp(-2, 16)
    },
    {
      id: "ntf-demo-102",
      userId: users[0].id,
      type: "payment_reminder",
      title: "Deposit still due",
      message: `Your upcoming ${secondService.title} appointment still has a pending deposit.`,
      ctaLabel: "Review booking",
      ctaHref: "/dashboard?tab=bookings",
      metadata: { bookingId: "bk-demo-102" },
      readAt: null,
      createdAt: shiftTimestamp(-1, 10),
      updatedAt: shiftTimestamp(-1, 10)
    },
    {
      id: "ntf-demo-103",
      userId: users[0].id,
      type: "account",
      title: "Saved stylist ready to rebook",
      message: `${secondaryVendor.name} has open slots again if you want to book another visit.`,
      ctaLabel: "View stylist",
      ctaHref: `/stylists/${secondaryVendor.slug}`,
      metadata: { vendorSlug: secondaryVendor.slug },
      readAt: shiftTimestamp(-3, 13),
      createdAt: shiftTimestamp(-4, 13),
      updatedAt: shiftTimestamp(-3, 13)
    }
  ];

  const paymentMethods = [
    {
      id: "pm-demo-101",
      userId: users[0].id,
      provider: "stripe",
      brand: "Visa",
      last4: "4242",
      expMonth: 12,
      expYear: 2028,
      holderName: users[0].name,
      isDefault: true,
      createdAt: shiftTimestamp(-40, 9),
      updatedAt: shiftTimestamp(-10, 9)
    },
    {
      id: "pm-demo-102",
      userId: users[0].id,
      provider: "stripe",
      brand: "Mastercard",
      last4: "4444",
      expMonth: 8,
      expYear: 2027,
      holderName: users[0].name,
      isDefault: false,
      createdAt: shiftTimestamp(-12, 11),
      updatedAt: shiftTimestamp(-12, 11)
    }
  ];

  const paymentRecords = [
    {
      id: "pay-demo-101",
      userId: users[0].id,
      bookingId: "bk-demo-101",
      paymentMethodId: "pm-demo-101",
      amount: bookings[0].depositAmount,
      currency: "USD",
      status: "succeeded",
      type: "deposit",
      provider: "stripe",
      paymentIntentId: "pi_demo_101",
      receiptUrl: "https://payments.hairforce.local/receipts/pay-demo-101",
      description: `Deposit for ${bookings[0].serviceName}`,
      createdAt: shiftTimestamp(-2, 15),
      updatedAt: shiftTimestamp(-2, 15)
    },
    {
      id: "pay-demo-102",
      userId: users[0].id,
      bookingId: "bk-demo-102",
      paymentMethodId: "pm-demo-102",
      amount: bookings[1].depositAmount,
      currency: "USD",
      status: "failed",
      type: "deposit",
      provider: "stripe",
      paymentIntentId: "pi_demo_102_failed",
      receiptUrl: "",
      description: `Deposit attempt for ${bookings[1].serviceName}`,
      createdAt: shiftTimestamp(-1, 10),
      updatedAt: shiftTimestamp(-1, 10)
    }
  ];

  const conversations = [
    {
      id: "conv-demo-101",
      bookingId: bookings[0].id,
      vendorSlug: bookings[0].vendorSlug,
      clientId: users[0].id,
      vendorUnreadCount: 0,
      clientUnreadCount: 1,
      lastMessageAt: shiftTimestamp(-1, 18),
      createdAt: shiftTimestamp(-2, 16),
      updatedAt: shiftTimestamp(-1, 18)
    }
  ];

  const messages = [
    {
      id: "msg-demo-101",
      conversationId: "conv-demo-101",
      bookingId: bookings[0].id,
      senderId: users[1].id,
      senderRole: "vendor",
      body: "Your appointment is confirmed. Bring any inspiration photos you want me to reference.",
      readAt: shiftTimestamp(-1, 20),
      createdAt: shiftTimestamp(-2, 17),
      updatedAt: shiftTimestamp(-2, 17)
    },
    {
      id: "msg-demo-102",
      conversationId: "conv-demo-101",
      bookingId: bookings[0].id,
      senderId: users[0].id,
      senderRole: "client",
      body: "Perfect, thank you. I’ll upload reference photos before I come in.",
      readAt: shiftTimestamp(-1, 20),
      createdAt: shiftTimestamp(-2, 19),
      updatedAt: shiftTimestamp(-2, 19)
    },
    {
      id: "msg-demo-103",
      conversationId: "conv-demo-101",
      bookingId: bookings[0].id,
      senderId: users[1].id,
      senderRole: "vendor",
      body: "Sounds good. I also recommend arriving 10 minutes early for a quick consultation.",
      readAt: null,
      createdAt: shiftTimestamp(-1, 18),
      updatedAt: shiftTimestamp(-1, 18)
    }
  ];

  return {
    vendors: hydratedVendors,
    services,
    users,
    bookings,
    favorites,
    notifications,
    notificationPreferences,
    paymentMethods,
    paymentRecords,
    conversations,
    messages,
    authSessions: [],
    deleteRequests: []
  };
}

export function getDemoStore() {
  if (!globalThis.hairforceDemoStore) {
    globalThis.hairforceDemoStore = createInitialStore();
  }

  return globalThis.hairforceDemoStore;
}
