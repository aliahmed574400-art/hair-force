// Pure helper functions extracted from VendorDashboardManager.jsx. No React,
// no state, no side effects — just data transformations the dashboard uses.
//
// Splitting this out makes the main component file shorter and these helpers
// individually testable (most are not currently covered by tests).
//
// Pattern: when adding a new section to the dashboard, prefer to put its
// pure helpers here and import them, rather than declaring them in the main
// component file.

import {
  AVATAR_SWATCHES,
  PROFILE_TAB_IDS,
  SETTINGS_TAB_IDS,
  VENDOR_SECTION_IDS
} from "@/components/dashboard/vendorDashboard.tabIds";

export function resolveVendorSection(value) {
  const nextSection = String(value || "").trim().toLowerCase();
  if (nextSection === "portfolio") {
    return "profile";
  }
  return VENDOR_SECTION_IDS.has(nextSection) ? nextSection : "";
}

export function resolveProfileTab(value) {
  const nextTab = String(value || "").trim().toLowerCase();
  if (nextTab === "photos" || nextTab === "gallery") {
    return "media";
  }
  if (nextTab === "social-info") {
    return "social";
  }
  return PROFILE_TAB_IDS.has(nextTab) ? nextTab : "";
}

export function resolveSettingsTab(value) {
  const nextTab = String(value || "").trim().toLowerCase();

  if (nextTab === "notifications") {
    return "notification";
  }
  if (nextTab === "plan" || nextTab === "billing" || nextTab === "plan-billing") {
    return "billing";
  }
  if (nextTab === "login-email" || nextTab === "change-email") {
    return "email";
  }
  if (nextTab === "change-password") {
    return "password";
  }

  return SETTINGS_TAB_IDS.has(nextTab) ? nextTab : "";
}

export function defaultProductForm() {
  return {
    name: "",
    price: "0",
    category: "Shampoo",
    description: ""
  };
}

export function createNotificationPreferenceForm(preferences = {}) {
  return {
    bookingUpdates: preferences.bookingUpdates !== false,
    clientMessages: preferences.clientMessages !== false,
    reminders: preferences.reminders !== false,
    paymentAlerts: preferences.paymentAlerts !== false,
    reviewRequests: preferences.reviewRequests !== false,
    securityAlerts: preferences.securityAlerts !== false,
    marketingTexts: preferences.marketingTexts !== false,
    quietHoursEnabled: preferences.quietHoursEnabled !== false,
    quietHoursFrom: preferences.quietHoursFrom || "09:00",
    quietHoursTo: preferences.quietHoursTo || "22:00"
  };
}

export function createPaymentMethodForm() {
  return {
    holderName: "",
    brand: "Visa",
    last4: "",
    expMonth: "",
    expYear: "",
    isDefault: false
  };
}

export function createPasswordForm() {
  return {
    currentPassword: "",
    password: "",
    confirmPassword: ""
  };
}

export function createClientId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultServiceForm(overrides = {}) {
  const serviceType = overrides.serviceType || "service";
  const isCategory = serviceType === "category";
  const isAddon = serviceType === "addon";

  return {
    serviceType,
    title: overrides.title || "",
    duration: isCategory ? "" : overrides.duration || (isAddon ? "30 Minutes" : "45 Minutes"),
    price: isCategory ? "0" : overrides.price ?? "",
    description: overrides.description || "",
    depositType: "percentage",
    depositValue: overrides.depositValue ?? 0,
    imageUrl: "",
    featured: false,
    bookingMethod: "instant",
    isActive: true,
    parentCategoryId: overrides.parentCategoryId || "",
    includedServiceIds: overrides.includedServiceIds || [],
    sortOrder: overrides.sortOrder || 0,
    metadata: {
      priceIsStartingAt: overrides.metadata?.priceIsStartingAt ?? true,
      timeAdded: overrides.metadata?.timeAdded || "after",
      limitedDays: Boolean(overrides.metadata?.limitedDays),
      requireDeposit: Boolean(overrides.metadata?.requireDeposit)
    }
  };
}

export function getServiceType(service) {
  const serviceType = String(service?.serviceType || "service");
  return ["service", "addon", "category", "combined"].includes(serviceType) ? serviceType : "service";
}

export function isBookableMenuService(service) {
  const serviceType = getServiceType(service);
  return serviceType === "service" || serviceType === "combined";
}

export function formatDurationLabel(value) {
  return String(value || "").trim() || "Duration not set";
}

