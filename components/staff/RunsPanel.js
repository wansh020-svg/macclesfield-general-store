"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/components/staff/api";
import { btn, input } from "@/components/staff/Bits";

const PILL = {
  open: "bg-pine text-canvas-light", full: "bg-gold text-ink", closed: "bg-ink/15 text-ink/60",
  past: "bg-ink/15 text-ink/60", cancelled: "bg-rust text-canvas-light", paused: "bg-ink/15 text-ink/60",
};
const WORD = { open: "Taking orders", full: "Full", closed: "Closed", past: "Cut off", cancelled: "Cancelled", paused: "Paused" };

// Today's delivery runs: how many orders, and the controls (delay, close, allow more, cancel, add a run).
export default function RunsPanel({ refreshKey, onRuns }) {
  const [board, setBoard] = useState(null);
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

  if (!board) return null;
  return (
    <section aria-label="Delivery runs today" className="mb-8 rounded-3xl border-2 border-ink/15 bg-canvas-light p-5">
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
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => act(r, "delay", 10)} className={`${btn} border border-ink/25`}>Delay 10 min</button>
              {r.delay > 0 && <button onClick={() => act(r, "delay", -10)} className={`${btn} border border-ink/25`}>&minus;10 min</button>}
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
