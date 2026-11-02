"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const tabs = [
  { href: "/dashboard", label: "Orders" },
  { href: "/dashboard/menu", label: "Menu" },
  { href: "/dashboard/options", label: "Extras" },
  { href: "/dashboard/deals", label: "Deals" },
  { href: "/dashboard/drivers", label: "Drivers" },
  { href: "/dashboard/settings", label: "Settings" },
];

export default function DashNav() {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/dashboard/login");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between gap-3 mb-8 border-b border-ink/10 pb-4">
      <nav className="flex gap-2">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-full px-4 py-2 font-mono text-xs uppercase tracking-widest border ${
              path === t.href ? "bg-pine text-canvas-light border-pine" : "border-ink/20 text-ink/70"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <button onClick={logout} className="font-mono text-xs uppercase tracking-widest text-ink/50 underline">
        Log out
      </button>
    </div>
  );
}
