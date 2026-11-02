"use client";

import { typeName, useOrdering } from "@/components/OrderingContext";

// Delivery | Pickup, with each one's status underneath so the customer can see which is open.
export default function OrderTypeSwitch({ className = "" }) {
  const { orderType, setOrderType, states } = useOrdering();
  return (
    <div role="radiogroup" aria-label="How would you like it?" className={`grid grid-cols-2 gap-2 ${className}`}>
      {["pickup", "delivery"].map((type) => {
        const st = states[type];
        const on = orderType === type;
        return (
          <button
            key={type}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setOrderType(type)}
            className={`rounded-2xl border-2 px-4 py-3 text-left transition-colors ${on ? "bg-pine text-canvas-light border-pine" : "bg-canvas-light border-ink/15 text-ink"}`}
          >
            <span className="block font-display font-900 text-lg leading-tight">{typeName(type)}</span>
            <span className={`block text-xs mt-0.5 ${on ? "text-canvas-light/80" : "text-ink/60"}`}>
              {st.open ? (st.manual ? "Open now" : `Open until ${st.closesAt}`) : st.paused ? "Paused" : st.next ? `From ${st.next.text}` : "Closed"}
            </span>
          </button>
        );
      })}
    </div>
  );
}
