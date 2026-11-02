import { NextResponse } from "next/server";
import { currentDriver } from "@/lib/auth";
import { finishRun } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  const driver = await currentDriver();
  if (!driver) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ success: true, finished: await finishRun(driver.id) });
  } catch (err) {
    if (/^Expected/.test(err.message)) return NextResponse.json({ error: "You still have orders on the road." }, { status: 409 });
    console.error(err);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
