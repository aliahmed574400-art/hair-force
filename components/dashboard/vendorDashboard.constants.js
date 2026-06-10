// Pure data constants extracted from VendorDashboardManager.jsx so the main
// component file is closer to its actual React responsibilities. These have
// no React or runtime dependencies, so they live in a plain .js file.
//
// Icon-bearing collections (SECTION_OPTIONS, SETTINGS_TABS) stay in the
// component file because they reference lucide-react components — moving
// them here would just shift the icon import.

export const PROFILE_TABS = [
  { id: "personal", label: "Personal Info" },
  { id: "business", label: "Business Info" },
  { id: "social", label: "Social Info" },
  { id: "products", label: "Products" }
];
export const PROFILE_TAB_IDS = new Set(PROFILE_TABS.map((tab) => tab.id));

export const VENDOR_NOTIFICATION_OPTIONS = [
  {
    key: "bookingUpdates",
    label: "Booking updates",
    description: "New bookings, approvals, reschedules, cancellations, and completed visits."
  },
  {
    key: "clientMessages",
    label: "Client messages",
    description: "New inbox replies and prep questions from booked clients."
  },
  {
    key: "paymentAlerts",
    label: "Payment and deposit alerts",
    description: "Deposits, payout reminders, failed payments, and card setup changes."
  },
  {
    key: "reviewRequests",
    label: "Review follow-ups",
    description: "Prompts to request reviews after completed appointments."
  },
  {
    key: "securityAlerts",
    label: "Security alerts",
    description: "Password, login email, and sensitive account changes."
  }
];

export const TIME_OPTIONS = [
  ["08:00", "8:00 AM"],
  ["09:00", "9:00 AM"],
  ["10:00", "10:00 AM"],
  ["11:00", "11:00 AM"],
  ["12:00", "12:00 PM"],
  ["13:00", "1:00 PM"],
  ["14:00", "2:00 PM"],
  ["15:00", "3:00 PM"],
  ["16:00", "4:00 PM"],
  ["17:00", "5:00 PM"],
  ["18:00", "6:00 PM"],
  ["19:00", "7:00 PM"],
  ["20:00", "8:00 PM"],
  ["21:00", "9:00 PM"],
  ["22:00", "10:00 PM"]
];

export const PRONOUN_OPTIONS = [
  ["he", "him", "his"],
  ["she", "her", "hers"],
  ["they", "them", "theirs"]
];

export const PROFESSION_OPTIONS = [
  "Hair Stylist",
  "Cosmetologist",
  "Makeup Artist",
  "Barber",
  "Esthetician",
  "Nail Technician",
  "Massage Practitioner",
  "Colorist",
  "Other Professional"
];

export const PRODUCT_CATEGORIES = [
  "Shampoo",
  "Conditioner",
  "Styling",
  "Treatment",
  "Tools",
  "Hair Color",
  "Skin Care",
  "Other"
];

export const SERVICE_MENU_TABS = [
  { id: "services", label: "Services" },
  { id: "addons", label: "Add-ons" }
];

export const DURATION_OPTIONS = [
  "15 Minutes",
  "30 Minutes",
  "45 Minutes",
  "60 Minutes",
  "75 Minutes",
  "90 Minutes",
  "120 Minutes",
  "150 Minutes",
  "180 Minutes"
];

