import { NextResponse } from "next/server";
import { isStaff } from "@/lib/auth";
import { createOrder, getDelivery, getOrders, priceCart } from "@/lib/db";
import { haversineKm } from "@/lib/geo";
import { deliveryState, describeWindows } from "@/lib/hours";
import { readAddressProof } from "@/lib/session";

const clip = (v, n) => String(v ?? "").trim().slice(0, n);

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const customerName = clip(body.customerName, 80);
  const phone = clip(body.phone, 30);
  const address = clip(body.address, 200);
  const notes = clip(body.notes, 500);
  const lines = Array.isArray(body.items) ? body.items.slice(0, 40) : [];
  // where the customer came from (poster, flyer...): optional and only simple words are kept
  const source = /^[a-z0-9_-]{1,20}$/i.test(String(body.source || "")) ? String(body.source).toLowerCase() : null;

  if (!customerName || !phone || !address || lines.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Where is it going? A signed proof from /api/address means the address was looked up and the
  // location is trustworthy. Without one the order is allowed only as "unverified", and staff call to confirm.
  let place = { verified: false };
  let delivery;
  try {
    delivery = await getDelivery();
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
  }
  // Deliveries only run at set times (Dashboard > Settings). Refuse anything outside them.
  const when = deliveryState(delivery);
  if (!when.open) {
    const days = describeWindows(delivery.schedule)[0]?.text;
    const message = when.paused
      ? "Online ordering is paused right now. Please call the store on (08) 8188 5301."
      : `We're not delivering right now. Delivery runs ${days || "at set times"}${when.next ? `. Next delivery: ${when.next.text}` : ""}.`;
    return NextResponse.json({ error: message, closed: true }, { status: 409 });
  }

  if (body.addressProof) {
    const proof = await readAddressProof(body.addressProof);
    if (!proof) return NextResponse.json({ error: "Please check your address again." }, { status: 400 });
    const distanceKm = Math.round(haversineKm(delivery.lat, delivery.lng, proof.lat, proof.lng) * 10) / 10;
    if (delivery.enforce && distanceKm > delivery.radiusKm) {
      return NextResponse.json(
        { error: `Sorry, we only deliver within ${delivery.radiusKm} km of the store. That address is about ${distanceKm} km away.` },
        { status: 400 }
      );
    }
    place = { verified: true, distanceKm, lat: proof.lat, lng: proof.lng };
  } else if (delivery.enforce && !body.unverified) {
    return NextResponse.json({ error: "Please check your address before ordering." }, { status: 400 });
  }

  // Prices come from the database, never from the browser.
  let priced;
  try {
    priced = await priceCart(lines);
  } catch (err) {
    const known = /no longer available|Bad quantity|Please choose|in store/.test(err.message);
    if (!known) console.error(err);
    return NextResponse.json(
      { error: known ? err.message : "Failed to place order" },
      { status: known ? 400 : 500 }
    );
  }

  try {
    const order = await createOrder({
      customerName, phone, address, notes, items: priced.items, estimatedTotal: priced.total, place, source,
    });
    return NextResponse.json({
      success: true,
      order: { id: order.id, created_at: order.created_at, total: priced.total, token: order.track_token },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
  }
}

export async function GET() {
  if (!(await isStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ orders: await getOrders() }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load orders" }, { status: 500 });
  }
}
