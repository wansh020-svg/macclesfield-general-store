import { NextResponse } from "next/server";
import { isStaff } from "@/lib/auth";
import { openDriverAlerts, resolveDriverAlert } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ alerts: await openDriverAlerts() }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load alerts" }, { status: 500 });
  }
}

export async function POST(request) {
  if (!(await isStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await request.json();
    if (!Number.isInteger(Number(id))) return NextResponse.json({ error: "Bad request" }, { status: 400 });
    const done = await resolveDriverAlert(Number(id));
    return done ? NextResponse.json({ success: true }) : NextResponse.json({ error: "Alert not found" }, { status: 404 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
