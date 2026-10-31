import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { markOrderStatus } from "@/lib/db";
import { SESSION_COOKIE, isValidSession } from "@/lib/session";

export async function PATCH(request, { params }) {
  const cookieStore = cookies();
  if (!(await isValidSession(cookieStore.get(SESSION_COOKIE)?.value))) {
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
