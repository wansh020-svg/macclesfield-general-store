import DashNav from "@/components/staff/DashNav";
import MenuEditor from "@/components/staff/MenuEditor";
import { staffList } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function MenuAdminPage() {
  const [divisions, items] = await Promise.all([staffList("divisions"), staffList("items")]);
  return (
    <section className="max-w-3xl mx-auto px-5 py-10">
      <DashNav />
      <h1 className="font-display font-900 text-3xl mb-4">Menu</h1>
      <MenuEditor initialDivisions={divisions} initialItems={items} />
    </section>
  );
}
