// Address lookup and distance, using OpenStreetMap's free Nominatim service.
//
// Nominatim's usage rules: identify yourself with a User-Agent, at most one request
// per second, no search-as-you-type, and cache results. So the checkout does ONE
// lookup when the customer taps "Check address" (not one per keystroke), results are
// cached in our database, and requests are spaced out. To use a different service
// later (for example Google), only geocode() below needs to change.

const ENDPOINT = process.env.GEOCODER_URL || "https://nominatim.openstreetmap.org/search";
const SITE = process.env.SITE_URL || "macclesfieldgeneralstore.com.au";
const STATES = {
  "south australia": "SA", "new south wales": "NSW", victoria: "VIC", queensland: "QLD",
  "western australia": "WA", tasmania: "TAS", "northern territory": "NT", "australian capital territory": "ACT",
};

export function haversineKm(lat1, lng1, lat2, lng2) {
  const rad = (d) => (d * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

export const normalizeQuery = (q) => String(q).toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

// "Venables Street, Macclesfield SA 5153" from a Nominatim result.
export function labelFor(r) {
  const a = r.address || {};
  const street = [a.house_number, a.road].filter(Boolean).join(" ");
  const place = a.suburb || a.town || a.village || a.hamlet || a.city || a.locality || "";
  const state = STATES[String(a.state || "").toLowerCase()] || a.state || "";
  const tail = [place, [state, a.postcode].filter(Boolean).join(" ")].filter(Boolean).join(" ");
  const label = [street, tail].filter(Boolean).join(", ");
  return label || String(r.display_name || "").replace(/, Australia$/, "");
}

let lastCall = 0;
async function throttle() {
  const wait = Math.max(0, lastCall + 1100 - Date.now());
  lastCall = Date.now() + wait; // claim the slot before waiting so concurrent calls queue up
  if (wait) await new Promise((r) => setTimeout(r, wait));
}

// Returns [{ label, lat, lng, precise }] or throws if the service can't be reached.
export async function lookupAddress(query, near) {
  await throttle();
  const url = new URL(ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("countrycodes", "au");
  url.searchParams.set("limit", "5");
  if (near) {
    // Prefer (but don't force) results near the store.
    const d = 0.35;
    url.searchParams.set("viewbox", [near.lng - d, near.lat + d, near.lng + d, near.lat - d].join(","));
    url.searchParams.set("bounded", "0");
  }
  const res = await fetch(url, {
    headers: { "User-Agent": `MacclesfieldGeneralStore/1.0 (+https://${SITE})`, Accept: "application/json" },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`Geocoder returned ${res.status}`);
  const rows = await res.json();
  const seen = new Set();
  return rows
    .map((r) => ({
      label: labelFor(r), lat: Number(r.lat), lng: Number(r.lon),
      precise: Boolean(r.address?.house_number),
    }))
    .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng) && r.label && !seen.has(r.label) && seen.add(r.label));
}
