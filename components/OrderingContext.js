"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_PICKUP, DEFAULT_SCHEDULE, describeWindows, serviceState } from "@/lib/hours";
import { DEFAULT_RUNS, runsServiceState } from "@/lib/runs";

const Ctx = createContext(null);

const FALLBACK = {
  delivery: { mode: "schedule", schedule: DEFAULT_SCHEDULE, runs: { times: DEFAULT_RUNS.times.map((day) => day.map((r) => r.time)), cutoffMinutes: 30, windowMinutes: 30 }, feeBase: 8, farKm: null, feeFar: null, minOrder: 0, freeOver: null },
  pickup: { mode: "schedule", schedule: DEFAULT_PICKUP.schedule, prepMinutes: 15, lastOrderMinutes: 15 },
};

// Knows when we're delivering and when we're taking pickup orders (Adelaide time), and which of
// the two the customer has chosen. Re-checks every 30 seconds so the page flips by itself.
export function OrderingProvider({ ordering, serverNow, children }) {
  const cfg = ordering || FALLBACK;
  // Start from the server's clock so the first paint matches what the server sent, then follow the
  // phone's clock (a phone a few minutes off would otherwise cause a mismatch warning).
  const [now, setNow] = useState(() => new Date(serverNow || Date.now()));
  const [orderType, setOrderTypeState] = useState("delivery");
  const chose = useRef(false); // true once the customer has picked one in this visit

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const states = useMemo(() => ({ delivery: runsServiceState(cfg.delivery, now), pickup: serviceState(cfg.pickup, now) }), [cfg, now]);

  // On arrival, remember their last choice, but if that one is closed and the other is open, use the open one.
  useEffect(() => {
    if (chose.current) return;
    let saved = null;
    try {
      saved = localStorage.getItem("maccy-type");
    } catch {
      // storage blocked
    }
    const preferred = saved === "pickup" || saved === "delivery" ? saved : "delivery";
    const other = preferred === "delivery" ? "pickup" : "delivery";
    setOrderTypeState(!states[preferred].open && states[other].open ? other : preferred);
  }, [states]);

  const setOrderType = useCallback((type) => {
    chose.current = true;
    setOrderTypeState(type);
    try {
      localStorage.setItem("maccy-type", type);
    } catch {
      // storage blocked
    }
  }, []);

  const value = useMemo(() => ({
    orderType,
    setOrderType,
    states,
    state: states[orderType], // the chosen way of ordering
    open: states[orderType].open,
    anyOpen: states.delivery.open || states.pickup.open,
    other: orderType === "delivery" ? "pickup" : "delivery",
    deliveryLines: describeWindows(cfg.delivery.schedule),
    pickupLines: describeWindows(cfg.pickup.schedule),
    prepMinutes: cfg.pickup.prepMinutes || 15,
    cfg,
  }), [orderType, setOrderType, states, cfg]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOrdering() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useOrdering must be used within an OrderingProvider");
  return v;
}

export const typeName = (t) => (t === "pickup" ? "Pickup" : "Delivery");
