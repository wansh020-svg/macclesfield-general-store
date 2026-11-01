import { getDeliveryCached } from "@/lib/db";
import { DEFAULT_SCHEDULE, describeWindows, storeHoursLines } from "@/lib/hours";

// The shop's dine-in hours and its delivery times, in one place. Server component:
// dine-in hours come from lib/site.js, delivery times from Dashboard > Settings.
export default async function ShopHours({ tone = "light", className = "" }) {
  let delivery = null;
  try {
    delivery = await getDeliveryCached();
  } catch {
    // database unavailable: show the default delivery times
  }
  const deliveryLines = delivery?.mode === "closed" ? [] : describeWindows(delivery?.schedule || DEFAULT_SCHEDULE);
  const dim = tone === "dark" ? "text-canvas-light/70" : "text-ink/60";
  const label = `font-mono uppercase text-xs tracking-widest ${dim}`;
  return (
    <div className={className}>
      <p className={`${label} mb-1`}>Open for dine-in</p>
      {storeHoursLines().map((l) => (
        <p key={l.text}>{l.days}: {l.time}</p>
      ))}
      <p className={`${label} mt-3 mb-1`}>Delivery</p>
      {delivery?.mode === "closed" && <p>Paused for now</p>}
      {deliveryLines.map((l) => (
        <p key={l.text}>{l.days}: {l.time}</p>
      ))}
      {!deliveryLines.length && delivery?.mode !== "closed" && <p>No deliveries scheduled</p>}
    </div>
  );
}
