"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/components/CartContext";
import { money } from "@/lib/format";
import { loadOrders, loadProfile, saveProfile } from "@/lib/local";

const field = "w-full border border-ink/20 bg-canvas-light rounded-xl px-4 py-3";

export default function ProfilePage() {
  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [saved, setSaved] = useState(false);
  const [orders, setOrders] = useState([]);
  const { addItem } = useCart();
  const router = useRouter();

  useEffect(() => {
    setForm((f) => ({ ...f, ...loadProfile() }));
    setOrders(loadOrders());
  }, []);

  function save(e) {
    e.preventDefault();
    saveProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function reorder(order) {
    for (const line of order.items) addItem(line, line.qty);
    router.push("/cart");
  }

  return (
    <div className="max-w-2xl mx-auto px-5 pt-8 pb-10">
      <h1 className="font-display font-900 text-4xl">Profile</h1>
      <p className="text-ink/60 text-sm mt-1">Saved on this phone only, so checkout fills itself in.</p>

      <form onSubmit={save} className="mt-6 space-y-3">
        <input className={field} placeholder="Full name" autoComplete="name" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className={field} type="tel" placeholder="Phone number" autoComplete="tel" value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        <input className={field} placeholder="Delivery address" autoComplete="street-address" value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <button className="w-full rounded-full bg-rust text-canvas-light font-display font-700 text-lg py-3">
          {saved ? "Saved ✓" : "Save details"}
        </button>
      </form>

      <h2 className="font-display font-900 text-2xl uppercase tracking-tight mt-10">
        Past orders <span className="text-rust">&rarr;</span>
      </h2>
      {orders.length === 0 ? (
        <p className="text-ink/60 mt-3">
          Nothing yet. <Link href="/order" className="text-rust underline">Place your first order.</Link>
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {orders.map((o) => (
            <li key={`${o.id}-${o.at}`} className="bg-canvas-light border border-ink/10 rounded-2xl p-4">
              <div className="flex justify-between gap-3 font-mono text-xs uppercase tracking-widest text-ink/60">
                <span>Order #{o.id}</span>
                <span>{new Date(o.at).toLocaleDateString("en-AU")}</span>
              </div>
              <p className="mt-2 text-sm text-ink/80">
                {o.items.map((i) => `${i.qty} × ${i.name}`).join(", ")}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono">{money(o.total)}</span>
                {o.token && (
                  <Link href={`/track/${o.token}`} className="font-mono text-xs uppercase tracking-widest underline">Track</Link>
                )}
                <button onClick={() => reorder(o)} className="rounded-full bg-pine text-canvas-light font-mono text-xs uppercase tracking-widest px-5 py-2">
                  Reorder
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <h2 className="font-display font-900 text-2xl uppercase tracking-tight mt-10">
        Help <span className="text-rust">&rarr;</span>
      </h2>
      <ul className="mt-3 divide-y divide-ink/10 border-y border-ink/10">
        <li><a href="tel:0881885301" className="block py-3">Call the store &middot; (08) 8188 5301</a></li>
        <li><Link href="/contact" className="block py-3">Hours and location</Link></li>
        <li><Link href="/store" className="block py-3">What&apos;s in the store</Link></li>
      </ul>
    </div>
  );
}
