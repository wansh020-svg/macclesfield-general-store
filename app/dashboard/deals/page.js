import DashNav from "@/components/staff/DashNav";
import DealsEditor from "@/components/staff/DealsEditor";
import { staffList } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DealsAdminPage() {
  const deals = await staffList("deals");
  return (
    <section className="max-w-3xl mx-auto px-5 py-10">
      <DashNav />
      <h1 className="font-display font-900 text-3xl mb-4">Deals</h1>
      <DealsEditor initialDeals={deals} />
    </section>
  );
}
