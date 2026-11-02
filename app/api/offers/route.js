import { NextResponse } from "next/server";
import { getOffers } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public: the "add something to your order?" suggestions shown at checkout.
export async function GET() {
  try {
    return NextResponse.json({ offers: await getOffers() });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ offers: [] });
  }
}
