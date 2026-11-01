import { NextResponse } from "next/server";
import { isStaff } from "@/lib/auth";
import { createDriver, listDrivers, updateDriver } from "@/lib/db";

export const dynamic = "force-dynamic";

const KNOWN = /^(Give the driver|PIN must|A driver with)/;
const fail = (err) => {
  if (!KNOWN.test(err.message)) console.error(err);
  return NextResponse.json({ error: KNOWN.test(err.message) ? err.message : "Something went wrong" }, { status: KNOWN.test(err.message) ? 400 : 500 });
};

async function guard() {
  return (await isStaff()) ? null : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  try {
    return NextResponse.json({ drivers: await listDrivers() });
  } catch (err) {
    return fail(err);
  }
}

export async function POST(request) {
  const denied = await guard();
  if (denied) return denied;
  try {
    const { name, pin } = await request.json();
    await createDriver(name, pin);
    return NextResponse.json({ drivers: await listDrivers() });
  } catch (err) {
    return fail(err);
  }
}

export async function PATCH(request) {
  const denied = await guard();
  if (denied) return denied;
  try {
    const { id, active, pin } = await request.json();
    if (!Number.isInteger(Number(id))) return NextResponse.json({ error: "Bad request" }, { status: 400 });
    await updateDriver(Number(id), { active, pin });
    return NextResponse.json({ drivers: await listDrivers() });
  } catch (err) {
    return fail(err);
  }
}
