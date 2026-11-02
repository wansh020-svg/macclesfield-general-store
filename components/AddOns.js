"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/components/CartContext";
import { money } from "@/lib/format";

// "Add something to your order?" at checkout. Each one can be added as many times as they like.
export default function AddOns() {
  const { items, addItem, updateQty } = useCart();
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    let alive = true;
    fetch("/api/offers")
      .then((r) => r.json())
      .then((d) => alive && setOffers(Array.isArray(d.offers) ? d.offers : []))
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (offers.length === 0) return null;

  return (
    <section aria-label="Add something to your order" className="mt-5 rounded-3xl bg-gold/30 border-2 border-gold px-4 py-4">
      <h2 className="font-display font-900 text-xl leading-tight">Add something to your order?</h2>
      <ul className="mt-3 space-y-2">
        {offers.map((o) => {
          // same cart key as the menu cards, so an item added here and on the menu is one line
          const key = o.size ? `i${o.itemId}:${o.size}` : `i${o.itemId}`;
          const qty = items.find((i) => i.key === key)?.qty || 0;
          const line = { itemId: o.itemId, key, name: o.lineName, size: o.size, price: o.price };
          return (
            <li key={o.id} className="flex items-center justify-between gap-3 bg-canvas-light rounded-2xl px-4 py-2 min-h-[3.5rem]">
              <span className="min-w-0">
                <span className="block font-display font-700 leading-tight">{o.label}</span>
                <span className="block font-mono text-sm text-ink/60">{money(o.price)}</span>
              </span>
              {qty > 0 ? (
                <span className="shrink-0 flex items-center rounded-full bg-pine text-canvas-light">
                  <button type="button" onClick={() => updateQty(key, qty - 1)} aria-label={`Remove one ${o.label}`} className="w-11 h-10 text-xl leading-none">&minus;</button>
                  <span key={qty} className="font-display font-900 w-6 text-center animate-pop">{qty}</span>
                  <button type="button" onClick={() => addItem(line)} aria-label={`Add one more ${o.label}`} className="w-11 h-10 text-xl leading-none">+</button>
                </span>
              ) : (
                <button type="button" onClick={() => addItem(line)} aria-label={`Add ${o.label}`} className="shrink-0 rounded-full bg-rust text-canvas-light font-display font-900 px-5 h-10 active:scale-95 transition-transform">
                  Add
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
