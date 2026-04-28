import { parseGeocodeResult } from "@/lib/discovery";

function getGoogleMapsApiKey() {
  return (
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    ""
  );
}

async function callGoogleGeocoding(params) {
  const apiKey = getGoogleMapsApiKey();

  if (!apiKey) {
    throw new Error("Google Maps is not configured yet.");
  }

  const searchParams = new URLSearchParams({
    key: apiKey,
    ...params
  });
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${searchParams}`, {
    cache: "no-store"
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_message || "Unable to reach Google Geocoding.");
  }

  if (data.status !== "OK" || !Array.isArray(data.results) || !data.results.length) {
    throw new Error(data.error_message || "No matching location was found.");
  }

  return data.results;
}

export async function geocodeLocationQuery({ state = "", city = "", area = "", location = "" } = {}) {
  const query = [location, area, city, state]
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .join(", ");

  if (!query) {
    throw new Error("Enter a location, city, or state first.");
  }

  const results = await callGoogleGeocoding({ address: query, region: "us" });
  const parsed = parseGeocodeResult(results[0]);

  return {
    ...parsed,
    input: query
  };
}

export async function reverseGeocodeCoordinates({ latitude, longitude }) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error("Valid coordinates are required.");
  }

  const results = await callGoogleGeocoding({ latlng: `${lat},${lng}` });
  const parsed = parseGeocodeResult(results[0]);

  return {
    ...parsed,
    latitude: parsed.latitude ?? Number(lat.toFixed(6)),
    longitude: parsed.longitude ?? Number(lng.toFixed(6))
  };
}
