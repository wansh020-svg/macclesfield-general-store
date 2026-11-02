"use client";

import { DAY_NAMES } from "@/lib/hours";
import { input } from "@/components/staff/Bits";

// A week of opening windows (Monday first). Each day is off (null) or { open, close }.
export default function ScheduleEditor({ schedule, onChange, prefix, defaults = { open: "09:00", close: "17:00" } }) {
  const setDay = (i, patch) =>
    onChange(schedule.map((w, d) => (d === i ? (patch === null ? null : { ...(w || defaults), ...patch }) : w)));
  return (
    <div className="space-y-2">
      {DAY_NAMES.map((name, i) => (
        <div key={name} className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 w-32">
            <input type="checkbox" className="w-4 h-4" checked={Boolean(schedule[i])} aria-label={`${prefix} ${name}`}
              onChange={(e) => setDay(i, e.target.checked ? {} : null)} />
            {name}
          </label>
          {schedule[i] ? (
            <span className="flex items-center gap-2">
              <input type="time" className={`${input} w-32`} value={schedule[i].open} onChange={(e) => setDay(i, { open: e.target.value })} aria-label={`${prefix} ${name} opens`} />
              <span>to</span>
              <input type="time" className={`${input} w-32`} value={schedule[i].close} onChange={(e) => setDay(i, { close: e.target.value })} aria-label={`${prefix} ${name} closes`} />
            </span>
          ) : (
            <span className="text-ink/50 text-sm">Closed</span>
          )}
        </div>
      ))}
    </div>
  );
}
