import OrderMenu from "@/components/OrderMenu";
import CartBar from "@/components/CartBar";
import ServiceStatus from "@/components/ServiceStatus";
import { getMenu } from "@/lib/db";
import { fallbackMenu } from "@/lib/seed";

export const metadata = { title: "Order | Macclesfield General Store" };
export const dynamic = "force-dynamic"; // staff edits show up straight away

async function loadMenu() {
  try {
    return { divisions: await getMenu(), live: true };
  } catch (err) {
    console.error("Menu database unavailable, showing the built-in menu:", err.message);
    return { divisions: fallbackMenu(), live: false };
  }
}

export default async function OrderPage() {
  const { divisions, live } = await loadMenu();
  return (
    <div className="pb-32">
      <div className="bg-pine-dark text-canvas-light px-5 pt-8 pb-7">
        <div className="max-w-5xl mx-auto">
          <span className="inline-block rounded-full bg-gold text-ink px-3 py-1 font-mono text-[11px] uppercase tracking-widest">
            Pickup or delivery
          </span>
          <h1 className="font-display font-900 text-5xl leading-none mt-4">What are you having?</h1>
          <p className="text-canvas-light/70 mt-3">Swipe each shelf, tap + to add. Pay cash on delivery, or at the counter for pickup.</p>
          <ServiceStatus className="mt-4" />
          {!live && (
            <p className="mt-4 text-sm rounded-xl bg-rust px-4 py-3">
              Online ordering is having trouble right now. Please call the store on (08) 8188 5301.
            </p>
          )}
        </div>
      </div>
      <OrderMenu divisions={divisions} />
      <CartBar />
    </div>
  );
}
