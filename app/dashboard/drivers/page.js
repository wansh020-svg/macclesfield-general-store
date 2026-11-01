import DashNav from "@/components/staff/DashNav";
import DriversManager from "@/components/staff/DriversManager";
import { listDrivers } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DriversAdminPage() {
  const drivers = await listDrivers();
  return (
    <section className="max-w-3xl mx-auto px-5 py-10">
      <DashNav />
      <h1 className="font-display font-900 text-4xl mb-2">Drivers</h1>
      <p className="text-ink/70 max-w-xl mb-6">
        Each driver signs in at <span className="font-mono">/driver</span> with their name and PIN. Switching someone
        off signs them out straight away.
      </p>
      <DriversManager initialDrivers={drivers} />
    </section>
  );
}