export function createPortfolioItems(vendor) {
  const storedItems = Array.isArray(vendor.portfolioItems) ? vendor.portfolioItems : [];
  const images = Array.isArray(vendor.portfolioImages) ? vendor.portfolioImages : [];
  const itemUrls = new Set(storedItems.map((item) => item?.url).filter(Boolean));

  return [
    ...storedItems,
    ...images
      .filter((url) => !itemUrls.has(url))
      .map((url, index) => ({
        id: `media-existing-${index + 1}`,
        url,
        type: "image",
        serviceId: "",
        clientName: "",
        caption: "",
        pinned: false
      }))
  ].map((item, index) => ({
    id: item.id || `media-${index + 1}`,
    url: item.url || "",
    type: item.type === "video" ? "video" : "image",
    serviceId: item.serviceId || "",
    clientName: item.clientName || "",
    caption: item.caption || "",
    pinned: Boolean(item.pinned)
  }));
}

export function createProfileForm(vendor, user = {}) {
  const personalInfo = vendor.personalInfo || {};
  const businessInfo = vendor.businessInfo || {};
  const portfolioItems = createPortfolioItems(vendor);
  const products = Array.isArray(vendor.products) ? vendor.products : [];

  return {
    name: vendor.name || "",
    owner: vendor.owner || "",
    category: vendor.category || "",
    state: vendor.state || "",
    city: vendor.city || "",
    area: vendor.area || "",
    location: vendor.location || "",
    heroTag: vendor.heroTag || "",
    tagline: vendor.tagline || "",
    bio: vendor.bio || "",
    coverImage: vendor.coverImage || "",
    avatar: vendor.avatar || "",
    specialties: (vendor.specialties || []).join(", "),
    amenities: (vendor.amenities || []).join(", "),
    serviceLocationType: vendor.serviceLocationType ?? "",
    portfolioImages: vendor.portfolioImages || [],
    portfolioItems,
    products: products.map((product, index) => ({
      id: product.id || `product-${index + 1}`,
      name: product.name || "",
      price: product.price ?? 0,
      category: product.category || "Shampoo",
      description: product.description || ""
    })),
    personalInfo: {
      displayName: personalInfo.displayName || vendor.name || vendor.owner || user?.name || "",
      pronouns: Array.isArray(personalInfo.pronouns) ? personalInfo.pronouns : [],
      profession: personalInfo.profession || vendor.category || "Other Professional",
      about: personalInfo.about || vendor.bio || "",
      email: personalInfo.email || user?.email || "",
      phone: personalInfo.phone || user?.phone || "",
      websitePath: personalInfo.websitePath || `/stylists/${vendor.slug || ""}`
    },
    businessInfo: {
      businessName: businessInfo.businessName || vendor.name || "",
      salonNumber: businessInfo.salonNumber || "",
      personalPhoneNumber: businessInfo.personalPhoneNumber || user?.phone || "",
      numberShownOnProfile: businessInfo.numberShownOnProfile || "salonNumber",
      smsNotificationsPhoneNumber: businessInfo.smsNotificationsPhoneNumber || user?.phone || "",
      mobileBusiness: Boolean(businessInfo.mobileBusiness),
      streetAddress: businessInfo.streetAddress || vendor.location || "",
      suite: businessInfo.suite || "",
      city: businessInfo.city || vendor.city || "",
      state: businessInfo.state || vendor.state || "",
      zip: businessInfo.zip || "",
      locationInstructions: businessInfo.locationInstructions || ""
    },
    policies: {
      deposit: vendor.policies?.deposit || "",
      cancellation: vendor.policies?.cancellation || "",
      lateArrival: vendor.policies?.lateArrival || "",
      prepInstructions: vendor.policies?.prepInstructions || ""
    },
    socialLinks: {
      instagram: vendor.socialLinks?.instagram || "",
      website: vendor.socialLinks?.website || "",
      tiktok: vendor.socialLinks?.tiktok || "",
      facebook: vendor.socialLinks?.facebook || "",
      twitter: vendor.socialLinks?.twitter || "",
      yelp: vendor.socialLinks?.yelp || ""
    }
  };
}

export function createAvailabilityForm(vendor) {
  return (vendor.availabilityRules || []).map((item) => ({
    dayOfWeek: String(item.dayOfWeek ?? 1),
    startTime: item.startTime || "10:00",
    endTime: item.endTime || "18:00",
    slotMinutes: String(item.slotMinutes || 120),
    active: item.active !== false
  }));
}

