"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AddressField from "@/components/AddressField";
import { useCart } from "@/components/CartContext";
import DeliveryStatus from "@/components/DeliveryStatus";
import { useDelivery } from "@/components/DeliveryContext";
import { money } from "@/lib/format";
import { loadProfile, rememberOrder, saveProfile } from "@/lib/local";
import { readSource } from "@/components/SourceTracker";

const field = "w-full rounded-2xl border-2 border-ink/15 bg-canvas-light px-4 py-3 text-base focus:border-pine outline-none";

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { open: delivering } = useDelivery();
  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "" });
  const [chosen, setChosen] = useState(null);
  const [unverified, setUnverified] = useState(false);
  const [saved, setSaved] = useState(""); // a returning customer's saved address, checked once
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [remember, setRemember] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const p = loadProfile();
    setForm((f) => ({ ...f, name: p.name || "", phone: p.phone || "", address: p.address || "" }));
    if ((p.address || "").trim().length >= 4) setSaved(p.address);
  }, []);

  const addressReady = Boolean(chosen) || unverified;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.name || !form.phone || !form.address) {
      setError("Please fill in your name, phone, and address.");
      return;
    }
    if (!addressReady) {
      setError("Please check your address first.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.name,
          phone: form.phone,
          address: form.address,
          addressProof: chosen?.proof,
          unverified,
          source: readSource(),
          notes: form.notes,
          items: items.map((i) => ({ itemId: i.itemId, dealId: i.dealId, size: i.size, qty: i.qty })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to place order");

      if (remember) saveProfile(form);
      rememberOrder({
        id: data.order.id, token: data.order.token, at: Date.now(), total: data.order.total,
        items: items.map((i) => ({ key: i.key, name: i.name, price: i.price, qty: i.qty, itemId: i.itemId, dealId: i.dealId, size: i.size })),
      });
      clearCart();
      router.push(`/checkout/success?id=${data.order.id}&t=${data.order.token}`);
    } catch (err) {
      setError(err.message && err.message !== "Failed to place order"
        ? err.message
        : "Something went wrong placing your order. Please call the store instead.");
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <section className="max-w-md mx-auto px-5 py-24 text-center">
        <p className="text-ink/60">Your cart is empty.</p>
      </section>
    );
  }

  return (
    <section className="max-w-md mx-auto px-5 pt-8 pb-16">
      <h1 className="font-display font-900 text-4xl leading-none">Where to?</h1>
      <p className="text-ink/60 mt-2">
        Cash on delivery: <span className="font-display font-900 text-ink">{money(total)}</span>. No card needed.
      </p>

      {!delivering && <DeliveryStatus className="mt-5" />}

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <input type="text" placeholder="Full name" autoComplete="name" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} className={field} />
        <input type="tel" placeholder="Phone number" autoComplete="tel" value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })} className={field} />

        <AddressField
          value={form.address}
          onText={(text) => { setForm((f) => ({ ...f, address: text })); setChosen(null); setUnverified(false); }}
          chosen={chosen}
          onChoose={setChosen}
          unverified={unverified}
          onUnverified={() => setUnverified(true)}
          autoCheck={saved}
        />

        <textarea placeholder="Notes: unit number, gate code, anything else (optional)" rows={3} value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })} className={field} />
        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Remember my details on this phone
        </label>
        {error && <p role="alert" className="rounded-2xl bg-rust/10 text-rust px-4 py-3 text-sm">{error}</p>}
        <button type="submit" disabled={submitting || !addressReady || !delivering}
          className="w-full rounded-full bg-rust text-canvas-light font-display font-900 text-xl h-14 disabled:opacity-50 active:scale-95 transition-transform">
          {submitting ? "Placing order..." : !delivering ? "Not delivering right now" : addressReady ? "Place order" : "Check your address to continue"}
        </button>
      </form>
    </section>
  );
}
