"use client";

import { useState } from "react";
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

export default function SettingsForm({ initial }) {
  const [d, setD] = useState(initial);
  const [radius, setRadius] = useState(String(initial.radiusKm));
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function run(body, ok) {
    setBusy(true);
    setMsg("");
    try {
      const data = await save(body);
      setD(data.delivery);
      setRadius(String(data.delivery.radiusKm));
      setMsg(ok(data));
    } catch (e) {
      setMsg(e.message);
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
        <h2 className="font-display font-900 text-xl">Delivery area</h2>
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={d.enforce} disabled={busy} onChange={(e) => run({ enforce: e.target.checked }, () => "Saved.")} className="w-5 h-5" />
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
