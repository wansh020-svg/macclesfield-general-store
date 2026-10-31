import { NextResponse } from "next/server";
import { isStaff } from "@/lib/auth";
import { saveImage } from "@/lib/db";

const MAX_BASE64 = 700_000; // the editor shrinks photos first; this is the safety net

export async function POST(request) {
  if (!(await isStaff())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let dataUrl;
  try {
    ({ dataUrl } = await request.json());
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl || "");
  if (!m) return NextResponse.json({ error: "Please upload a JPG, PNG or WebP image" }, { status: 400 });
  if (m[2].length > MAX_BASE64) return NextResponse.json({ error: "That image is too large" }, { status: 413 });
  try {
    return NextResponse.json({ id: await saveImage(m[1], m[2]) });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not save the image" }, { status: 500 });
  }
}
