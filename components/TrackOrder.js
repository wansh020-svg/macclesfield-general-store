"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { money } from "@/lib/format";
import { SHOP } from "@/lib/site";

const DELIVERY_STEPS = [
  { key: "new", title: "Order received", sub: "We'll call to confirm." },
  { key: "accepted", title: "Being made", sub: "The kitchen has your order." },
  { key: "ready", title: "Ready", sub: "Waiting for a driver." },
  { key: "out_for_delivery", title: "On the way", sub: "Your driver is heading to you." },
  { key: "delivered", title: "Delivered", sub: "Enjoy! Pay cash to the driver." },
];

const pickupSteps = (eta) => [
  { key: "new", title: "Order received", sub: "We'll start on it shortly." },
  { key: "accepted", title: "Being made", sub: eta ? `Ready in about ${eta} minutes.` : "The kitchen has your order." },
  { key: "ready", title: "Ready to collect", sub: `Come on in to ${SHOP.name}, ${SHOP.street}. Pay at the counter.` },
  { key: "collected", title: "Collected", sub: "Enjoy!" },
];

export default function TrackOrder({ token }) {
  const [order, setOrder] = useState(null);
  const [state, setState] = useState("loading"); // loading | ok | missing | error

  useEffect(() => {
    let alive = true;
    let timer;
    async function load() {
      try {
        const res = await fetch(`/api/track/${token}`, { cache: "no-store" });
        if (!alive) return;
        if (res.status === 404) return setState("missing");
        if (!res.ok) throw new Error();
        setOrder(await res.json());
        setState("ok");
      } catch {
        if (alive) setState((s) => (s === "ok" ? s : "error"));
      }
      if (alive) timer = setTimeout(load, document.hidden ? 30000 : 10000);
    }
    load();
    return () => { alive = false; clearTimeout(timer); };
  }, [token]);

  if (state === "loading") return <main className="max-w-md mx-auto px-5 py-24 text-center text-ink/60">Loading your order...</main>;
  if (state === "missing" || state === "error") {
    return (
      <main className="max-w-md mx-auto px-5 py-20 text-center">
        <h1 className="font-display font-900 text-3xl">{state === "missing" ? "We can't find that order" : "Can't load your order"}</h1>
        <p className="mt-3 text-ink/70">{state === "missing" ? "Check the link, or call the store on (08) 8188 5301." : "Check your connection. This page keeps trying."}</p>
        <Link href="/order" className="inline-block mt-8 rounded-full bg-pine text-canvas-light font-display font-900 px-8 py-3">Back to the menu</Link>
      </main>
    );
  }

  const pickup = order.type === "pickup";
  const steps = pickup ? pickupSteps(order.etaMinutes) : DELIVERY_STEPS;
  const doneStatus = pickup ? "collected" : "delivered";
  const status = order.status === "fulfilled" ? "delivered" : order.status;
  const cancelled = status === "cancelled";
  const current = Math.max(0, steps.findIndex((s) => s.key === status));
  const finished = status === doneStatus;

  return (
    <main className="max-w-md mx-auto px-5 pt-10 pb-24">
      <p className="font-mono text-xs uppercase tracking-widest text-ink/50">{pickup ? "Pickup" : "Delivery"} order #{order.id}</p>
      {!pickup && order.run && !cancelled && !finished && (
        <p className="mt-3 rounded-2xl bg-gold/40 px-4 py-2 text-sm font-display font-700">
          Delivery run: leaves {order.run.delay ? order.run.departs : order.run.label}{order.run.delay ? ` (delayed ${order.run.delay} min)` : ""}. Arrives about {order.run.arrives}.
        </p>
      )}
      <h1 className="font-display font-900 text-4xl leading-none mt-2">
        {cancelled ? "Order cancelled" : steps[current].title}
      </h1>
      {cancelled ? (
        <p className="mt-3 text-ink/70">Sorry, this order was cancelled. Please call the store on <a href="tel:0881885301" className="underline">(08) 8188 5301</a>.</p>
      ) : (
        <>
          <p className="mt-3 text-ink/70">
            {status === "out_for_delivery" && order.driver ? `${order.driver} is on the way with your order.` : steps[current].sub}
          </p>
          <ol className="mt-8 space-y-4">
            {steps.map((s, i) => {
              const done = i <= current;
              return (
                <li key={s.key} className="flex items-center gap-4">
                  <span className={`w-9 h-9 rounded-full grid place-items-center font-display font-900 shrink-0 ${done ? "bg-pine text-canvas-light" : "bg-ink/10 text-ink/40"} ${i === current && !finished ? "ring-4 ring-gold" : ""}`}>
                    {done ? "\u2713" : i + 1}
                  </span>
                  <span className={done ? "font-display font-700 text-lg" : "text-ink/45 text-lg"}>{s.title}</span>
                </li>
              );
            })}
          </ol>
        </>
      )}
      <div className="mt-10 rounded-3xl bg-gold px-5 py-4 flex items-center justify-between">
        <span className="font-display font-700">{pickup ? "Pay at the counter" : "Pay cash on delivery"}</span>
        <span className="font-display font-900 text-3xl">{money(order.total)}</span>
      </div>
      <p className="mt-6 text-sm text-ink/60">Questions? Call <a href="tel:0881885301" className="underline">(08) 8188 5301</a>. This page updates by itself.</p>
    </main>
  );
}
