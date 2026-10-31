"use client";

import Link from "next/link";
import { useCart } from "@/components/CartContext";

// Phones get the bottom tab bar; this top bar just carries the name and the cart.
const links = [
  { href: "/", label: "Home" },
  { href: "/order", label: "Order" },
  { href: "/profile", label: "Profile" },
  { href: "/store", label: "In the Store" },
  { href: "/contact", label: "Visit Us" },
];

export default function Nav() {
  const { count } = useCart();
  const cart = `Cart${count > 0 ? ` (${count})` : ""}`;

  return (
    <header className="sticky top-0 z-50 bg-pine text-canvas-light border-b border-pine-dark">
      <div className="max-w-5xl mx-auto px-5 flex items-center justify-between h-16">
        <Link href="/" className="font-display font-700 text-lg tracking-tight">
          Macclesfield General Store
        </Link>

        <nav className="hidden md:flex items-center gap-8 font-mono text-xs uppercase tracking-widest">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-rust transition-colors">
              {link.label}
            </Link>
          ))}
          <Link href="/cart" className="hover:text-rust transition-colors">{cart}</Link>
        </nav>

        <Link href="/cart" aria-label={cart} className="md:hidden relative p-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 8h14l-1.2 11.5H6.2L5 8Zm4 0V6.5a3 3 0 0 1 6 0V8" />
          </svg>
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-rust text-canvas-light rounded-full min-w-5 h-5 px-1 flex items-center justify-center font-mono text-[10px]">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
