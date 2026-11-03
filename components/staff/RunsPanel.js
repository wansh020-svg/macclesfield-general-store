"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { planRoute } from "@/lib/route";
import { api } from "@/components/staff/api";
import { btn, input } from "@/components/staff/Bits";

const RunMap = dynamic(() => import("@/components/RunMap"), { ssr: false, loading: () => <div className="h-56 rounded-2xl bg-ink/10" /> });

const PILL = {
  open: "bg-pine text-canvas-light", full: "bg-gold text-ink", closed: "bg-ink/15 text-ink/60",
  past: "bg-ink/15 text-ink/60", cancelled: "bg-rust text-canvas-light", paused: "bg-ink/15 text-ink/60",
};
const WORD = { open: "Taking orders", full: "Full", closed: "Closed", past: "Cut off", cancelled: "Cancelled", paused: "Paused" };

// Today's delivery runs: how many orders, and the controls (delay, close, allow more, cancel, add a run).
export default function RunsPanel({ refreshKey, onRuns, orders = [] }) {
  const [board, setBoard] = useState(null);
  const [mapFor, setMapFor] = useState(null);
  const [msg, setMsg] = useState("");
  const [newTime, setNewTime] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/staff/runs", { cache: "no-store" });
      if (res.status === 401) { window.location.href = "/dashboard/login"; return; }
      if (res.ok) { const b = await res.json(); setBoard(b); onRuns?.(b.runs); }
    } catch {
      // the Orders screen already warns when the connection drops
    }
  }, [onRuns]);

  useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [load, refreshKey]);

  async function act(run, action, minutes) {
    setMsg("");
    try {
      const b = await api("runs", "POST", { action, date: board.date, time: run.time, minutes });
      setBoard(b);
      onRuns?.(b.runs);
    } catch (e) {
      setMsg(e.message);
    }
  }

  async function addRun(e) {
    e.preventDefault();
    if (!newTime) return;
    await act({ time: newTime }, "add");
    setNewTime("");
  }

  // the delivery orders still to go out on a run, in the shortest driving order
  const stopsFor = (r) => (board
    ? orders.filter((o) => o.order_type === "delivery" && o.run_time === r.time && o.run_date === board.date && ["new", "accepted", "ready", "out_for_delivery"].includes(o.status))
    : []);
  const routeFor = (r) => {
    const list = stopsFor(r);
    const plan = planRoute(board.store, list.map((o) => ({ id: o.id, lat: o.lat, lng: o.lng })));
    return { plan, stops: plan.order.map((id, k) => ({ ...list.find((o) => o.id === id), n: k + 1 })) };
  };

  if (!board) return null;
  return (
    <section aria-label="Delivery runs today" className="rounded-3xl border-2 border-ink/15 bg-canvas-light p-5">
      <h2 className="font-display font-900 text-2xl">Delivery runs today</h2>
      {board.runs.length === 0 && <p className="text-ink/60 mt-2">No deliveries scheduled today. You can add a one-off run below.</p>}
      <ul className="mt-3 space-y-3">
        {board.runs.map((r) => (
          <li key={r.time} className="rounded-2xl border border-ink/15 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-display font-900 text-xl">
                {r.delay ? r.departs : r.label}
                {r.delay > 0 && <span className="text-rust text-sm font-700"> (delayed {r.delay} min, was {r.label})</span>}
                {r.custom && <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-ink/50">one-off</span>}
              </p>
              <span className={`rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-widest ${PILL[r.status]}`}>{WORD[r.status]}</span>
            </div>
            <p className="text-sm text-ink/70 mt-1">{r.used} of {r.cap} orders &middot; arrives about {r.arrives}</p>
            {(r.ready + r.cooking + r.onRoad + r.delivered > 0) && (
              <p className="text-sm mt-1 flex flex-wrap items-center gap-2">
                {r.finishedAt ? <span className="rounded-full bg-ink/15 px-3 py-0.5 font-mono text-[11px] uppercase tracking-widest">Finished</span>
                  : r.onRoad > 0 ? <span className="rounded-full bg-rust text-canvas-light px-3 py-0.5 font-mono text-[11px] uppercase tracking-widest">On the road</span>
                  : r.readyToGo ? <span className="rounded-full bg-gold text-ink px-3 py-0.5 font-mono text-[11px] uppercase tracking-widest">Ready to go</span> : null}
                <span className="text-ink/70">{r.ready} ready &middot; {r.cooking} being made &middot; {r.onRoad} on the road &middot; {r.delivered} delivered</span>
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => act(r, "delay", 10)} className={`${btn} border border-ink/25`}>Delay 10 min</button>
              {r.delay > 0 && <button onClick={() => act(r, "delay", -10)} className={`${btn} border border-ink/25`}>&minus;10 min</button>}
              {stopsFor(r).length > 0 && (
                <button onClick={() => setMapFor(mapFor === r.time ? null : r.time)} className={`${btn} border border-ink/25`}>{mapFor === r.time ? "Hide map" : "Map and route"}</button>
              )}
              <button onClick={() => act(r, "more", 1)} className={`${btn} border border-ink/25`}>Allow 1 more</button>
              {r.closed ? (
                <button onClick={() => act(r, "reopen")} className={`${btn} bg-pine text-canvas-light`}>Reopen</button>
              ) : (
                <button onClick={() => act(r, "close")} className={`${btn} border border-ink/25`}>Close to new orders</button>
              )}
              {r.cancelled ? (
                <button onClick={() => act(r, "uncancel")} className={`${btn} bg-pine text-canvas-light`}>Restore run</button>
              ) : (
                <button
                  onClick={() => window.confirm(`Cancel the ${r.label} run? Its ${r.used} order${r.used === 1 ? "" : "s"} must be moved to another run or cancelled.`) && act(r, "cancel")}
                  className={`${btn} border border-rust text-rust`}
                >
                  Cancel run
                </button>
              )}
            </div>
            {mapFor === r.time && (() => {
              const { plan, stops } = routeFor(r);
              return (
                <div className="mt-3 space-y-2">
                  <RunMap store={board.store} stops={stops.map((o) => ({ n: o.n, lat: o.lat, lng: o.lng, label: o.customer_name }))} />
                  <p className="text-xs text-ink/60">Stops in the shortest order, about {plan.km} km round trip.{plan.unplaced.length ? ` ${plan.unplaced.length} address${plan.unplaced.length === 1 ? " couldn't" : "es couldn't"} be placed on the map: phone to confirm.` : ""}</p>
                  <ol className="text-sm space-y-1">
                    {stops.map((o) => <li key={o.id}><b>{o.n}.</b> #{o.id} {o.customer_name}, {o.address}</li>)}
                  </ol>
                </div>
              );
            })()}
          </li>
        ))}
      </ul>
      <form onSubmit={addRun} className="mt-4 flex flex-wrap items-center gap-2">
        <label className="text-sm text-ink/70" htmlFor="oneoff">Add a one-off run today:</label>
        <input id="oneoff" type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className={`${input} w-32`} />
        <button className={`${btn} bg-pine text-canvas-light`}>Add run</button>
      </form>
      {msg && <p role="alert" className="text-rust text-sm mt-2">{msg}</p>}
    </section>
  );
}
