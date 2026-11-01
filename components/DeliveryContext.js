"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_SCHEDULE, deliveryState, describeWindows } from "@/lib/hours";

const Ctx = createContext({ open: true, state: { open: true }, lines: [], delivery: null });

// Knows the delivery times and whether we're delivering right now (Adelaide time).
// Re-checks every 30 seconds, so the page flips to "Closed" or "Delivering now" by itself.
export function DeliveryProvider({ delivery, serverNow, children }) {
  // Start from the server's clock so the first paint matches what the server sent, then follow the
  // phone's clock (a phone that is a few minutes off would otherwise cause a mismatch warning).
  const [now, setNow] = useState(() => new Date(serverNow || Date.now()));
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  const value = useMemo(() => {
    const d = delivery || { mode: "schedule", schedule: DEFAULT_SCHEDULE };
    const state = deliveryState(d, now);
    return { open: state.open, state, lines: describeWindows(d.schedule), delivery: d };
  }, [delivery, now]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useDelivery = () => useContext(Ctx);
