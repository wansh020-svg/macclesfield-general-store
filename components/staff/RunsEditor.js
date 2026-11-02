"use client";

import { useState } from "react";
import { DAY_NAMES, describeWindows, toMinutes } from "@/lib/hours";
import { deriveSchedule } from "@/lib/runs";
import { btn, input } from "@/components/staff/Bits";

const hhmm = (mins) => `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
const defaultCap = (r) => (r.cap === null || r.cap === undefined ? "" : String(r.cap));

// The weekly delivery runs: when the driver leaves, and how many orders each run takes.
export default function RunsEditor({ runs, onChange, onSave, busy }) {
  const [open, setOpen] = useState(null);
  const setDay = (i, list) => onChange({ ...runs, times: runs.times.map((d, j) => (j === i ? list : d)) });
  const addRun = (i) => {
    const day = runs.times[i];
    const next = day.length ? Math.min(toMinutes(day[day.length - 1].time) + 60, 23 * 60) : 17 * 60;
    setDay(i, [...day, { time: hhmm(next), cap: null }]);
  };
  const preview = describeWindows(deriveSchedule({ ...runs, times: runs.times.map((d) => d.filter((r) => /^\d\d:\d\d$/.test(r.time))) })).map((l) => l.text).join(" and ") || "no deliveries";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="font-mono text-[11px] uppercase tracking-widest text-ink/50">Orders per run</span>
          <input className={`${input} mt-1`} inputMode="numeric" value={runs.capacity} onChange={(e) => onChange({ ...runs, capacity: e.target.value })} />
        </label>
        <label className="block">
          <span className="font-mono text-[11px] uppercase tracking-widest text-ink/50">Orders close (min before)</span>
          <input className={`${input} mt-1`} inputMode="numeric" value={runs.cutoffMinutes} onChange={(e) => onChange({ ...runs, cutoffMinutes: e.target.value })} />
        </label>
        <label className="block">
          <span className="font-mono text-[11px] uppercase tracking-widest text-ink/50">Arrival window (min)</span>
          <input className={`${input} mt-1`} inputMode="numeric" value={runs.windowMinutes} onChange={(e) => onChange({ ...runs, windowMinutes: e.target.value })} />
        </label>
      </div>
      <p className="text-xs text-ink/60">
        Each run can have its own limit; leave it blank to use the number above. On the day, staff can still allow more orders on a run from the Orders screen.
      </p>

      <div className="space-y-3">
        {DAY_NAMES.map((name, i) => (
          <div key={name} className="rounded-2xl border border-ink/10 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="font-display font-700">{name}</p>
              <button onClick={() => addRun(i)} className={`${btn} border border-ink/25`}>+ Add run</button>
            </div>
            {runs.times[i].length === 0 ? (
              <p className="text-sm text-ink/50 mt-1">No deliveries</p>
            ) : (
              <div className="mt-2 space-y-2">
                {runs.times[i].map((r, k) => (
                  <div key={k} className="flex flex-wrap items-center gap-2">
                    <input type="time" className={`${input} w-32`} value={r.time} aria-label={`${name} run ${k + 1} leaves`}
                      onChange={(e) => setDay(i, runs.times[i].map((x, j) => (j === k ? { ...x, time: e.target.value } : x)))} />
                    <input className={`${input} w-28`} inputMode="numeric" placeholder="limit" aria-label={`${name} run ${k + 1} order limit`} value={defaultCap(r)}
                      onChange={(e) => setDay(i, runs.times[i].map((x, j) => (j === k ? { ...x, cap: e.target.value === "" ? null : e.target.value } : x)))} />
                    <button onClick={() => setDay(i, runs.times[i].filter((_, j) => j !== k))} className={`${btn} border border-rust text-rust`} aria-label={`Remove ${name} run ${k + 1}`}>&times;</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button disabled={busy} onClick={onSave} className={`${btn} bg-rust text-canvas-light`}>Save runs</button>
        <span className="text-sm text-ink/60">Customers will see: {preview}</span>
      </div>
    </div>
  );
}
