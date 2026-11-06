"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { readSource } from "@/components/SourceTracker";

const field = "w-full rounded-2xl border-2 border-ink/15 bg-canvas-light px-4 py-3 text-base focus:border-pine outline-none";

// "Do we deliver to you?": type an address, pick it, get a yes or no with the next delivery time.
export default function AreaChecker() {
  const [text, setText] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [radius, setRadius] = useState(5);
  const [verdict, setVerdict] = useState(null); // the result the visitor picked
  const [runs, setRuns] = useState(null);
  const timer = useRef(null);
  const abort = useRef(null);

  useEffect(() => {
    fetch("/api/runs", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).then(setRuns).catch(() => {});
    return () => { clearTimeout(timer.current); abort.current?.abort(); };
  }, []);

  async function search(q) {
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    setStatus("loading");
    try {
      const res = await fetch("/api/address", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q }), signal: ctl.signal });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setStatus("error");
      setRadius(data.radiusKm ?? 5);
      setResults(data.results || []);
      setStatus("done");
    } catch (e) {
      if (e.name !== "AbortError") setStatus("error");
    }
  }

  function type(v) {
    setText(v);
    setVerdict(null);
    clearTimeout(timer.current);
    if (v.trim().length < 4) { abort.current?.abort(); setResults([]); setStatus("idle"); return; }
    timer.current = setTimeout(() => search(v), 400);
  }

  function pick(r) {
    setText(r.label);
    setResults([]);
    setVerdict(r);
    // count the answer (no address is sent)
    fetch("/api/area-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inRange: r.inRange, distanceKm: r.distanceKm, src: readSource() }) }).catch(() => {});
  }

  const openRun = runs?.runs?.find((r) => r.status === "open");
  const when = runs?.paused
    ? "Delivery is paused right now."
    : runs?.asap
      ? `Delivery ${runs.hours}, usually about ${runs.asapMinutes || 45}\u2013${(runs.asapMinutes || 45) + 15} minutes after you order.`
      : openRun
      ? `Next delivery today: leaves ${openRun.delay ? openRun.departs : openRun.label}, arriving about ${openRun.arrives}.`
      : runs?.next
        ? `Next deliveries: ${runs.next.day} from ${runs.next.label}.`
        : "";

  return (
    <div className="mt-6">
      <input
        type="text" value={text} onChange={(e) => type(e.target.value)} placeholder="Start typing your address" autoComplete="off"
        aria-label="Your address" className={field}
      />

      <div className="mt-3" aria-live="polite">
        {status === "loading" && <p className="text-sm text-ink/60">Checking...</p>}
        {status === "error" && <p className="text-sm text-rust">The address check isn&apos;t working right now. Please call (08) 8188 5301 and we&apos;ll tell you.</p>}
        {status === "done" && results.length === 0 && !verdict && (
          <p className="text-sm text-ink/70">We couldn&apos;t find that address. Try the street and suburb, or call us on (08) 8188 5301.</p>
        )}
        {results.length > 0 && !verdict && (
          <ul role="listbox" aria-label="Matching addresses" className="rounded-2xl border-2 border-ink/15 bg-canvas-light overflow-hidden">
            {results.map((r) => (
              <li key={r.label} role="option" aria-selected="false">
                <button type="button" onClick={() => pick(r)} className="w-full text-left px-4 py-3 border-b border-ink/10 last:border-0 hover:bg-pine/10">
                  <span className="block font-display font-700 leading-snug">{r.label}</span>
                  <span className={`block text-xs mt-0.5 ${r.inRange ? "text-pine" : "text-rust"}`}>{r.distanceKm} km from the store</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {verdict && (
        verdict.inRange ? (
          <div role="status" className="mt-4 rounded-3xl bg-pine text-canvas-light p-6">
            <p className="font-display font-900 text-3xl leading-tight">Yes, we deliver to you!</p>
            <p className="mt-2 text-canvas-light/80">You&apos;re about {verdict.distanceKm} km from the store.</p>
            {when && <p className="mt-3 font-display font-700">{when}</p>}
            <p className="mt-2 text-sm text-canvas-light/70">{runs?.asap ? "" : "Delivery is booked by run. "}Pickup is open every day.</p>
            <Link href="/order" className="mt-5 block text-center rounded-full bg-gold text-ink font-display font-900 text-lg py-4">Order now</Link>
          </div>
        ) : (
          <div role="status" className="mt-4 rounded-3xl bg-canvas-light border-2 border-rust p-6">
            <p className="font-display font-900 text-3xl leading-tight">Sorry, not to that address yet.</p>
            <p className="mt-2 text-ink/80">You&apos;re about {verdict.distanceKm} km away, and we deliver within {radius} km.</p>
            <p className="mt-3 text-ink/80">You can still order pickup from the store, open every day.</p>
            <Link href="/order" className="mt-5 block text-center rounded-full bg-pine text-canvas-light font-display font-900 text-lg py-4">Order for pickup</Link>
          </div>
        )
      )}
      {verdict && (
        <button type="button" onClick={() => { setVerdict(null); setText(""); }} className="mt-4 underline text-sm text-ink/70">Check another address</button>
      )}
    </div>
  );
}
