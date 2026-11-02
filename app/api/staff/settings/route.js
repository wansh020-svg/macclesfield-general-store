import { NextResponse } from "next/server";
import { isStaff } from "@/lib/auth";
import { findAddress, getDelivery, saveDelivery } from "@/lib/db";

export const dynamic = "force-dynamic";
const STORE_ADDRESS = "32 Venables St, Macclesfield SA 5153";
const KNOWN = /^(Radius|That location|Delivery|Pickup)/;

async function guard() {
  return (await isStaff()) ? null : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  return NextResponse.json({ delivery: await getDelivery() });
}

export async function PATCH(request) {
  const denied = await guard();
  if (denied) return denied;
  try {
    const body = await request.json();
    if (body.findFromAddress) {
      // Look the shop's own address up and use the first match as the centre point.
      const { results } = await findAddress(STORE_ADDRESS);
      if (!results.length) return NextResponse.json({ error: "Couldn't find the store's address. Use this device's location instead." }, { status: 404 });
      return NextResponse.json({ delivery: await saveDelivery({ ...body, lat: results[0].lat, lng: results[0].lng }), found: results[0].label });
    }
    return NextResponse.json({ delivery: await saveDelivery(body) });
  } catch (err) {
    const known = KNOWN.test(err.message);
    if (!known) console.error(err);
    return NextResponse.json({ error: known ? err.message : "Something went wrong" }, { status: known ? 400 : 500 });
  }
}
