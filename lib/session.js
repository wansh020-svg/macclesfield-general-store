// Signed staff session cookie. Works in both the Edge middleware and Node routes
// (uses Web Crypto only). The cookie is "<expiry-ms>.<hmac>"; the HMAC key comes
// from ORDERS_PASSWORD, so changing the password logs everybody out.

export const SESSION_COOKIE = "staff_session";
export const SESSION_SECONDS = 60 * 60 * 8; // 8 hours

const enc = new TextEncoder();

function configuredPassword() {
  return (process.env.ORDERS_PASSWORD || "").trim();
}

export function authConfigured() {
  return configuredPassword().length > 0;
}

function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacHex(message) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode("staff-session:" + configuredPassword()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return toHex(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function passwordMatches(input) {
  if (!authConfigured() || typeof input !== "string") return false;
  // Hash both sides first so the comparison is constant-time and length-blind.
  const [a, b] = await Promise.all([hmacHex("pw:" + input.trim()), hmacHex("pw:" + configuredPassword())]);
  return safeEqual(a, b);
}

export async function createSessionToken() {
  const expires = String(Date.now() + SESSION_SECONDS * 1000);
  return `${expires}.${await hmacHex(expires)}`;
}

export async function isValidSession(token) {
  if (!token || !authConfigured()) return false;
  const [expires, sig] = String(token).split(".");
  if (!expires || !sig || !/^\d+$/.test(expires) || Number(expires) < Date.now()) return false;
  return safeEqual(sig, await hmacHex(expires));
}
