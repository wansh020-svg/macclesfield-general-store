import { NextResponse } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/session";

export async function middleware(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!(await isValidSession(token))) {
    return NextResponse.redirect(new URL("/dashboard/login", request.url));
  }
  return NextResponse.next();
}

// Only the dashboard itself. /dashboard/login must stay public or it would loop.
export const config = {
  matcher: ["/dashboard", "/dashboard/menu", "/dashboard/deals", "/dashboard/drivers"],
};
