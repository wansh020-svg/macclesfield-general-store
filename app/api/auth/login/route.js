import { NextResponse } from "next/server";

export async function POST(request) {
  const { password } = await request.json();

  if (password && password === process.env.ORDERS_PASSWORD) {
    const response = NextResponse.json({ success: true });
    response.cookies.set("staff_auth", "true", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });
    return response;
  }

  return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
}
