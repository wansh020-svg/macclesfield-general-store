import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createOrder, getOrders } from "@/lib/db";
import { SESSION_COOKIE, isValidSession } from "@/lib/session";

export async function POST(request) {
  try {
    const body = await request.json();
    const { customerName, phone, address, notes, items, estimatedTotal } = body;

    if (!customerName || !phone || !address || !items || items.length === 0) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const order = await createOrder({ customerName, phone, address, notes, items, estimatedTotal });
    return NextResponse.json({ success: true, order });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to place order" }, { status: 500 });
  }
}

export async function GET() {
  const cookieStore = cookies();
  if (!(await isValidSession(cookieStore.get(SESSION_COOKIE)?.value))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await getOrders();
  return NextResponse.json({ orders });
}
