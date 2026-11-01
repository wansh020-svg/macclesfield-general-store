import { NextResponse } from "next/server";
import { currentDriver } from "@/lib/auth";
import { claimOrder, deliverOrder, failOrder, releaseOrder } from "@/lib/db";

export async function POST(request, { params }) {
  const driver = await currentDriver();
  if (!driver) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  let body = {};
  try {
    body = await request.json();
  } catch {
    // actions without a body are fine
  }

  try {
    let ok;
    switch (params.action) {
      case "claim":
        ok = await claimOrder(id, driver.id);
        if (!ok) return NextResponse.json({ error: "Someone else already took that order." }, { status: 409 });
        break;
      case "deliver": {
        const cash = Number(body.cash);
        if (!Number.isFinite(cash) || cash < 0 || cash > 10000) {
          return NextResponse.json({ error: "Enter the cash you collected (0 if none)." }, { status: 400 });
        }
        ok = await deliverOrder(id, driver.id, Math.round(cash * 100) / 100);
        break;
      }
      case "fail":
        ok = await failOrder(id, driver.id, body.reason);
        break;
      case "release":
        ok = await releaseOrder(id, driver.id);
        break;
      default:
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (!ok) return NextResponse.json({ error: "That order has changed. Refreshing." }, { status: 409 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
