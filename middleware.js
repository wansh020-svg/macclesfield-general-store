import { NextResponse } from "next/server";

export function middleware(request) {
  const auth = request.cookies.get("staff_auth");
  if (!auth || auth.value !== "true") {
    return NextResponse.redirect(new URL("/dashboard/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/dashboard",
};
