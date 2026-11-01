import { cookies } from "next/headers";
import { DRIVER_COOKIE, SESSION_COOKIE, isValidSession, readDriverToken } from "@/lib/session";
import { getDriver } from "@/lib/db";

export async function isStaff() {
  return isValidSession(cookies().get(SESSION_COOKIE)?.value);
}

// The signed-in driver ({ id, name }) or null. Checks the database every time,
// so switching a driver off in the dashboard locks them out immediately.
export async function currentDriver() {
  const id = await readDriverToken(cookies().get(DRIVER_COOKIE)?.value);
  if (!id) return null;
  const driver = await getDriver(id);
  return driver && driver.active ? { id: driver.id, name: driver.name } : null;
}
