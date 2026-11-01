"use client";

import { useDelivery } from "@/components/DeliveryContext";

// Short message about delivery right now. variant "chip" for the home page, "banner" for ordering pages.
export default function DeliveryStatus({ variant = "banner", className = "" }) {
  const { state, lines } = useDelivery();
  const times = lines.map((l) => l.text).join(" and ") || "set times";

  let text;
  let tone;
  if (state.open) {
    tone = "ok";
    text = state.manual ? "We're delivering now." : `We're delivering now, until ${state.closesAt}.`;
  } else if (state.paused) {
    tone = "closed";
    text = "Online ordering is paused right now.";
  } else {
    tone = "closed";
    text = `Delivery runs ${times}.${state.next ? ` Next delivery: ${state.next.text}.` : ""}`;
  }

  if (variant === "chip") {
    return (
      <span className={`inline-flex items-center gap-2 rounded-full bg-pine-dark px-4 py-2 border border-canvas-light/20 font-display font-700 text-sm ${className}`}>
        <span className={`w-2 h-2 rounded-full shrink-0 ${tone === "ok" ? "bg-green-400" : "bg-gold"}`} />
        {text}
      </span>
    );
  }
  return (
    <p role="status" className={`rounded-2xl px-4 py-3 text-sm font-display font-700 ${tone === "ok" ? "bg-pine text-canvas-light" : "bg-gold text-ink"} ${className}`}>
      {text}
      {tone === "closed" && !state.paused && <span className="block font-body font-400 mt-1">You can look at the menu now. Ordering opens when delivery does.</span>}
    </p>
  );
}
