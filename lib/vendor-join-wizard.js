export const SPECIALTY_OPTIONS = [
  "Women's Cuts",
  "Men's Cuts (Stylist)",
  "Men's Cuts (Barber)",
  "Hair Color",
  "Highlights",
  "Natural Hair",
  "Braids",
  "Locs",
  "Wigs",
  "Weaves",
  "Twists",
  "Nails",
  "Waxing",
  "Eyebrows",
  "Skincare",
  "Lashes",
  "Makeup",
  "Kids",
  "Other"
];

const DAY_INDEX = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6
};

function cleanString(value) {
  return String(value || "").trim();
}

export function buildVendorAccountPayload(values) {
  return {
    firstName: cleanString(values.firstName),
    lastName: cleanString(values.lastName),
    email: cleanString(values.email),
    password: String(values.password || ""),
    phone: cleanString(values.phone),
    smsOptIn: Boolean(values.smsOptIn),
    promoCode: cleanString(values.promoCode)
  };
}

export function buildVendorProfilePayload(values) {
  if (Array.isArray(values.specialtySelections)) {
    const specialties = values.specialtySelections.map(cleanString).filter(Boolean);
    return {
      category: specialties[0] || "",
      specialties
    };
  }

  if ("locationType" in values) {
    return {
      serviceLocationType: cleanString(values.locationType),
      location: [cleanString(values.addressLine1), cleanString(values.addressLine2)]
        .filter(Boolean)
        .join(", "),
      city: cleanString(values.city),
      state: cleanString(values.state),
      area: cleanString(values.area)
    };
  }

  return {
    name: cleanString(values.businessName),
    avatar: cleanString(values.profileImage)
  };
}

export function buildVendorAvailabilityPayload(values) {
  return {
    availabilityRules: (values.selectedDays || [])
      .map((day) => DAY_INDEX[String(day || "").toLowerCase()])
      .filter((dayOfWeek) => dayOfWeek !== undefined)
      .map((dayOfWeek) => ({
        dayOfWeek,
        startTime: cleanString(values.startTime) || "09:00",
        endTime: cleanString(values.endTime) || "18:00",
        slotMinutes: 120,
        active: true
      })),
    timezone: cleanString(values.timezone)
  };
}

export function inferVendorJoinStep({ user, vendor }) {
  if (user?.role !== "vendor") {
    return 1;
  }

  const hasProfileIntro = Boolean(cleanString(vendor?.name) && cleanString(vendor?.avatar));
  const portfolioCount = Array.isArray(vendor?.portfolioImages)
    ? vendor.portfolioImages.filter(Boolean).length
    : 0;
  const specialtyCount = Array.isArray(vendor?.specialties) ? vendor.specialties.filter(Boolean).length : 0;
  const hasLocationType = Boolean(cleanString(vendor?.serviceLocationType));
  const hasAvailability =
    Array.isArray(vendor?.availabilityRules) && vendor.availabilityRules.some((item) => item?.active !== false);

  if (!hasProfileIntro) {
    return 2;
  }

  if (portfolioCount < 4) {
    return 3;
  }

  if (!hasAvailability) {
    return 4;
  }

  if (!specialtyCount) {
    return 5;
  }

  if (!hasLocationType) {
    return 6;
  }

  return 6;
}
