import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(amount);
}

export function calculateDeposit(service, total = Number(service?.price || 0)) {
  const depositType = service?.depositType || "percentage";
  const depositValue = Number(service?.depositValue ?? 0);

  if (!depositValue || !total) {
    return 0;
  }

  if (depositType === "fixed") {
    return Math.min(total, Math.round(depositValue));
  }

  return Math.min(total, Math.round((total * depositValue) / 100));
}

export function filterStylists(stylists, filters = {}) {
  const query = (filters.query || "").toLowerCase().trim();
  const state = filters.state || filters.city || "";
  const category = filters.category || "";

  return stylists.filter((stylist) => {
    const matchesQuery =
      !query ||
      [
        stylist.name,
        stylist.state,
        stylist.city,
        stylist.area,
        stylist.category,
        stylist.location,
        stylist.tagline,
        ...(stylist.specialties || [])
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);

    const matchesState = !state || (stylist.state || stylist.city) === state;
    const matchesCategory = !category || stylist.category === category;

    return matchesQuery && matchesState && matchesCategory;
  });
}

export function createSlug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function toList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
