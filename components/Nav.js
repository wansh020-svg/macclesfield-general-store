"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartContext";

const links = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/store", label: "In the Store" },
  { href: "/order", label: "Order Online" },
  { href: "/contact", label: "Visit Us" },
];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const { count } = useCart();

  return (
    <header className="sticky top-0 z-50 bg-pine text-canvas-light border-b border-pine-dark">
      <div className="max-w-5xl mx-auto px-5 flex items-center justify-between h-16">
        <Link href="/" className="font-display font-700 text-lg tracking-tight">
          Macclesfield General Store
        </Link>

        <nav className="hidden sm:flex items-center gap-8 font-mono text-xs uppercase tracking-widest">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-rust transition-colors">
              {link.label}
            </Link>
          ))}
          <Link href="/cart" className="hover:text-rust transition-colors">
            Cart{count > 0 ? ` (${count})` : ""}
          </Link>
        </nav>

        <button
          className="sm:hidden font-mono text-xs uppercase tracking-widest"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label="Toggle menu"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <nav className="sm:hidden flex flex-col gap-4 px-5 pb-5 font-mono text-xs uppercase tracking-widest">
          {links.map((link) => (
            <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          <Link href="/cart" onClick={() => setOpen(false)}>
            Cart{count > 0 ? ` (${count})` : ""}
          </Link>
        </nav>
      )}
    </header>
  );
}
