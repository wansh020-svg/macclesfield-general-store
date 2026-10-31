import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_SECONDS, authConfigured, createSessionToken, passwordMatches } from "@/lib/session";

export async function POST(request) {
  if (!authConfigured()) {
    // Say so plainly: this is the most common reason login "never works".
    return NextResponse.json(
      { error: "Login is not set up: the ORDERS_PASSWORD environment variable is missing. Add it in Vercel and redeploy." },
      { status: 500 }
    );
  }

  let password;
  try {
    ({ password } = await request.json());
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (!(await passwordMatches(password))) {
    await new Promise((r) => setTimeout(r, 800)); // slows down guessing
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, await createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // plain-http localhost can't store Secure cookies
    sameSite: "lax",
    maxAge: SESSION_SECONDS,
    path: "/",
  });
  return response;
}
