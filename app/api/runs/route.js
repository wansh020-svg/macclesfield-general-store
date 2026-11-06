import { NextResponse } from "next/server";
import { getDelivery, getRunBoard } from "@/lib/db";
import { deliveryText } from "@/lib/hours";

export const dynamic = "force-dynamic";

// Public: today's delivery runs, with spots left, for the run picker at checkout.
export async function GET() {
  try {
    const [b, cfg] = await Promise.all([getRunBoard(), getDelivery()]);
    return NextResponse.json(
      { asap: b.asap, asapMinutes: cfg.asapMinutes, hours: deliveryText(cfg), date: b.date, paused: b.paused, next: b.next, runs: b.runs.map((r) => ({ time: r.time, label: r.label, status: r.status, left: r.left, departs: r.departs, arrives: r.arrives, delay: r.delay })) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not load delivery runs" }, { status: 500 });
  }
}
