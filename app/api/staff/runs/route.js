import { NextResponse } from "next/server";
import { isStaff } from "@/lib/auth";
import { getRunBoard, runAction } from "@/lib/db";

export const dynamic = "force-dynamic";

const known = (e) => /^(Expected|That run)/.test(e.message);

// Staff: today's runs with order counts, and controls (delay, close, cancel, allow more, add a run).
export async function GET() {
  if (!(await isStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await getRunBoard());
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(request) {
  if (!(await isStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    return NextResponse.json(await runAction(body));
  } catch (e) {
    if (!known(e)) console.error(e);
    return NextResponse.json({ error: known(e) ? e.message : "Something went wrong" }, { status: known(e) ? 400 : 500 });
  }
}
