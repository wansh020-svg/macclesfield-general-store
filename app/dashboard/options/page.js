import DashNav from "@/components/staff/DashNav";
import OptionsEditor from "@/components/staff/OptionsEditor";
import { staffList } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function OptionsAdminPage() {
  const [groups, items] = await Promise.all([staffList("option_groups"), staffList("items")]);
  return (
    <section className="max-w-3xl mx-auto px-5 py-10">
      <DashNav />
      <h1 className="font-display font-900 text-3xl mb-4">Extras</h1>
      <OptionsEditor initialGroups={groups} items={items.map((i) => ({ id: i.id, name: i.name, category: i.category }))} />
    </section>
  );
}
