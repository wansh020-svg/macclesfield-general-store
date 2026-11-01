import { NextResponse } from "next/server";
import { trackOrder } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public, but only for someone holding the long random token from their own order.
export async function GET(_req, { params }) {
  if (!/^[0-9a-f-]{36}$/.test(params.token)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const o = await trackOrder(params.token);
    if (!o) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(
      {
        id: o.id, status: o.status, total: o.estimated_total, created_at: o.created_at,
        accepted_at: o.accepted_at, ready_at: o.ready_at, picked_up_at: o.picked_up_at, delivered_at: o.delivered_at,
        driver: o.status === "out_for_delivery" ? String(o.driver_name || "").split(" ")[0] || null : null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not load the order" }, { status: 500 });
  }
}
