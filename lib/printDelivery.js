import { getDelivery } from "@/lib/db";
import { DEFAULT_SCHEDULE } from "@/lib/hours";

// Current delivery settings for the print pages (default times if the database is unreachable).
export async function printDelivery() {
  try {
    return await getDelivery();
  } catch {
    return { mode: "schedule", schedule: DEFAULT_SCHEDULE, radiusKm: 5 };
  }
}
