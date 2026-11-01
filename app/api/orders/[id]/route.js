import { NextResponse } from "next/server";
import { isStaff } from "@/lib/auth";
import { setOrderStatus } from "@/lib/db";
import { STATUSES } from "@/lib/orderStatus";

export async function PATCH(request, { params }) {
  if (!(await isStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const id = Number(params.id);
  if (!Number.isInteger(id) || !STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  try {
    const found = await setOrderStatus(id, body.status, body.reason);
    if (!found) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not update the order" }, { status: 500 });
  }
}
