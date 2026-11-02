import { NextResponse } from "next/server";
import { currentDriver } from "@/lib/auth";
import { reorderStops } from "@/lib/db";

export const dynamic = "force-dynamic";

// The driver puts their stops in their own order.
export async function POST(request) {
  const driver = await currentDriver();
  if (!driver) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { ids } = await request.json();
    await reorderStops(driver.id, ids);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (/^Expected/.test(err.message)) return NextResponse.json({ error: "Your stops changed. Refreshing." }, { status: 409 });
    console.error(err);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
