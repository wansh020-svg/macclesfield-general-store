"use client";

import { useEffect, useState } from "react";

// Same hours as the footer: Mon-Fri 6:30-18:30, Sat-Sun 7:30-18:00 (Adelaide time).
const WEEKDAY = { open: 6 * 60 + 30, close: 18 * 60 + 30 };
const WEEKEND = { open: 7 * 60 + 30, close: 18 * 60 };

function clockText(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, "0")}` : ""}${h >= 12 ? "pm" : "am"}`;
}

function status() {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Adelaide", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const mins = (Number(get("hour")) % 24) * 60 + Number(get("minute"));
  const h = ["Sat", "Sun"].includes(get("weekday")) ? WEEKEND : WEEKDAY;
  if (mins >= h.open && mins < h.close) return { open: true, text: `Open now · until ${clockText(h.close)}` };
  return { open: false, text: mins < h.open ? `Closed · opens ${clockText(h.open)}` : "Closed for today" };
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
