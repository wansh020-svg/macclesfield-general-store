import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { markOrderStatus } from "@/lib/db";

export async function PATCH(request, { params }) {
  const cookieStore = cookies();
  const auth = cookieStore.get("staff_auth");
  if (!auth || auth.value !== "true") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { status } = await request.json();
  await markOrderStatus(params.id, status);
  return NextResponse.json({ success: true });
}
