"use client";

import { useEffect, useState } from "react";
import { storeState } from "@/lib/hours";

// Is the shop open for dine-in right now? (Hours live in lib/site.js; Adelaide time.)
function status() {
  const s = storeState();
  if (s.open) return { open: true, text: `Open now \u00b7 until ${s.closesAt}` };
  return { open: false, text: s.next ? `Closed \u00b7 opens ${s.next.text}` : "Closed" };
}

export default function OpenStatus() {
  const [s, setS] = useState(null);
  useEffect(() => {
    setS(status());
    const t = setInterval(() => setS(status()), 60_000);
    return () => clearInterval(t);
  }, []);
  if (!s) return <span className="block h-6" />; // reserve the space so the page doesn't jump
  return (
    <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest">
      <span className={`w-2 h-2 rounded-full ${s.open ? "bg-green-400" : "bg-red-400"}`} />
      {s.text}
    </span>
  );
}
