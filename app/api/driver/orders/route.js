import { NextResponse } from "next/server";
import { currentDriver } from "@/lib/auth";
import { driverBoard } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const driver = await currentDriver();
  if (!driver) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ driver, ...(await driverBoard(driver.id)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load orders" }, { status: 500 });
  }
}
