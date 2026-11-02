import { NextResponse } from "next/server";
import { isStaff } from "@/lib/auth";
import { staffCreate, staffDelete, staffKinds, staffList, staffUpdate } from "@/lib/db";

export const dynamic = "force-dynamic";

async function guard(kind) {
  if (!(await isStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!staffKinds().includes(kind)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return null;
}

async function body(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function fail(err) {
  // Validation errors from lib/db.js are written for humans; anything else is a server fault.
  const known = /^(Missing|Nothing|Expected|Price|Sizes|Every|Options|Not found|.* can't be empty)/.test(err.message);
  if (!known) console.error(err);
  return NextResponse.json({ error: known ? err.message : "Something went wrong" }, { status: known ? 400 : 500 });
}

export async function GET(_req, { params }) {
  const denied = await guard(params.kind);
  if (denied) return denied;
  try {
    return NextResponse.json({ rows: await staffList(params.kind) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(request, { params }) {
  const denied = await guard(params.kind);
  if (denied) return denied;
  try {
    return NextResponse.json({ row: await staffCreate(params.kind, await body(request)) });
  } catch (e) {
    return fail(e);
  }
}

export async function PATCH(request, { params }) {
  const denied = await guard(params.kind);
  if (denied) return denied;
  try {
    const { id, ...data } = await body(request);
    if (!Number.isInteger(Number(id))) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    return NextResponse.json({ row: await staffUpdate(params.kind, Number(id), data) });
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(request, { params }) {
  const denied = await guard(params.kind);
  if (denied) return denied;
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  try {
    await staffDelete(params.kind, id);
    return NextResponse.json({ success: true });
  } catch (e) {
    return fail(e);
  }
}
