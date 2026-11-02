"use client";

import { typeName, useOrdering } from "@/components/OrderingContext";

// One line about a way of ordering right now: "Pickup open until 6:15pm" / "Delivery from Friday at 4pm".
function short(type, st) {
  if (st.open) return st.manual ? `${typeName(type)} open now` : `${typeName(type)} open until ${st.closesAt}`;
  if (st.paused) return `${typeName(type)} paused`;
  return st.next ? `${typeName(type)} from ${st.next.text}` : `${typeName(type)} closed`;
}

// The full sentence for the banner.
function long(type, st, lines) {
  const times = lines.map((l) => l.text).join(" and ") || "at set times";
  if (st.open) return st.manual ? `${typeName(type)}: open now.` : `${typeName(type)}: open now, last orders ${st.closesAt}.`;
  if (st.paused) return `${typeName(type)}: paused right now.`;
  return `${typeName(type)}: ${times}.${st.next ? ` Next: ${st.next.text}.` : ""}`;
}

// variant "chip" for the home page, "banner" for ordering pages.
export default function ServiceStatus({ variant = "banner", className = "" }) {
  const { states, anyOpen, deliveryLines, pickupLines } = useOrdering();

  if (variant === "chip") {
    return (
      <span className={`inline-flex items-center gap-2 rounded-2xl bg-pine-dark px-4 py-2 border border-canvas-light/20 font-display font-700 text-sm ${className}`}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${anyOpen ? "bg-green-400" : "bg-gold"}`} />
        <span>
          {short("pickup", states.pickup)}
          <span className="text-canvas-light/50"> · </span>
          {short("delivery", states.delivery)}
        </span>
      </span>
    );
  }
  return (
    <div role="status" className={`rounded-2xl px-4 py-3 text-sm ${anyOpen ? "bg-pine text-canvas-light" : "bg-gold text-ink"} ${className}`}>
      <p className="font-display font-700">{long("pickup", states.pickup, pickupLines)}</p>
      <p className="font-display font-700 mt-1">{long("delivery", states.delivery, deliveryLines)}</p>
      {!anyOpen && <p className="mt-2">You can look at the menu now. Ordering opens when pickup or delivery does.</p>}
    </div>
  );
}
