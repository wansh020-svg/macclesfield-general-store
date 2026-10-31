"use client";

import Link from "next/link";
import { useCart } from "@/components/CartContext";
import { money } from "@/lib/format";

// Pinned just above the bottom tab bar.
export default function CartBar() {
  const { count, total } = useCart();
  if (count === 0) return null;
  return (
    <div className="fixed inset-x-0 z-40 px-4 bottom-[calc(4rem+env(safe-area-inset-bottom))] md:bottom-4">
      <Link
        href="/cart"
        className="max-w-2xl mx-auto flex items-center justify-between rounded-full bg-rust text-canvas-light px-6 py-4 shadow-lg"
      >
        <span className="flex items-center gap-3">
          <span className="bg-canvas-light/20 rounded-full w-7 h-7 flex items-center justify-center font-mono text-sm">
            {count}
          </span>
          <span className="font-display font-700 text-lg">View cart</span>
        </span>
        <span className="font-mono">{money(total)}</span>
      </Link>
    </div>
  );
}
