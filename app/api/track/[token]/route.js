import { NextResponse } from "next/server";
import { getDelivery, trackOrder } from "@/lib/db";
import { arrivalText } from "@/lib/runs";
import { fmtTime } from "@/lib/hours";

export const dynamic = "force-dynamic";

// Public, but only for someone holding the long random token from their own order.
export async function GET(_req, { params }) {
  if (!/^[0-9a-f-]{36}$/.test(params.token)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const o = await trackOrder(params.token);
    if (!o) return NextResponse.json({ error: "Not found" }, { status: 404 });
    let run = null;
    if (o.run_time) {
      const win = (await getDelivery().catch(() => null))?.runs?.windowMinutes || 30;
      const delay = Number(o.run_delay) || 0;
      run = { date: o.run_date, label: fmtTime(o.run_time), delay, departs: fmtTime(Number(o.run_time.slice(0, 2)) * 60 + Number(o.run_time.slice(3)) + delay), arrives: arrivalText(o.run_time, delay, win) };
    }
    return NextResponse.json(
      {
        id: o.id, status: o.status, type: o.order_type || "delivery", etaMinutes: o.eta_minutes, total: o.estimated_total, created_at: o.created_at,
        accepted_at: o.accepted_at, ready_at: o.ready_at, picked_up_at: o.picked_up_at, delivered_at: o.delivered_at, collected_at: o.collected_at,
        run,
        driver: o.status === "out_for_delivery" ? String(o.driver_name || "").split(" ")[0] || null : null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load the order" }, { status: 500 });
  }
}
