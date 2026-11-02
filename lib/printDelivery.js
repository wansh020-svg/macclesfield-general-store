import { getDelivery } from "@/lib/db";
import { DEFAULT_PICKUP, DEFAULT_SCHEDULE } from "@/lib/hours";
import { getPickup } from "@/lib/db";

// Current delivery settings for the print pages (default times if the database is unreachable).
export async function printDelivery() {
  try {
    return await getDelivery();
  } catch {
    return { mode: "schedule", schedule: DEFAULT_SCHEDULE, radiusKm: 5, feeBase: 8, farKm: null, feeFar: null, minOrder: 0, freeOver: null };
  }
}

export async function printPickup() {
  try {
    return await getPickup();
  } catch {
    return DEFAULT_PICKUP;
  }
}
