import { NextResponse } from "next/server";
import { getRunBoard } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public: today's delivery runs, with spots left, for the run picker at checkout.
export async function GET() {
  try {
    const b = await getRunBoard();
    return NextResponse.json(
      { date: b.date, paused: b.paused, next: b.next, runs: b.runs.map((r) => ({ time: r.time, label: r.label, status: r.status, left: r.left, departs: r.departs, arrives: r.arrives, delay: r.delay })) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not load delivery runs" }, { status: 500 });
  }
}
