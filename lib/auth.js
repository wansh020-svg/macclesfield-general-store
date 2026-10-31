import { cookies } from "next/headers";
import { SESSION_COOKIE, isValidSession } from "@/lib/session";

export async function isStaff() {
  return isValidSession(cookies().get(SESSION_COOKIE)?.value);
}
