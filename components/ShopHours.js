import { getOrderingCached } from "@/lib/db";
import { DEFAULT_PICKUP, DEFAULT_SCHEDULE, describeWindows, storeHoursLines, storeWindows } from "@/lib/hours";

// The shop's dine-in hours, pickup times and delivery times in one place. Server component:
// dine-in hours come from lib/site.js, pickup and delivery times from Dashboard > Settings.
export default async function ShopHours({ tone = "light", className = "" }) {
  let delivery = null;
  let pickup = null;
  try {
    ({ delivery, pickup } = await getOrderingCached());
  } catch {
    // database unavailable: show the default times
  }
  const deliveryLines = delivery?.mode === "closed" ? [] : describeWindows(delivery?.schedule || DEFAULT_SCHEDULE);
  const pickupLines = pickup?.mode === "closed" ? [] : describeWindows(pickup?.schedule || DEFAULT_PICKUP.schedule);
  // Pickup normally follows the dine-in hours; only list it separately if staff changed it or paused it.
  const pickupSameAsStore = pickup?.mode !== "closed" && JSON.stringify(pickup?.schedule || DEFAULT_PICKUP.schedule) === JSON.stringify(storeWindows());
  const dim = tone === "dark" ? "text-canvas-light/70" : "text-ink/60";
  const label = `font-mono uppercase text-xs tracking-widest ${dim}`;
  return (
    <div className={className}>
      <p className={`${label} mb-1`}>{pickupSameAsStore ? "Open for dine-in and pickup" : "Open for dine-in"}</p>
      {storeHoursLines().map((l) => (
        <p key={l.text}>{l.days}: {l.time}</p>
      ))}
      {!pickupSameAsStore && (
        <>
          <p className={`${label} mt-3 mb-1`}>Pickup orders</p>
          {pickup?.mode === "closed" && <p>Paused for now</p>}
          {pickupLines.map((l) => <p key={l.text}>{l.days}: {l.time}</p>)}
        </>
      )}
      <p className={`${label} mt-3 mb-1`}>Delivery</p>
      {delivery?.mode === "closed" && <p>Paused for now</p>}
      {deliveryLines.map((l) => (
        <p key={l.text}>{l.days}: {l.time}</p>
      ))}
      {!deliveryLines.length && delivery?.mode !== "closed" && <p>No deliveries scheduled</p>}
    </div>
  );
}
