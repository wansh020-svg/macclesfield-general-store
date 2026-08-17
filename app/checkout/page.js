"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartContext";

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.name || !form.phone || !form.address) {
      setError("Please fill in your name, phone, and address.");
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
          notes: form.notes,
          items: items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
          estimatedTotal: total,
        }),
      });

      if (!res.ok) throw new Error("Failed to place order");

      clearCart();
      router.push("/checkout/success");
    } catch (err) {
      setError("Something went wrong placing your order. Please call the store instead.");
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
    <section className="max-w-md mx-auto px-5 py-16">
      <span className="price-tag mb-4">Checkout</span>
      <h1 className="font-display font-900 text-3xl mt-4 mb-2">Your Details</h1>
      <p className="text-ink/60 text-sm mb-8">Cash on delivery &mdash; no payment needed online.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Full name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full border border-ink/20 bg-canvas-light px-4 py-3"
        />
        <input
          type="tel"
          placeholder="Phone number"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full border border-ink/20 bg-canvas-light px-4 py-3"
        />
        <input
          type="text"
          placeholder="Delivery address"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          className="w-full border border-ink/20 bg-canvas-light px-4 py-3"
        />
        <textarea
          placeholder="Notes (optional)"
          rows={3}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          className="w-full border border-ink/20 bg-canvas-light px-4 py-3"
        />
        {error && <p className="text-rust text-sm">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-rust text-canvas-light font-mono text-xs uppercase tracking-widest px-6 py-3 hover:bg-rust/90 transition-colors disabled:opacity-50"
        >
          {submitting ? "Placing Order..." : "Place Order (Cash on Delivery)"}
        </button>
      </form>
    </section>
  );
}
