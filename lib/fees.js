// Delivery fee rules, shared by the server (which decides the real price) and the checkout (which previews it).
//
// Settings (Dashboard > Settings > Delivery fee):
//   feeBase    the delivery fee, in dollars
//   farKm      optional: addresses further than this many km pay feeFar instead
//   feeFar     the higher fee for far addresses
//   minOrder   delivery orders need at least this much food in the cart (0 = no minimum)
//   freeOver   optional: a food total at or above this gets free delivery

export const round2 = (n) => Math.round(Number(n) * 100) / 100;

// subtotal = the food, distanceKm = from the store (null if the address wasn't checked)
export function deliveryFee(cfg, subtotal, distanceKm) {
  const base = Number(cfg?.feeBase ?? 0);
  if (cfg?.freeOver != null && subtotal >= Number(cfg.freeOver)) return 0;
  if (cfg?.farKm != null && cfg?.feeFar != null && distanceKm != null && distanceKm > Number(cfg.farKm)) return round2(cfg.feeFar);
  return round2(base);
}

// Why a delivery order can't go ahead on price alone, or null if it can.
export function minOrderProblem(cfg, subtotal) {
  const min = Number(cfg?.minOrder || 0);
  return min > 0 && subtotal < min ? { min, short: round2(min - subtotal) } : null;
}

// "$8" / "from $8" / "$8, free over $60" for printing and short messages
export function feeText(cfg) {
  const money = (n) => (Number.isInteger(Number(n)) ? `$${Number(n)}` : `$${Number(n).toFixed(2)}`);
  const hasFar = cfg?.farKm != null && cfg?.feeFar != null && Number(cfg.feeFar) !== Number(cfg.feeBase);
  const base = Number(cfg?.feeBase ?? 0) === 0 ? "free" : `${hasFar ? "from " : ""}${money(cfg.feeBase)}`;
  return cfg?.freeOver != null && Number(cfg.feeBase) > 0 ? `${base}, free over ${money(cfg.freeOver)}` : base;
}
