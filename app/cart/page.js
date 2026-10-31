"use client";

import Link from "next/link";
import { useCart } from "@/components/CartContext";

export default function CartPage() {
  const { items, updateQty, removeItem, total, count } = useCart();

  if (items.length === 0) {
    return (
      <section className="max-w-2xl mx-auto px-5 py-24 text-center">
        <span className="price-tag mb-4">Your Cart</span>
        <h1 className="font-display font-900 text-3xl mt-4 mb-4">Nothing in your cart yet</h1>
        <p className="text-ink/60 mb-6">Browse the menu and add a few things to get started.</p>
        <Link
          href="/menu"
          className="inline-block rounded-full bg-rust text-canvas-light font-mono text-xs uppercase tracking-widest px-8 py-4"
        >
          Go to Menu
        </Link>
      </section>
    );
  }

  return (
    <section className="max-w-2xl mx-auto px-5 pt-10 pb-40">
      <Link href="/menu" className="font-mono text-xs uppercase tracking-widest text-ink/60">
        &larr; Back to menu
      </Link>
      <h1 className="font-display font-900 text-4xl mt-4 mb-1">Your order</h1>
      <p className="text-ink/60 text-sm mb-6">
        {count} {count === 1 ? "item" : "items"}
      </p>

      <ul className="divide-y divide-ink/10 border-t border-b border-ink/10">
        {items.map((item) => (
          <li key={item.key} className="py-4">
            <div className="flex items-start justify-between gap-4">
              <p className="font-display font-700 text-lg leading-snug">{item.name}</p>
              <p className="font-mono text-sm shrink-0">${(item.price * item.qty).toFixed(2)}</p>
            </div>
            <div className="flex items-center justify-between mt-3">
              <button
                onClick={() => removeItem(item.key)}
                className="text-rust text-xs font-mono uppercase tracking-widest"
              >
                Remove
              </button>
              <div className="flex items-center bg-pine text-canvas-light rounded-full">
                <button
                  onClick={() => updateQty(item.key, item.qty - 1)}
                  className="w-10 h-10 text-xl leading-none"
                  aria-label={`Decrease ${item.name}`}
                >
                  &minus;
                </button>
                <span className="font-mono w-6 text-center">{item.qty}</span>
                <button
                  onClick={() => updateQty(item.key, item.qty + 1)}
                  className="w-10 h-10 text-xl leading-none"
                  aria-label={`Increase ${item.name}`}
                >
                  +
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="text-ink/50 text-sm mt-6">
        Payment is cash on delivery. The final total is worked out when you place the order.
      </p>

      <div className="fixed bottom-0 inset-x-0 z-50 bg-canvas border-t border-ink/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="font-mono uppercase text-xs tracking-widest text-ink/50">Subtotal</span>
            <span className="font-display font-700 text-2xl">${total.toFixed(2)}</span>
          </div>
          <Link
            href="/checkout"
            className="block text-center rounded-full bg-rust text-canvas-light font-display font-700 text-lg py-4"
          >
            Checkout
          </Link>
        </div>
      </div>
    </section>
  );
}
