import DashNav from "@/components/staff/DashNav";
import SettingsForm from "@/components/staff/SettingsForm";
import BlockedNumbers from "@/components/staff/BlockedNumbers";
import { areaCheckStats, getDelivery, getPickup } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [delivery, pickup] = await Promise.all([getDelivery(), getPickup()]);
  const checks = await areaCheckStats(7).catch(() => null);
  return (
    <section className="max-w-3xl mx-auto px-5 py-10">
      <DashNav />
      <h1 className="font-display font-900 text-4xl mb-2">Settings</h1>
      <p className="text-ink/70 max-w-xl mb-6">Pickup and delivery times, where the store is, and how far it delivers.</p>
      <SettingsForm initial={delivery} initialPickup={pickup} />
      {checks && (
        <section className="mt-6 rounded-3xl border-2 border-ink/15 bg-canvas-light p-5">
          <h2 className="font-display font-900 text-xl">&ldquo;Do we deliver to you?&rdquo; checks, last 7 days</h2>
          <p className="mt-2">
            <b>{checks.inside}</b> inside the delivery area, <b>{checks.outside}</b> outside
            {checks.avgOutsideKm !== null ? ` (on average ${checks.avgOutsideKm} km away)` : ""}.
          </p>
          <p className="text-sm text-ink/60 mt-1">Only the answer and distance are kept, never the address. If many are just outside, consider widening the radius.</p>
        </section>
      )}
      <BlockedNumbers />
    </section>
  );
}
