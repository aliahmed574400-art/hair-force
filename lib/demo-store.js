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

function normalizeServices(vendor) {
  return vendor.services.map((service, index) => ({
    ...service,
    id: service.id || `srv-${vendor.slug}-${index + 1}`,
    vendorSlug: vendor.slug,
    vendorName: vendor.name,
    category: vendor.category,
    depositType: service.depositType || "percentage",
    depositValue: service.depositValue ?? (service.price >= 10000 ? 25 : 20),
    imageUrl: service.imageUrl || ""
  }));
}

function createInitialStore() {
  const vendors = clone(stylists).map((vendor) => ({
    ...vendor,
    status: vendor.status || "active",
    coverImage: vendor.coverImage || "",
    galleryImages: vendor.galleryImages || [],
    availabilityRules: vendor.availabilityRules || deriveRulesFromBookingWindows(vendor.bookingWindows || []),
    blackoutDates: vendor.blackoutDates || []
  }));

  vendors.push({
    id: "vendor-pending-01",
    slug: "luna-beauty-suite",
    name: "Luna Beauty Suite",
    owner: "Luna Ahmed",
    category: "Salon",
    city: "Karachi",
    location: "Bahadurabad, Karachi",
    rating: 5,
    reviewCount: 0,
    priceFrom: 0,
    responseTime: "Pending approval",
    verified: false,
    heroTag: "Soft opening beauty studio",
    tagline: "Awaiting admin approval before going live on Hair Force.",
    bio: "New vendor application waiting for marketplace review.",
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
    services: [],
    gallery: [],
    reviews: [],
    availabilityRules: createDefaultAvailabilityRules(),
    blackoutDates: [],
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

  const users = [
    {
      id: "usr-client-demo",
      name: "Demo Client",
      email: "client@hairforce.app",
      phone: "0300 0000000",
      city: "Karachi",
      role: "client",
      passwordHash: hashSync("demo12345", 10)
    },
    {
      id: "usr-vendor-demo",
      name: vendors[0].owner,
      email: "vendor@hairforce.app",
      phone: "0300 1111111",
      city: hydratedVendors[0].city,
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
      role: "admin",
      passwordHash: hashSync("demo12345", 10)
    }
  ];

  const bookings = [
    {
      id: "bk-demo-101",
      vendorSlug: hydratedVendors[0].slug,
      vendorName: hydratedVendors[0].name,
      customerId: users[0].id,
      customerName: users[0].name,
      customerEmail: users[0].email,
      customerPhone: users[0].phone,
      serviceId: services[0].id,
      serviceName: services[0].title,
      appointmentDate: hydratedVendors[0].bookingWindows[0].date,
      appointmentSlot: hydratedVendors[0].bookingWindows[0].slots[0],
      total: services[0].price,
      depositAmount: Math.round(services[0].price * 0.2),
      remainingAmount: services[0].price - Math.round(services[0].price * 0.2),
      paymentStatus: "deposit_paid",
      paymentIntentId: "pi_demo_101",
      notes: "Please keep the layers soft.",
      status: "confirmed",
      source: "web",
      createdAt: new Date().toISOString()
    },
    {
      id: "bk-demo-102",
      vendorSlug: hydratedVendors[0].slug,
      vendorName: hydratedVendors[0].name,
      customerName: "Sana Tahir",
      customerEmail: "sana@example.com",
      customerPhone: "0300 9999999",
      serviceId: services[1].id,
      serviceName: services[1].title,
      appointmentDate: hydratedVendors[0].bookingWindows[1].date,
      appointmentSlot: hydratedVendors[0].bookingWindows[1].slots[1],
      total: services[1].price,
      depositAmount: Math.round(services[1].price * 0.25),
      remainingAmount: services[1].price - Math.round(services[1].price * 0.25),
      paymentStatus: "deposit_due",
      paymentIntentId: "",
      notes: "",
      status: "confirmed",
      source: "web",
      createdAt: new Date().toISOString()
    }
  ];

  return {
    vendors: hydratedVendors,
    services,
    users,
    bookings
  };
}

export function getDemoStore() {
  if (!globalThis.hairforceDemoStore) {
    globalThis.hairforceDemoStore = createInitialStore();
  }

  return globalThis.hairforceDemoStore;
}
