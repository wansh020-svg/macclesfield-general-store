import { NextResponse } from "next/server";
import { loginDriver } from "@/lib/db";
import { authConfigured, DRIVER_COOKIE, DRIVER_SESSION_SECONDS, createDriverToken } from "@/lib/session";

export async function POST(request) {
  if (!authConfigured()) {
    return NextResponse.json({ error: "Driver login isn't set up yet. Ask the store." }, { status: 500 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const name = String(body.name || "").trim();
  const pin = String(body.pin || "");
  if (!name || !/^\d{4,8}$/.test(pin)) {
    return NextResponse.json({ error: "Enter your name and your PIN (4 to 8 digits)." }, { status: 400 });
  }
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null;

  try {
    const result = await loginDriver(name, pin, ip);
    if (result.error) return NextResponse.json({ error: result.error }, { status: result.status });
    const response = NextResponse.json({ success: true, name: result.driver.name });
    response.cookies.set(DRIVER_COOKIE, await createDriverToken(result.driver.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: DRIVER_SESSION_SECONDS,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