export const SERVICE_CATALOG_GROUPS = [
  {
    name: "Women's Haircut",
    items: ["Bang Trim", "Women's Cut", "Women's Trim", "Women's Dry Cut"]
  },
  {
    name: "Men's Haircut",
    items: ["Men's Cut", "Men's Trim", "Neck Trim"]
  },
  {
    name: "Kids",
    items: ["Kid's Braids", "Kid's Style", "Kid's Cut"]
  },
  {
    name: "Hair Color",
    items: [
      "All Over Color",
      "Bleach and Tone",
      "Carmelizing Color",
      "Color Correction",
      "Double Process Color",
      "Hair Tint",
      "Partial Color",
      "Permanent Color",
      "Root Touch Up",
      "Semi Permanent Color",
      "Single Process Color",
      "Toner",
      "Touch Ups"
    ]
  },
  {
    name: "Highlights",
    items: [
      "Babylights",
      "Full Balayage",
      "Full Foil Highlights",
      "Full Highlights",
      "Lowlights",
      "Ombre",
      "Partial Balayage",
      "Partial Foil Highlights",
      "Partial Highlights"
    ]
  },
  {
    name: "Style",
    items: [
      "Additional Extension Add-On",
      "Blowout",
      "Braid Bar Style",
      "Flat Iron",
      "Style",
      "Updo",
      "Wand / Barrel Curls"
    ]
  },
  {
    name: "Hair Treatments",
    items: [
      "Clarifying Treatment",
      "Deep Conditioning Treatment",
      "Hair Glaze Treatment",
      "Malibu Treatment",
      "Olaplex Treatment",
      "Protein Treatment",
      "Scalp Treatment",
      "Smoothing Treatment",
      "Trichology Treatment"
    ]
  },
  {
    name: "Natural Hair",
    items: [
      "Cellophane / Clear Rinse",
      "Hot Oil Treatment",
      "Natural Coils",
      "Natural Flexi Rods",
      "Natural Perm Rods",
      "Natural Style",
      "Natural Treatments",
      "Natural Twists",
      "Silk Press",
      "Spiral Set",
      "Takedown",
      "Transitioning Cut"
    ]
  },
  {
    name: "Weaves",
    items: [
      "Closure Sew In",
      "Full Sew In",
      "Full Weave",
      "Invisible Part Sew In",
      "Lace Closure Sew In",
      "Netting",
      "Partial Sew In",
      "Partial Weave",
      "Quick Weave",
      "Sew-in maintenance",
      "Silk Closure Sew in",
      "Takedown",
      "Tracking / Single Track Sew-In",
      "Versatile Sew In",
      "Weave maintenance"
    ]
  },
  {
    name: "Extensions",
    items: [
      "Bonding Hair Extensions",
      "Extension Coloring",
      "Extension Trimming",
      "Extensions",
      "Feather Extensions",
      "Full Set",
      "Fusion Braid Extensions",
      "Glue in Extensions",
      "Loc Extensions",
      "Micro Ring Extensions",
      "Microlinks Extensions",
      "Partial Set",
      "Tinsel Extensions"
    ]
  },
  {
    name: "Braids",
    items: [
      "Box Braids",
      "Braids",
      "Cornrows",
      "Crochet Braids",
      "Ghana Braids",
      "Goddess Braids",
      "Individual Braids",
      "Poetic Justice Braids",
      "Tree Braids"
    ]
  },
  {
    name: "Lesson",
    items: [
      "Bang Trim Lesson",
      "Barrel Curls Lesson",
      "Blowout Lesson",
      "Braids Lesson",
      "Color Lesson",
      "Deep Conditioning Treatment Lesson",
      "Eyebrow Shaping Lesson",
      "Flat Iron Lesson",
      "Haircut Lesson",
      "Lashes Lesson",
      "Loc Maintenance Lesson",
      "Men's Cut Lesson",
      "Nails Lesson",
      "Natural Flexi Rods Lesson",
      "Natural Style Lesson",
      "Neck Trim Lesson",
      "Root Touch Up Lesson",
      "Roots Lesson",
      "Shampoo Lesson",
      "Skincare Lesson",
      "Style Lesson",
      "Styling Lesson",
      "Trim Lesson",
      "Twist Out Lesson",
      "Twists Lesson",
      "Wand Curls Lesson",
      "Women's Cut Lesson",
      "Women's Trim Lesson"
    ]
  },
  {
    name: "Tutorial",
    items: [
      "Natural Flexi Rods Tutorial",
      "Natural Style Tutorial",
      "Neck Trim Tutorial",
      "Root Touch Up Tutorial",
      "Roots Tutorial",
      "Shampoo Tutorial",
      "Skincare Tutorial",
      "Style Tutorial",
      "Styling Tutorial",
      "Trim Tutorial",
      "Twist Out Tutorial",
      "Twists Tutorial",
      "Wand Curls Tutorial",
      "Women's Cut Tutorial",
      "Women's Trim Tutorial"
    ]
  }
];

export const CALENDAR_WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const OVERVIEW_BOOKING_FILTERS = [
  { id: "all", label: "All" },
  { id: "upcoming", label: "Upcoming" },
  { id: "today", label: "Ongoing" },
  { id: "past", label: "Past appointments" },
  { id: "cancelled", label: "Cancelled" }
];

export const AVATAR_SWATCHES = [
  ["#d9ecff", "#1d4ed8"],
  ["#dff7f4", "#0f766e"],
  ["#efe4ff", "#6d28d9"],
  ["#fee7db", "#c2410c"],
  ["#e7ecff", "#3730a3"],
  ["#dbeafe", "#1e3a8a"]
];
