import { NextResponse } from "next/server";
import { markOrderStatus } from "@/lib/db";
import { isStaff } from "@/lib/auth";

export async function PATCH(request, { params }) {
  if (!(await isStaff())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { status } = await request.json();
  const id = Number(params.id);
  if (!Number.isInteger(id) || !["new", "fulfilled"].includes(status)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  await markOrderStatus(id, status);
  return NextResponse.json({ success: true });
}
