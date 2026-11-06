"use client";

import { useState } from "react";
import { describeWindows } from "@/lib/hours";
import ScheduleEditor from "@/components/staff/ScheduleEditor";
import { btn, input, Label } from "@/components/staff/Bits";

async function save(body) {
  const res = await fetch("/api/staff/pickup", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.location.href = "/dashboard/login";
    throw new Error("Your session expired.");
  }
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data.pickup;
}

export default function PickupSettings({ initial }) {
  const [p, setP] = useState(initial);
  const [schedule, setSchedule] = useState(initial.schedule);
  const [prep, setPrep] = useState(String(initial.prepMinutes));
  const [last, setLast] = useState(String(initial.lastOrderMinutes));
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // Returns true if it saved. A failure shows its message and leaves the form as it was.
  async function run(body, ok) {
    setBusy(true);
    setMsg("");
    try {
      const next = await save(body);
      setP(next);
      setSchedule(next.schedule);
      setPrep(String(next.prepMinutes));
      setLast(String(next.lastOrderMinutes));
      setMsg(ok);
      return true;
    } catch (e) {
      setMsg(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const summary = describeWindows(schedule).map((l) => l.text).join(" and ") || "no pickup";

  return (
    <section className="rounded-3xl border-2 border-ink/15 bg-canvas-light p-5 space-y-4">
      <h2 className="font-display font-900 text-xl">Pickup times</h2>
      <p className="text-sm text-ink/70">Customers collect from the counter and pay there by card or cash. By default pickup follows the shop&apos;s opening hours.</p>

      <fieldset className="space-y-2">
        <legend className="font-mono text-xs uppercase tracking-widest text-ink/60 mb-1">Pickup ordering is</legend>
        {[
          ["schedule", "Following the weekly times below"],
          ["open", "Open now (ignores the times, until you switch it back)"],
          ["closed", "Paused (no pickup orders)"],
        ].map(([value, label]) => (
          <label key={value} className="flex items-start gap-3">
            <input type="radio" name="pickup-mode" className="mt-1.5 w-4 h-4" checked={p.mode === value} disabled={busy}
              onChange={async () => {
                const before = p;
                setP({ ...p, mode: value }); // move the switch straight away
                if (!(await run({ mode: value }, "Saved."))) setP(before);
              }} />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>

      <div className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-widest text-ink/60">Weekly pickup times (Adelaide time)</p>
        <ScheduleEditor schedule={schedule} onChange={setSchedule} prefix="Pickup" defaults={{ open: "06:30", close: "18:30" }} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Label text="Usual prep time (minutes)" hint="Shown to customers: ready in about this long.">
          <input className={input} inputMode="numeric" value={prep} onChange={(e) => setPrep(e.target.value)} />
        </Label>
        <Label text="Last orders (minutes before closing)" hint="Stops pickup orders this long before the shop closes.">
          <input className={input} inputMode="numeric" value={last} onChange={(e) => setLast(e.target.value)} />
        </Label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button disabled={busy} onClick={() => run({ schedule, prepMinutes: prep, lastOrderMinutes: last }, "Pickup settings saved. The website updates within a minute.")}
          className={`${btn} bg-rust text-canvas-light`}>Save pickup settings</button>
        <span className="text-sm text-ink/60">Customers will see: {summary}</span>
      </div>
      {msg && <p role="status" className="rounded-2xl bg-ink/5 px-4 py-3 text-sm">{msg}</p>}
    </section>
  );
}
