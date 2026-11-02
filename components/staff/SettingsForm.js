"use client";

import { useState } from "react";
import RunsEditor from "@/components/staff/RunsEditor";
import PickupSettings from "@/components/staff/PickupSettings";
import { btn, input, Label } from "@/components/staff/Bits";

async function save(body) {
  const res = await fetch("/api/staff/settings", {
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
  return data;
}

export default function SettingsForm({ initial, initialPickup }) {
  const [d, setD] = useState(initial);
  const [radius, setRadius] = useState(String(initial.radiusKm));
  const [runs, setRuns] = useState(initial.runs);
  const blank = (v) => (v == null ? "" : String(v));
  const [fee, setFee] = useState({ feeBase: blank(initial.feeBase), minOrder: blank(initial.minOrder || ""), freeOver: blank(initial.freeOver), farKm: blank(initial.farKm), feeFar: blank(initial.feeFar) });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // Returns true if it saved. Anything that failed shows its message and leaves the form as it was.
  async function run(body, ok) {
    setBusy(true);
    setMsg("");
    try {
      const data = await save(body);
      setD(data.delivery);
      setRadius(String(data.delivery.radiusKm));
      setRuns(data.delivery.runs);
      setFee({ feeBase: blank(data.delivery.feeBase), minOrder: blank(data.delivery.minOrder || ""), freeOver: blank(data.delivery.freeOver), farKm: blank(data.delivery.farKm), feeFar: blank(data.delivery.feeFar) });
      setMsg(ok(data));
      return true;
    } catch (e) {
      setMsg(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  function useThisDevice() {
    if (!navigator.geolocation) return setMsg("This device can't share its location.");
    setMsg("Getting your location...");
    navigator.geolocation.getCurrentPosition(
      (pos) => run({ lat: pos.coords.latitude, lng: pos.coords.longitude }, () => "Store location saved from this device."),
      () => setMsg("Couldn't get the location. Allow location access for this site, or use the other button."),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }


  return (
    <div className="space-y-6">
      <section className="rounded-3xl border-2 border-ink/15 bg-canvas-light p-5 space-y-4">
        <h2 className="font-display font-900 text-xl">Delivery runs</h2>
        <fieldset className="space-y-2">
          <legend className="font-mono text-xs uppercase tracking-widest text-ink/60 mb-1">Online ordering is</legend>
          {[
            ["schedule", "Following the runs below"],
            ["closed", "Paused (no delivery orders, even on run days)"],
          ].map(([value, label]) => (
            <label key={value} className="flex items-start gap-3">
              <input type="radio" name="mode" className="mt-1.5 w-4 h-4" checked={d.mode === value || (value === "schedule" && d.mode === "open")} disabled={busy}
                onChange={async () => {
                  const before = d;
                  setD({ ...d, mode: value }); // move the switch straight away
                  if (!(await run({ mode: value }, () => "Saved."))) setD(before);
                }} />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        <p className="font-mono text-xs uppercase tracking-widest text-ink/60">Weekly delivery runs (Adelaide time)</p>
        <RunsEditor runs={runs} onChange={setRuns} busy={busy} onSave={() => run({ runs }, () => "Delivery runs saved. The website updates within a minute.")} />
      </section>

      <PickupSettings initial={initialPickup} />

      <section className="rounded-3xl border-2 border-ink/15 bg-canvas-light p-5 space-y-4">
        <h2 className="font-display font-900 text-xl">Delivery area</h2>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={d.enforce} disabled={busy} onChange={async (e) => {
            const before = d;
            setD({ ...d, enforce: e.target.checked });
            if (!(await run({ enforce: e.target.checked }, () => "Saved."))) setD(before);
          }} className="w-5 h-5" />
          <span>Only deliver within the radius</span>
        </label>
        <Label text="Radius (km)" hint="Straight-line distance from the store. Roads can be longer, so a little under your real limit is safer.">
          <div className="flex gap-2 mt-1">
            <input className={input} inputMode="decimal" value={radius} onChange={(e) => setRadius(e.target.value)} />
            <button disabled={busy} onClick={() => run({ radiusKm: radius }, () => "Radius saved.")} className={`${btn} bg-rust text-canvas-light shrink-0`}>Save</button>
          </div>
        </Label>
      </section>

      <section className="rounded-3xl border-2 border-ink/15 bg-canvas-light p-5 space-y-4">
        <h2 className="font-display font-900 text-xl">Delivery fee</h2>
        <p className="text-sm text-ink/70">Charged on delivery orders only. Pickup is never charged. Leave an optional box empty to switch it off.</p>
        <Label text="Delivery fee ($)" hint="0 = free delivery.">
          <input className={`${input} mt-1`} inputMode="decimal" value={fee.feeBase} onChange={(e) => setFee({ ...fee, feeBase: e.target.value })} />
        </Label>
        <Label text="Minimum food order for delivery ($, optional)" hint="Smaller orders are asked to add more or choose pickup.">
          <input className={`${input} mt-1`} inputMode="decimal" value={fee.minOrder} onChange={(e) => setFee({ ...fee, minOrder: e.target.value })} />
        </Label>
        <Label text="Free delivery over ($, optional)" hint="Food total at or above this ships free.">
          <input className={`${input} mt-1`} inputMode="decimal" value={fee.freeOver} onChange={(e) => setFee({ ...fee, freeOver: e.target.value })} />
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <Label text="Further than (km, optional)">
            <input className={`${input} mt-1`} inputMode="decimal" value={fee.farKm} onChange={(e) => setFee({ ...fee, farKm: e.target.value })} />
          </Label>
          <Label text="...charge ($)">
            <input className={`${input} mt-1`} inputMode="decimal" value={fee.feeFar} onChange={(e) => setFee({ ...fee, feeFar: e.target.value })} />
          </Label>
        </div>
        <button disabled={busy} onClick={() => run({ ...fee }, () => "Delivery fee saved.")} className={`${btn} bg-rust text-canvas-light`}>Save delivery fee</button>
      </section>

      <section className="rounded-3xl border-2 border-ink/15 bg-canvas-light p-5 space-y-4">
        <h2 className="font-display font-900 text-xl">Store location</h2>
        <p className="text-sm">
          {d.located ? "Saved location:" : "Using an approximate spot in Macclesfield. Set the exact location below:"}{" "}
          <span className="font-mono">{d.lat.toFixed(5)}, {d.lng.toFixed(5)}</span>{" "}
          <a className="underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${d.lat},${d.lng}`}>See on map</a>
        </p>
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={useThisDevice} className={`${btn} bg-pine text-canvas-light`}>Use this device&apos;s location</button>
          <button disabled={busy} onClick={() => run({ findFromAddress: true }, (data) => `Found: ${data.found}`)} className={`${btn} border border-ink/25`}>
            Find from store address
          </button>
        </div>
        <p className="text-xs text-ink/60">Best: open this page on a phone while standing in the shop and tap &ldquo;Use this device&apos;s location&rdquo;.</p>
      </section>

      {msg && <p role="status" className="rounded-2xl bg-ink/5 px-4 py-3 text-sm">{msg}</p>}
    </div>
  );
}
