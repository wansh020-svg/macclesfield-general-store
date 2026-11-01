"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const field = "w-full rounded-2xl bg-pine text-canvas-light placeholder:text-canvas-light/40 border-2 border-canvas-light/20 px-5 py-4 text-lg focus:border-gold outline-none";

export default function DriverLogin() {
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/driver/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't sign in. Try again.");
        setPin("");
        return;
      }
      router.refresh();
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-5 pt-20 pb-10">
      <span className="inline-block rounded-full bg-gold text-ink px-3 py-1 font-mono text-[11px] uppercase tracking-widest">Drivers</span>
      <h1 className="font-display font-900 text-5xl leading-none mt-4">Macclesfield General Store</h1>
      <p className="mt-3 text-canvas-light/70">Sign in with the name and PIN the store gave you.</p>
      <form onSubmit={submit} className="mt-8 space-y-4">
        <input className={field} placeholder="Your name" autoComplete="username" autoCapitalize="words" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={field} placeholder="PIN" type="password" inputMode="numeric" autoComplete="current-password" maxLength={8} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
        {error && <p role="alert" className="rounded-2xl bg-rust px-4 py-3 text-sm">{error}</p>}
        <button disabled={busy || !name.trim() || pin.length < 4} className="w-full rounded-full bg-gold text-ink font-display font-900 text-xl h-14 disabled:opacity-50 active:scale-95 transition-transform">
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