export function bookingStatusTone(status) {
  if (status === "pending_approval") {
    return "warning";
  }
  if (status === "confirmed") {
    return "success";
  }
  if (status === "completed") {
    return "muted";
  }
  return "muted";
}

export function formatDateLabel(value) {
  if (!value) {
    return "Date pending";
  }

  const parsed = new Date(`${String(value).slice(0, 10)}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short"
  });
}

export function sortBookings(bookings) {
  return [...bookings].sort((left, right) => {
    const leftTime = new Date(`${left.appointmentDate}T12:00:00`).getTime();
    const rightTime = new Date(`${right.appointmentDate}T12:00:00`).getTime();
    return rightTime - leftTime;
  });
}

export function initialThreadState() {
  return {
    loading: false,
    sending: false,
    error: "",
    messages: [],
    draft: ""
  };
}

export function sanitizePortfolioImages(images) {
  return [...new Set((images || []).map((item) => String(item || "").trim()).filter(Boolean))];
}

export function getInitials(value) {
  return String(value || "HF")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item.charAt(0).toUpperCase())
    .join("");
}

export function getAvatarSwatch(value) {
  const source = String(value || "");
  const index = source.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_SWATCHES.length;
  return AVATAR_SWATCHES[index];
}

export function formatDashboardNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

export function formatMonthLabel(date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });
}

export function formatLineupDate(value) {
  if (!value) {
    return "Date pending";
  }

  const parsed = new Date(`${String(value).slice(0, 10)}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric"
  });
}

export function formatBillingDate(value) {
  if (!value) {
    return "billing date pending";
  }

  const parsed = new Date(`${String(value).slice(0, 10)}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

export function paymentMethodLabel(method) {
  if (!method) {
    return "No payment method on file";
  }

  return `${method.brand || "Card"} ending in ${method.last4 || "0000"}`;
}

export function normalizeAppointmentTime(value) {
  const input = String(value || "").trim();

  if (!input) {
    return "12:00";
  }

  if (/^\d{2}:\d{2}$/.test(input)) {
    return input;
  }

  const match = input.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    return "12:00";
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3].toUpperCase();

  if (period === "PM" && hours < 12) {
    hours += 12;
  }

  if (period === "AM" && hours === 12) {
    hours = 0;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function getAppointmentDateTime(dateValue, slotValue) {
  const normalizedDate = String(dateValue || "").slice(0, 10);

  if (!normalizedDate) {
    return null;
  }

  const parsed = new Date(`${normalizedDate}T${normalizeAppointmentTime(slotValue)}:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isPastBooking(booking) {
  const appointment = getAppointmentDateTime(booking?.appointmentDate, booking?.appointmentSlot);

  if (!appointment) {
    return false;
  }

  return appointment.getTime() < Date.now();
}

export function buildCalendarMonth(referenceDate, bookings = []) {
  const monthStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const gridStart = new Date(monthStart);
  const mondayOffset = (monthStart.getDay() + 6) % 7;
  gridStart.setDate(monthStart.getDate() - mondayOffset);
  const todayKey = new Date().toISOString().slice(0, 10);
  const bookingMap = bookings.reduce((map, booking) => {
    const key = String(booking.appointmentDate || "").slice(0, 10);

    if (!key) {
      return map;
    }

    if (!map[key]) {
      map[key] = [];
    }

    map[key].push(booking);
    return map;
  }, {});

  const weeks = Array.from({ length: 6 }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + weekIndex * 7 + dayIndex);
      const dateKey = date.toISOString().slice(0, 10);
      const dayBookings = bookingMap[dateKey] || [];
      let tone = "";

      if (dayBookings.length) {
        if (dayBookings.some((booking) => booking.status === "pending_approval")) {
          tone = "pending";
        } else if (dayBookings.some((booking) => booking.status === "completed")) {
          tone = "completed";
        } else if (dayBookings.some((booking) => ["cancelled", "declined"].includes(booking.status))) {
          tone = "cancelled";
        } else {
          tone = "booked";
        }
      }

      return {
        dayLabel: date.getDate(),
        dateKey,
        currentMonth: date.getMonth() === referenceDate.getMonth(),
        isToday: dateKey === todayKey,
        tone,
        count: dayBookings.length
      };
    })
  );

  return {
    label: formatMonthLabel(referenceDate),
    weeks
  };
}
