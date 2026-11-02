import { NextResponse } from "next/server";
import { currentDriver } from "@/lib/auth";
import { startRun } from "@/lib/db";

export const dynamic = "force-dynamic";

// "Start run": take every ready order in today's run in one go.
export async function POST(request) {
  const driver = await currentDriver();
  if (!driver) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { runTime } = await request.json();
    return NextResponse.json({ success: true, taken: await startRun(driver.id, runTime) });
  } catch (err) {
    if (/^Expected/.test(err.message)) return NextResponse.json({ error: "Nothing in that run is ready yet." }, { status: 409 });
    console.error(err);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
