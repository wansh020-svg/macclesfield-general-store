import DashNav from "@/components/staff/DashNav";
import OptionsEditor from "@/components/staff/OptionsEditor";
import OffersEditor from "@/components/staff/OffersEditor";
import { staffList } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function OptionsAdminPage() {
  const [groups, items, offers] = await Promise.all([staffList("option_groups"), staffList("items"), staffList("offers")]);
  return (
    <section className="max-w-3xl mx-auto px-5 py-10">
      <DashNav />
      <h1 className="font-display font-900 text-3xl mb-4">Extras</h1>
      <OptionsEditor initialGroups={groups} items={items.map((i) => ({ id: i.id, name: i.name, category: i.category }))} />
      <h2 className="font-display font-900 text-2xl mt-12 mb-4">Offered at checkout</h2>
      <OffersEditor initialOffers={offers} items={items.map((i) => ({ id: i.id, name: i.name, category: i.category, price: i.price, sizes: i.sizes }))} />
    </section>
  );
}
