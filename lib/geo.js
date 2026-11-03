// Address lookup and distance, using Photon (https://photon.komoot.io), a free
// OpenStreetMap-based search that is built for search-as-you-type.
//
// (OpenStreetMap's other free service, Nominatim, forbids search-as-you-type, so it is
// not used.) Photon's public server asks for fair use and gives no uptime promise, so:
// the browser waits for a pause in typing before asking, results are cached in our
// database, requests are spaced out, and if it's ever down the checkout lets the order
// through as "address not checked". To use a different service later (for example
// Google), only lookupAddress() below needs to change.

const ENDPOINT = process.env.GEOCODER_URL || "https://photon.komoot.io/api/";
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

// "12 Smith Street, Macclesfield SA 5153" from a Photon feature's properties.
export function labelFor(p) {
  const street = [p.housenumber, p.street || (p.osm_key === "highway" ? p.name : "")].filter(Boolean).join(" ");
  const place = p.suburb || p.locality || p.district || p.city || p.town || p.village || (street ? "" : p.name) || "";
  const state = STATES[String(p.state || "").toLowerCase()] || p.state || "";
  const tail = [place, [state, p.postcode].filter(Boolean).join(" ")].filter(Boolean).join(" ");
  return [street, tail].filter(Boolean).join(", ") || String(p.name || "");
}

let lastCall = 0;
async function throttle() {
  const wait = Math.max(0, lastCall + 300 - Date.now());
  lastCall = Date.now() + wait; // claim the slot before waiting so concurrent calls queue up
  if (wait) await new Promise((r) => setTimeout(r, wait));
}

// Returns [{ label, lat, lng, precise }] or throws if the service can't be reached.
export async function lookupAddress(query, near) {
  await throttle();
  const url = new URL(ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "8");
  url.searchParams.set("lang", "en");
  if (near) {
    // Look near the store (about 65 km each way) and rank closer results higher.
    const d = 0.6;
    url.searchParams.set("bbox", [near.lng - d, near.lat - d, near.lng + d, near.lat + d].join(","));
    url.searchParams.set("lat", String(near.lat));
    url.searchParams.set("lon", String(near.lng));
  }
  const res = await fetch(url, {
    headers: { "User-Agent": `MacclesfieldGeneralStore/1.0 (+https://${SITE})`, Accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Geocoder returned ${res.status}`);
  const { features = [] } = await res.json();
  const seen = new Set();
  return features
    .filter((f) => f.properties?.countrycode === "AU" && (f.properties.housenumber || f.properties.street || f.properties.osm_key === "highway"))
    .map((f) => ({
      label: labelFor(f.properties), lng: Number(f.geometry?.coordinates?.[0]), lat: Number(f.geometry?.coordinates?.[1]),
      precise: Boolean(f.properties.housenumber),
    }))
    .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng) && r.label && !seen.has(r.label) && seen.add(r.label))
    // closest to the store first, so the right street in town comes before a same-named one far away
    .sort((a, b) => (near ? haversineKm(near.lat, near.lng, a.lat, a.lng) - haversineKm(near.lat, near.lng, b.lat, b.lng) : 0) || Number(b.precise) - Number(a.precise))
    .slice(0, 6);
}
