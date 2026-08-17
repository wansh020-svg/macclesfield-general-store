import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createOrder, getOrders } from "@/lib/db";

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
  const auth = cookieStore.get("staff_auth");
  if (!auth || auth.value !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const orders = await getOrders();
  return NextResponse.json({ orders });
}
