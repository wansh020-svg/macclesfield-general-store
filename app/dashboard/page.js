import { getOrders } from "@/lib/db";
import OrdersBoard from "@/components/staff/OrdersBoard";
import DashNav from "@/components/staff/DashNav";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const orders = await getOrders();

  return (
    <section className="max-w-3xl mx-auto px-5 py-10">
      <DashNav />
      <h1 className="font-display font-900 text-4xl mb-6">Orders</h1>
      <OrdersBoard initialOrders={orders} />
    </section>
  );
}
