import { NextResponse } from "next/server";
import { isStaff } from "@/lib/auth";
import { getPickup, savePickup } from "@/lib/db";

export const dynamic = "force-dynamic";
const KNOWN = /^(Pickup)/;

async function guard() {
  return (await isStaff()) ? null : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return NextResponse.json({ pickup: await getPickup() });
}

export async function PATCH(request) {
  const denied = await guard();
  if (denied) return denied;
  try {
    return NextResponse.json({ pickup: await savePickup(await request.json()) });
  } catch (err) {
    const known = KNOWN.test(err.message);
    if (!known) console.error(err);
    return NextResponse.json({ error: known ? err.message : "Something went wrong" }, { status: known ? 400 : 500 });
  }
}
