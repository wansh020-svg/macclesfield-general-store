import { getOrders } from "@/lib/db";
import OrdersList from "@/components/OrdersList";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const orders = await getOrders();

  return (
    <section className="max-w-3xl mx-auto px-5 py-16">
      <span className="price-tag mb-4">Staff Only</span>
      <h1 className="font-display font-900 text-3xl mt-4 mb-8">Incoming Orders</h1>
      <OrdersList initialOrders={orders} />
    </section>
  );
}
