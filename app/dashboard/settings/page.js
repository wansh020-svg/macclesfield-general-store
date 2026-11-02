import DashNav from "@/components/staff/DashNav";
import SettingsForm from "@/components/staff/SettingsForm";
import { getDelivery, getPickup } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [delivery, pickup] = await Promise.all([getDelivery(), getPickup()]);
  return (
    <section className="max-w-3xl mx-auto px-5 py-10">
      <DashNav />
      <h1 className="font-display font-900 text-4xl mb-2">Settings</h1>
      <p className="text-ink/70 max-w-xl mb-6">Pickup and delivery times, where the store is, and how far it delivers.</p>
      <SettingsForm initial={delivery} initialPickup={pickup} />
    </section>
  );
}
