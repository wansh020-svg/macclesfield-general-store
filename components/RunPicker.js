"use client";

import { useCallback, useEffect, useState } from "react";

// Today's delivery runs from the server, refreshed every 30 seconds (spots left change as others order).
export function useRuns(enabled) {
  const [data, setData] = useState(null);
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/runs", { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {
      // offline: keep what we have
    }
  }, []);
  useEffect(() => {
    if (!enabled) return;
    refresh();
    const id = setInterval(() => { if (!document.hidden) refresh(); }, 45000);
    return () => clearInterval(id);
  }, [enabled, refresh]);
  return { data, refresh, setData };
}

const WHY = { full: "Full", closed: "Closed", past: "Closed", cancelled: "Cancelled", paused: "Paused" };

// "Choose your delivery": one row per run, with spots left and when it should arrive.
export default function RunPicker({ data, value, onChange }) {
  if (!data) return <p className="text-sm text-ink/50">Loading delivery times...</p>;
  const open = data.runs.filter((r) => r.status === "open");
  return (
    <fieldset className="rounded-3xl border-2 border-ink/15 bg-canvas-light px-4 py-4">
      <legend className="px-2 font-display font-900 text-lg">Choose your delivery</legend>
      {data.runs.length === 0 || open.length === 0 ? (
        <p className="text-sm text-ink/70" role="status">
          {data.paused
            ? "Delivery is paused right now."
            : data.runs.length
              ? "No more deliveries available today."
              : "No deliveries today."}
          {data.next ? ` Next deliveries: ${data.next.day} from ${data.next.label}.` : ""} You can switch to pickup above.
        </p>
      ) : null}
      <div className="mt-2 space-y-2">
        {data.runs.map((r) => {
          const on = value === r.time;
          const live = r.status === "open";
          return (
            <button
              key={r.time} type="button" role="radio" aria-checked={on} disabled={!live}
              onClick={() => onChange(r.time)}
              className={`w-full flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 text-left min-h-[3.5rem] transition-colors ${
                on ? "border-pine bg-pine text-canvas-light" : live ? "border-ink/15 bg-canvas" : "border-ink/10 bg-canvas opacity-50"
              }`}
            >
              <span>
                <span className="block font-display font-900 leading-tight">Leaves {r.delay ? r.departs : r.label}{r.delay ? ` (delayed ${r.delay} min)` : ""}</span>
                <span className={`block text-sm ${on ? "text-canvas-light/80" : "text-ink/60"}`}>Arrives about {r.arrives}</span>
              </span>
              <span className={`shrink-0 font-mono text-xs uppercase tracking-widest ${on ? "text-canvas-light/80" : "text-ink/60"}`}>
                {live ? `${r.left} ${r.left === 1 ? "spot" : "spots"} left` : WHY[r.status] || "Closed"}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
