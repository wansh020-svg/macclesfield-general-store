import { NextResponse } from "next/server";
import { isStaff } from "@/lib/auth";
import { adelaideDate } from "@/lib/runs";
import { openDriverAlerts } from "@/lib/db";
import { allowHit, createOrder, getRunBoard, digitsOf, getDelivery, getOrders, getPickup, isPhoneBlocked, orderByClientKey, priceCart, waitingOrdersFor } from "@/lib/db";
import { smsConfigured, textStaff } from "@/lib/sms";
import { haversineKm } from "@/lib/geo";
import { describeWindows, pickupState, serviceState } from "@/lib/hours";
import { ORDER_TYPES } from "@/lib/orderStatus";
import { deliveryFee, minOrderProblem, round2 } from "@/lib/fees";
import { readAddressProof } from "@/lib/session";

const dollars = (n) => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);
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

  // The same checkout attempt twice (a double tap, or a retry after a bad connection) gets the first order back.
  const clientKey = /^[A-Za-z0-9-]{16,64}$/.test(String(body.clientKey || "")) ? String(body.clientKey) : null;
  if (clientKey) {
    try {
      const again = await orderByClientKey(clientKey);
      if (again) return NextResponse.json({ success: true, order: again, repeat: true });
    } catch (err) {
      console.error(err);
    }
  }

  // Bots: a hidden box real people never fill in, limits per internet address and per phone number,
  // a cap on orders waiting for staff, and numbers staff have blocked.
  if (clip(body.website, 100)) {
    return NextResponse.json({ success: true, order: { id: 0, token: "x", total: 0, subtotal: 0, deliveryFee: 0, type: orderType } });
  }
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const call = "Please call the store on (08) 8188 5301 to order.";
  try {
    if (await isPhoneBlocked(phone)) return NextResponse.json({ error: `We can't take this order online. ${call}` }, { status: 403 });
    if (!(await allowHit(`order-ip:${ip}`, 30, 10)) || !(await allowHit(`order-phone:${digitsOf(phone)}`, 6, 10))) {
      // a simultaneous tap may have just placed this very order: hand it back instead of refusing
      const first = clientKey ? await orderByClientKey(clientKey) : null;
      if (first) return NextResponse.json({ success: true, order: first, repeat: true });
      return NextResponse.json({ error: `Too many orders in a short time. Please wait a few minutes. ${call}` }, { status: 429 });
    }
    if ((await waitingOrdersFor(phone)) >= 3) {
      const first = clientKey ? await orderByClientKey(clientKey) : null;
      if (first) return NextResponse.json({ success: true, order: first, repeat: true });
      return NextResponse.json({ error: `You already have orders waiting for us to confirm. ${call}` }, { status: 429 });
    }
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
  }

  // Each way of ordering has its own times (Dashboard > Settings). Refuse anything outside them.
  let delivery, pickupCfg;
  try {
    [delivery, pickupCfg] = await Promise.all([getDelivery(), getPickup()]);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
  }
  // Pickup follows its opening times. Delivery is booked by run (checked again when the order is saved).
  const asap = !pickup && delivery.asap !== false; // no run to pick: it goes out as soon as it is ready
  const runTime = !pickup && !asap && /^([01]\d|2[0-3]):[0-5]\d$/.test(String(body.run || "")) ? String(body.run) : null;
  if (!pickup && delivery.mode === "closed") {
    return NextResponse.json({ error: `Online delivery is paused right now. Please call the store on (08) 8188 5301.${pickupState(pickupCfg).open ? " Pickup is open right now if you'd like to switch." : ""}`, closed: true }, { status: 409 });
  }
  if (!pickup && !asap && !runTime) {
    return NextResponse.json({ error: "Please choose a delivery run." }, { status: 400 });
  }
  const cfg = pickup ? pickupCfg : delivery;
  const when = pickup || asap ? serviceState(cfg) : { open: true };
  if (!when.open) {
    const days = describeWindows(cfg.schedule).map((l) => l.text).join(" and ");
    const other = pickup ? serviceState(delivery) : pickupState(pickupCfg);
    const hint = other.open ? ` ${pickup ? "Delivery" : "Pickup"} is open right now if you'd like to switch.` : "";
    const message = when.paused
      ? `${pickup ? "Pickup" : "Online ordering"} is paused right now. Please call the store on (08) 8188 5301.${hint}`
      : `We're not taking ${pickup ? "pickup" : "delivery"} orders right now. ${pickup ? "Pickup" : "Delivery"} is ${days || "at set times"}${when.next ? `. Next: ${when.next.text}` : ""}.${hint}`;
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
    const known = /no longer available|Bad quantity|Please choose|in store|isn't available/.test(err.message);
    if (!known) console.error(err);
    return NextResponse.json(
      { error: known ? err.message : "Failed to place order" },
      { status: known ? 400 : 500 }
    );
  }

  // Delivery has a fee (and maybe a minimum order); pickup has neither. The server decides, never the browser.
  let fee = 0;
  if (!pickup) {
    const short = minOrderProblem(delivery, priced.total);
    if (short) {
      return NextResponse.json(
        { error: `Delivery orders need at least ${dollars(short.min)} of food (yours is ${dollars(priced.total)}). Add ${dollars(short.short)} more, or choose pickup.` },
        { status: 400 }
      );
    }
    fee = deliveryFee(delivery, priced.total, place.verified ? place.distanceKm : null);
  }
  const total = round2(priced.total + fee);

  try {
    let order;
    try {
      order = await createOrder({
        customerName, phone, address, notes, items: priced.items, estimatedTotal: total, deliveryFee: fee, place, source,
        orderType, etaMinutes: pickup ? pickupCfg.prepMinutes : null, clientKey,
        run: pickup || asap ? null : { date: adelaideDate(), time: runTime },
      });
    } catch (err) {
      if (err.code === "RUN") {
        const board = await getRunBoard().catch(() => null);
        return NextResponse.json({ error: err.message, runs: board?.runs?.map((x) => ({ time: x.time, label: x.label, status: x.status, left: x.left, departs: x.departs, arrives: x.arrives, delay: x.delay })) }, { status: 409 });
      }
      // two taps at the same instant: the second hits the unique key, so hand back the first order
      const first = err.code === "23505" && clientKey ? await orderByClientKey(clientKey) : null;
      if (first) return NextResponse.json({ success: true, order: first, repeat: true });
      throw err;
    }
    // Backup alert to the staff phone (only if set up; a cap stops a flood of texts costing money)
    if (smsConfigured() && (await allowHit("sms", 40, 60).catch(() => false))) {
      await textStaff(`New ${orderType} order #${order.id}: ${customerName}, ${dollars(total)}. Open the dashboard.`);
    }
    return NextResponse.json({
      success: true,
      order: { id: order.id, created_at: order.created_at, total, subtotal: priced.total, deliveryFee: fee, token: order.track_token, type: orderType, etaMinutes: pickup ? pickupCfg.prepMinutes : null },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
  }
}

export async function GET() {
  if (!(await isStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    // one request answers both: the orders and any driver "Need help" alerts
    const [orders, alerts] = await Promise.all([getOrders(), openDriverAlerts().catch(() => [])]);
    return NextResponse.json({ orders, alerts }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load orders" }, { status: 500 });
  }
}
