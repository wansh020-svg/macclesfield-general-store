import { NextResponse } from "next/server";
import { isStaff } from "@/lib/auth";
import { createOrder, getDelivery, getOrders, getPickup, priceCart } from "@/lib/db";
import { haversineKm } from "@/lib/geo";
import { describeWindows, pickupState, serviceState } from "@/lib/hours";
import { ORDER_TYPES } from "@/lib/orderStatus";
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
  const orderType = body.orderType === undefined ? "delivery" : body.orderType;
  if (!ORDER_TYPES.includes(orderType)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const pickup = orderType === "pickup";
  const address = pickup ? "" : clip(body.address, 200);
  const notes = clip(body.notes, 500);
  const lines = Array.isArray(body.items) ? body.items.slice(0, 40) : [];
  // where the customer came from (poster, flyer...): optional and only simple words are kept
  const source = /^[a-z0-9_-]{1,20}$/i.test(String(body.source || "")) ? String(body.source).toLowerCase() : null;

  if (!customerName || !phone || (!pickup && !address) || lines.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Each way of ordering has its own times (Dashboard > Settings). Refuse anything outside them.
  let delivery, pickupCfg;
  try {
    [delivery, pickupCfg] = await Promise.all([getDelivery(), getPickup()]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
  }
  const cfg = pickup ? pickupCfg : delivery;
  const when = serviceState(cfg);
  if (!when.open) {
    const days = describeWindows(cfg.schedule).map((l) => l.text).join(" and ");
    const other = pickup ? serviceState(delivery) : pickupState(pickupCfg);
    const hint = other.open ? ` ${pickup ? "Delivery" : "Pickup"} is open right now if you'd like to switch.` : "";
    const message = when.paused
      ? `${pickup ? "Pickup" : "Online ordering"} is paused right now. Please call the store on (08) 8188 5301.${hint}`
      : `We're not taking ${pickup ? "pickup" : "delivery"} orders right now. ${pickup ? "Pickup" : "Delivery"} runs ${days || "at set times"}${when.next ? `. Next: ${when.next.text}` : ""}.${hint}`;
    return NextResponse.json({ error: message, closed: true }, { status: 409 });
  }

  // Where is it going? A signed proof from /api/address means the address was looked up and the
  // location is trustworthy. Without one the order is allowed only as "unverified", and staff call to confirm.
  // (A pickup has no address, so none of this applies.)
  let place = { verified: false };
  if (!pickup) {
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
      orderType, etaMinutes: pickup ? pickupCfg.prepMinutes : null,
    });
    return NextResponse.json({
      success: true,
      order: { id: order.id, created_at: order.created_at, total: priced.total, token: order.track_token, type: orderType, etaMinutes: pickup ? pickupCfg.prepMinutes : null },
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
