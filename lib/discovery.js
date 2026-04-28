export const US_STATES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming"
];

export const DISCOVER_SORT_OPTIONS = [
  { value: "highest_rated", label: "Highest rated" },
  { value: "most_reviewed", label: "Most reviewed" },
  { value: "price_low", label: "Price: low to high" },
  { value: "next_available", label: "Next available" },
  { value: "nearest", label: "Nearest first" }
];

export const DISCOVER_PRICE_OPTIONS = [
  { value: "", label: "Any price" },
  { value: "under_100", label: "Under $100" },
  { value: "100_200", label: "$100 to $200" },
  { value: "200_plus", label: "$200+" }
];

function cleanPart(value) {
  return String(value || "").trim();
}

export function normalizeVendorLocationFields(input = {}) {
  const location = cleanPart(input.location);
  const locationParts = location
    .split(",")
    .map((item) => cleanPart(item))
    .filter(Boolean);

  let state = cleanPart(input.state);
  let city = cleanPart(input.city);
  let area = cleanPart(input.area);

  const hasLegacyStateInCity = !cleanPart(input.state) && city && locationParts.length > 1;

  if (!state && locationParts.length) {
    state = locationParts[locationParts.length - 1] || city;
  }

  if (hasLegacyStateInCity && city === state) {
    if (locationParts.length >= 3) {
      area = area || locationParts[0];
      city = locationParts[1];
    } else if (locationParts.length === 2) {
      city = locationParts[0];
      area = area || locationParts[0];
    }
  }

  if (!city) {
    if (locationParts.length >= 3) {
      city = locationParts[1];
    } else if (locationParts.length >= 2) {
      city = locationParts[0];
    }
  }

  if (!area) {
    if (locationParts.length >= 3) {
      area = locationParts[0];
    } else if (locationParts.length === 2) {
      area = locationParts[0];
    }
  }

  return {
    state,
    city,
    area,
    location: location || [area, city, state].filter(Boolean).join(", ")
  };
}

export function normalizeCoordinate(value, fallback = null) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(6)) : fallback;
}

export function normalizeLocationPrecision(value, fallback = "approx_area") {
  return value === "exact" ? "exact" : fallback;
}

export function hasCoordinates(item) {
  return Number.isFinite(Number(item?.latitude)) && Number.isFinite(Number(item?.longitude));
}

export function buildVendorLocationLabel(vendor) {
  const area = cleanPart(vendor?.area);
  const city = cleanPart(vendor?.city);
  const state = cleanPart(vendor?.state);
  return [area, city, state].filter(Boolean).join(", ") || cleanPart(vendor?.location);
}

export function buildVendorCityStateLabel(vendor) {
  const city = cleanPart(vendor?.city);
  const state = cleanPart(vendor?.state);
  return [city, state].filter(Boolean).join(", ") || cleanPart(vendor?.location);
}

export function buildVendorMapPinLabel(vendor) {
  const area = cleanPart(vendor?.area);
  const city = cleanPart(vendor?.city);
  const state = cleanPart(vendor?.state);

  if (area && city) {
    return `${area}, ${city}`;
  }

  if (city && state) {
    return `${city}, ${state}`;
  }

  return buildVendorLocationLabel(vendor);
}

export function formatReviewCount(value) {
  return new Intl.NumberFormat("en-US").format(Number(value || 0));
}

export function formatDistanceLabel(distanceMiles) {
  if (!Number.isFinite(distanceMiles)) {
    return "";
  }

  if (distanceMiles < 1) {
    return "Less than 1 mi away";
  }

  return `${distanceMiles.toFixed(distanceMiles >= 10 ? 0 : 1)} mi away`;
}

export function distanceMilesBetween(fromLat, fromLng, toLat, toLng) {
  const lat1 = Number(fromLat);
  const lng1 = Number(fromLng);
  const lat2 = Number(toLat);
  const lng2 = Number(toLng);

  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) {
    return null;
  }

  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusMiles = 3958.7613;
  const deltaLat = toRadians(lat2 - lat1);
  const deltaLng = toRadians(lng2 - lng1);
  const startLat = toRadians(lat1);
  const endLat = toRadians(lat2);
  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(startLat) * Math.cos(endLat) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMiles * c;
}

export function matchPriceRange(price, range) {
  const amount = Number(price || 0);

  if (!range) {
    return true;
  }

  if (range === "under_100" || range === "under_5000") {
    return amount > 0 && amount < 100;
  }

  if (range === "100_200" || range === "5000_10000") {
    return amount >= 100 && amount <= 200;
  }

  if (range === "200_plus" || range === "10000_plus") {
    return amount >= 200;
  }

  return true;
}

export function getNextAvailabilityMeta(bookingWindows = []) {
  const nextWindow = (bookingWindows || []).find((window) => Array.isArray(window?.slots) && window.slots.length);

  if (!nextWindow) {
    return {
      label: "",
      timestamp: null
    };
  }

  const firstSlot = nextWindow.slots[0] || "";
  const label = `${nextWindow.label}${firstSlot ? ` · ${firstSlot}` : ""}`;
  const timestamp = Date.parse(`${String(nextWindow.date || "").slice(0, 10)}T12:00:00`);

  return {
    label,
    timestamp: Number.isFinite(timestamp) ? timestamp : null
  };
}

export function parseGeocodeResult(result = {}) {
  const components = Array.isArray(result.address_components) ? result.address_components : [];
  const findComponent = (...types) =>
    components.find((component) => types.every((type) => component.types?.includes(type))) || null;

  const areaComponent =
    findComponent("neighborhood") ||
    findComponent("sublocality", "political") ||
    findComponent("sublocality_level_1", "sublocality", "political") ||
    findComponent("premise");
  const cityComponent =
    findComponent("locality", "political") ||
    findComponent("postal_town", "political") ||
    findComponent("administrative_area_level_2", "political");
  const stateComponent = findComponent("administrative_area_level_1", "political");

  return {
    formattedAddress: cleanPart(result.formatted_address),
    area: cleanPart(areaComponent?.long_name),
    city: cleanPart(cityComponent?.long_name),
    state: cleanPart(stateComponent?.long_name),
    latitude: normalizeCoordinate(result.geometry?.location?.lat),
    longitude: normalizeCoordinate(result.geometry?.location?.lng),
    placeId: cleanPart(result.place_id)
  };
}
