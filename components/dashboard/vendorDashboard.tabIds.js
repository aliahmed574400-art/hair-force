// Tab/section ID sets used by the dashboard helpers for URL → section resolution.
// Lives in its own file so vendorDashboard.helpers.js doesn't have to import
// from the icon-bearing arrays in the main component (which would cause a
// lucide-react chain into a non-React file).
//
// Keep these in sync with the SECTION_OPTIONS / PROFILE_TABS / SETTINGS_TABS
// arrays declared in VendorDashboardManager.jsx.

import {
  PROFILE_TABS
} from "@/components/dashboard/vendorDashboard.constants";

export const VENDOR_SECTION_IDS = new Set([
  "overview",
  "profile",
  "gallery",
  "services",
  "availability",
  "bookings",
  "messages",
  "settings"
]);

export const SETTINGS_TAB_IDS = new Set([
  "notification",
  "billing",
  "email",
  "password",
  "delete"
]);

export const PROFILE_TAB_IDS = new Set(PROFILE_TABS.map((tab) => tab.id));

// Re-export AVATAR_SWATCHES for the helpers to consume without pulling the
// rest of the constants module.
export { AVATAR_SWATCHES } from "@/components/dashboard/vendorDashboard.constants";
