import { NextResponse } from "next/server";
import { allowHit, findAddress, getDelivery } from "@/lib/db";
import { haversineKm } from "@/lib/geo";
import { signAddressProof } from "@/lib/session";

// The customer taps "Check address". We look it up once, work out the distance from
// the store, and hand back a signed proof the order will carry.
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const query = String(body.query || "").trim().slice(0, 150);
  if (query.length < 6) return NextResponse.json({ error: "Type your street number, street and suburb." }, { status: 400 });

  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  try {
    // The free map service is shared, so keep one person from hammering it.
    if (!(await allowHit(`addr:${ip}`, 20, 10))) {
      return NextResponse.json({ error: "Too many address checks. Wait a few minutes, or call the store.", canSkip: true }, { status: 429 });
    }
    const here = await getDelivery();
    const { results } = await findAddress(query);
    const out = [];
    for (const r of results) {
      const distanceKm = Math.round(haversineKm(here.lat, here.lng, r.lat, r.lng) * 10) / 10;
      out.push({
        label: r.label, precise: r.precise, distanceKm,
        inRange: !here.enforce || distanceKm <= here.radiusKm,
        proof: await signAddressProof({ label: r.label, lat: r.lat, lng: r.lng }),
      });
    }
    return NextResponse.json(
      { radiusKm: here.radiusKm, enforce: here.enforce, results: out },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Address lookup failed:", err.message);
    return NextResponse.json(
      { error: "Address checking isn't available right now. You can continue and we'll call to confirm.", canSkip: true },
      { status: 503 }
    );
  }
}
