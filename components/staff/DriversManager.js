"use client";

import { useState } from "react";
import { money } from "@/lib/format";
import { btn, input } from "@/components/staff/Bits";

async function call(method, body) {
  const res = await fetch("/api/staff/drivers", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.location.href = "/dashboard/login";
    throw new Error("Your session expired.");
  }
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data.drivers;
}

export default function DriversManager({ initialDrivers }) {
  const [drivers, setDrivers] = useState(initialDrivers);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");

  async function run(fn, ok) {
    setMsg("");
    try {
      setDrivers(await fn());
      if (ok) setMsg(ok);
    } catch (e) {
      setMsg(e.message);
    }
  }

  const add = (e) => {
    e.preventDefault();
    run(async () => {
      const list = await call("POST", { name, pin });
      setName("");
      setPin("");
      return list;
    }, "Driver added. Give them their name and PIN.");
  };

  const resetPin = (d) => {
    const next = window.prompt(`New PIN for ${d.name} (4 to 8 digits):`);
    if (next !== null) run(() => call("PATCH", { id: d.id, pin: next }), `New PIN set for ${d.name}.`);
  };

  const cashTotal = drivers.reduce((n, d) => n + d.cash_today, 0);

  return (
    <div>
      <div className="rounded-3xl bg-gold px-5 py-4 flex items-center justify-between">
        <span className="font-display font-700">Cash collected today</span>
        <span className="font-display font-900 text-3xl">{money(cashTotal)}</span>
      </div>

      {msg && <p role="status" className="mt-4 rounded-2xl bg-ink/5 px-4 py-3 text-sm">{msg}</p>}

      <ul className="mt-6 space-y-3">
        {drivers.length === 0 && <li className="text-ink/60">No drivers yet. Add one below.</li>}
        {drivers.map((d) => (
          <li key={d.id} className={`rounded-3xl border-2 p-5 ${d.active ? "border-ink/15 bg-canvas-light" : "border-ink/10 opacity-60"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display font-900 text-xl">{d.name}</p>
                <p className="font-mono text-xs uppercase tracking-widest text-ink/50 mt-1">
                  {d.active ? "Active" : "Switched off"}{d.on_the_road > 0 && ` · ${d.on_the_road} on the road`}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display font-900 text-xl">{money(d.cash_today)}</p>
                <p className="text-xs text-ink/60">{d.deliveries_today} {d.deliveries_today === 1 ? "delivery" : "deliveries"} today</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={() => resetPin(d)} className={`${btn} border border-ink/25`}>Reset PIN</button>
              <button
                onClick={() => run(() => call("PATCH", { id: d.id, active: !d.active }))}
                className={`${btn} ${d.active ? "border border-rust text-rust" : "bg-pine text-canvas-light"}`}
              >
                {d.active ? "Switch off" : "Switch on"}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="mt-8 rounded-3xl border-2 border-ink/15 p-5 space-y-3">
        <h2 className="font-display font-900 text-xl">Add a driver</h2>
        <input className={input} placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={input} placeholder="PIN (4 to 8 digits)" inputMode="numeric" maxLength={8} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
        <button disabled={!name.trim() || pin.length < 4} className={`${btn} bg-rust text-canvas-light disabled:opacity-50`}>Add driver</button>
      </form>
    </div>
  );
}
