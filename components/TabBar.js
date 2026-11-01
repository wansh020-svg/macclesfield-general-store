"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const icon = {
  home: "M3 11.5 12 4l9 7.5M5.5 10v9.5h13V10",
  order: "M5 8h14l-1.2 11.5H6.2L5 8Zm4 0V6.5a3 3 0 0 1 6 0V8",
  profile: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8.5c.8-3.6 3.7-5.5 7-5.5s6.2 1.9 7 5.5",
};

const tabs = [
  { href: "/", label: "Home", icon: icon.home, match: (p) => p === "/" },
  { href: "/order", label: "Order", icon: icon.order, match: (p) => p.startsWith("/order") || p.startsWith("/menu") },
  { href: "/profile", label: "Profile", icon: icon.profile, match: (p) => p.startsWith("/profile") },
];

// Pages that have their own pinned bar at the bottom, or are staff-only.
const HIDDEN = ["/cart", "/checkout", "/dashboard", "/driver", "/track", "/poster", "/flyer"];

export default function TabBar() {
  const path = usePathname() || "/";
  if (HIDDEN.some((h) => path.startsWith(h))) return null;
  return (
    <nav
      aria-label="Main"
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-canvas-light border-t border-ink/15 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-3 h-16">
        {tabs.map((t) => {
          const on = t.match(path);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`h-full flex flex-col items-center justify-center gap-0.5 ${on ? "text-ink" : "text-ink/50"}`}
              >
                <span className={`px-5 py-1 rounded-full transition-colors ${on ? "bg-gold" : ""}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={t.icon} />
                </svg>
                </span>
                <span className={`font-display text-[11px] ${on ? "font-900" : "font-700"}`}>{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
