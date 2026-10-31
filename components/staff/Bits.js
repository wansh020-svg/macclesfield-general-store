"use client";

import { useState } from "react";
import { uploadImage } from "@/components/staff/api";

export const input = "w-full border border-ink/20 bg-canvas-light rounded-lg px-3 py-2 text-sm";
export const btn = "rounded-full font-mono text-xs uppercase tracking-widest px-4 py-2";

export function Label({ text, children, hint }) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] uppercase tracking-widest text-ink/50">{text}</span>
      {children}
      {hint && <span className="block text-xs text-ink/50 mt-1">{hint}</span>}
    </label>
  );
}

export function ImageField({ imageId, onChange }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function pick(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setErr("");
    try {
      onChange(await uploadImage(file));
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="font-mono text-[11px] uppercase tracking-widest text-ink/50">Picture (optional)</span>
      <div className="mt-1 flex items-center gap-3">
        {imageId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/images/${imageId}`} alt="" className="w-20 h-14 object-cover rounded-lg border border-ink/10" />
        ) : (
          <span className="text-xs text-ink/50">No picture. The card shows text only.</span>
        )}
        <label className={`${btn} bg-pine text-canvas-light cursor-pointer ${busy ? "opacity-50" : ""}`}>
          {busy ? "Uploading..." : imageId ? "Change" : "Add picture"}
          <input type="file" accept="image/*" className="hidden" onChange={pick} disabled={busy} />
        </label>
        {imageId && (
          <button type="button" onClick={() => onChange(null)} className={`${btn} border border-ink/20`}>
            Remove
          </button>
        )}
      </div>
      {err && <p className="text-rust text-xs mt-1">{err}</p>}
    </div>
  );
}

export function Toggle({ on, onChange, onLabel, offLabel }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`${btn} ${on ? "bg-pine text-canvas-light" : "border border-ink/30 text-ink/60"}`}
    >
      {on ? onLabel : offLabel}
    </button>
  );
}
