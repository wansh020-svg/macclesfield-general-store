import { NextResponse } from "next/server";
import { allowHit, logAreaCheck } from "@/lib/db";

export const dynamic = "force-dynamic";

// Counts the answers people got from "Do we deliver to you?" (the answer and rough distance only, no address).
export async function POST(request) {
  try {
    const { inRange, distanceKm, src } = await request.json();
    if (typeof inRange !== "boolean") return NextResponse.json({ error: "Bad request" }, { status: 400 });
    const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
    if (!(await allowHit(`area:${ip}`, 40, 10))) return NextResponse.json({ success: true });
    await logAreaCheck({ inRange, distanceKm, src });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ success: true }); // never bother the visitor with a counting problem
  }
}
