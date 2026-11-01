import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// PINs are stored as salted scrypt hashes, never as the PIN itself.
export const PIN_RE = /^\d{4,8}$/;

export function hashPin(pin) {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(pin, salt, 32).toString("hex")}`;
}

export function verifyPin(pin, stored) {
  const [saltHex, hashHex] = String(stored || "").split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(String(pin), Buffer.from(saltHex, "hex"), expected.length);
  return timingSafeEqual(actual, expected);
}

// Used when the driver name doesn't exist, so a wrong name takes as long as a wrong PIN.
export const DUMMY_HASH = hashPin("00000000");
