import { NextResponse } from "next/server";
import { currentDriver } from "@/lib/auth";
import { allowHit, raiseDriverAlert } from "@/lib/db";
import { textStaff } from "@/lib/sms";

export const dynamic = "force-dynamic";

// "Need help": the driver sends their location (if the phone gives it) and the store's screen sounds an alarm.
export async function POST(request) {
  const driver = await currentDriver();
  if (!driver) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body = {};
  try {
    body = await request.json();
  } catch {
    // no location is fine: the alert still goes out
  }
  try {
    const { id, fresh } = await raiseDriverAlert(driver.id, body);
    // The alert itself is never limited. A text goes out for the first press of an emergency (with a map link
    // when we have a location), and a cap on texts per driver stops a stuck button costing money.
    if (fresh && (await allowHit(`help-sms:${driver.id}`, 4, 10).catch(() => true))) {
      const where = Number.isFinite(Number(body.lat)) && Number.isFinite(Number(body.lng)) && body.lat !== null && body.lng !== null
        ? ` Location: https://maps.google.com/?q=${Number(body.lat).toFixed(5)},${Number(body.lng).toFixed(5)}` : " No location available.";
      await textStaff(`DRIVER NEEDS HELP: ${driver.name}.${where} Phone them now.`);
    }
    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Couldn't send the alert. Phone the store now." }, { status: 500 });
  }
}
