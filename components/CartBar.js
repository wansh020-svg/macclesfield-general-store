"use client";

import Link from "next/link";
import { useCart } from "@/components/CartContext";
import { money } from "@/lib/format";

// Pinned just above the bottom tab bar.
export default function CartBar() {
  const { count, total } = useCart();
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-0 z-40 px-4 bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-4 animate-rise">
      <Link
        href="/cart"
        className="max-w-2xl mx-auto flex items-center justify-between rounded-full bg-rust text-canvas-light pl-4 pr-6 py-3 shadow-xl"
      >
        <span className="flex items-center gap-3">
          <span key={count} className="bg-gold text-ink rounded-full w-8 h-8 flex items-center justify-center font-display font-900 animate-pop">
            {count}
          </span>
          <span className="font-display font-700 text-lg">View cart</span>
        </span>
        <span className="font-display font-900 text-xl">{money(total)}</span>
      </Link>
    </div>
  );
}
