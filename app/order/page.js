import OrderMenu from "@/components/OrderMenu";
import CartBar from "@/components/CartBar";
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
      <div className="bg-pine-dark text-canvas-light px-5 pt-8 pb-6">
        <div className="max-w-5xl mx-auto">
          <span className="price-tag">Cash on Delivery</span>
          <h1 className="font-display font-900 text-4xl mt-4">Order</h1>
          <p className="text-canvas-light/70 text-sm mt-2">
            Pick what you like and pay cash when it arrives.
          </p>
          {!live && (
            <p className="mt-3 text-sm rounded bg-rust/40 px-3 py-2">
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
