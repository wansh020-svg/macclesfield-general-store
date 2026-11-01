import { NextResponse } from "next/server";
import { isStaff } from "@/lib/auth";
import { createOrder, getOrders, priceCart } from "@/lib/db";

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

  if (!customerName || !phone || !address || lines.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
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
      customerName, phone, address, notes, items: priced.items, estimatedTotal: priced.total,
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
