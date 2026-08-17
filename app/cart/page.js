"use client";

import Link from "next/link";
import { useCart } from "@/components/CartContext";

export default function CartPage() {
  const { items, updateQty, removeItem, total } = useCart();

  if (items.length === 0) {
    return (
      <section className="max-w-2xl mx-auto px-5 py-24 text-center">
        <span className="price-tag mb-4">Your Cart</span>
        <h1 className="font-display font-900 text-3xl mt-4 mb-4">Nothing in your cart yet</h1>
        <p className="text-ink/60 mb-6">Browse the menu and add a few things to get started.</p>
        <Link
          href="/menu"
          className="inline-block bg-rust text-canvas-light font-mono text-xs uppercase tracking-widest px-6 py-3 hover:bg-rust/90 transition-colors"
        >
          Go to Menu
        </Link>
      </section>
    );
  }

  return (
    <section className="max-w-2xl mx-auto px-5 py-16">
      <span className="price-tag mb-4">Your Cart</span>
      <h1 className="font-display font-900 text-3xl mt-4 mb-8">Your Order</h1>

      <ul className="divide-y divide-ink/10 border-t border-b border-ink/10 mb-8">
        {items.map((item) => (
          <li key={item.name} className="flex items-center justify-between gap-4 py-4">
            <div>
              <p>{item.name}</p>
              <p className="font-mono text-sm text-ink/60">${item.price.toFixed(2)} each</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateQty(item.name, item.qty - 1)}
                className="w-7 h-7 border border-ink/20"
                aria-label={`Decrease ${item.name}`}
              >
                &minus;
              </button>
              <span className="font-mono w-6 text-center">{item.qty}</span>
              <button
                onClick={() => updateQty(item.name, item.qty + 1)}
                className="w-7 h-7 border border-ink/20"
                aria-label={`Increase ${item.name}`}
              >
                +
              </button>
              <button
                onClick={() => removeItem(item.name)}
                className="text-rust text-xs font-mono ml-2 hover:underline"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between mb-2">
        <span className="font-mono uppercase text-xs tracking-widest text-ink/50">Estimated Total</span>
        <span className="font-display text-2xl">${total.toFixed(2)}</span>
      </div>
      <p className="text-ink/50 text-sm mb-8">
        Final total confirmed by the store &mdash; payment is cash on delivery.
      </p>

      <Link
        href="/checkout"
        className="inline-block bg-rust text-canvas-light font-mono text-xs uppercase tracking-widest px-6 py-3 hover:bg-rust/90 transition-colors"
      >
        Continue to Checkout
      </Link>
    </section>
  );
}
