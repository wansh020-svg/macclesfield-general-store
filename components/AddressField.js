"use client";

import { useEffect, useRef, useState } from "react";

const field = "w-full rounded-2xl border-2 border-ink/15 bg-canvas-light px-4 py-3 text-base focus:border-pine outline-none";
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// Address box with a suggestions dropdown. The customer must pick an address that is
// inside the delivery area (or explicitly say theirs isn't listed).
export default function AddressField({ value, onText, chosen, onChoose, unverified, onUnverified, autoCheck }) {
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | done | unavailable
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [radiusKm, setRadiusKm] = useState(5);
  const [message, setMessage] = useState("");
  const timer = useRef(null);
  const abort = useRef(null);
  const listId = "address-suggestions";

  async function search(text, { pick } = {}) {
    abort.current?.abort();
    const ctl = new AbortController();
    abort.current = ctl;
    setStatus("loading");
    try {
      const res = await fetch("/api/address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
        signal: ctl.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("unavailable");
        setMessage(data.error || "Address search isn't available right now.");
        setResults([]);
        return;
      }
      setMessage("");
      setRadiusKm(data.radiusKm ?? 5);
      setResults(data.results);
      setStatus("done");
      setActive(-1);
      if (pick) {
        // a returning customer's saved address: confirm it for them if it matches exactly
        const hit = data.results.find((r) => r.inRange && norm(r.label) === norm(text));
        if (hit) onChoose(hit);
        else setOpen(false);
      } else {
        setOpen(true);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setStatus("unavailable");
        setMessage("Couldn't reach the address search. Check your connection.");
      }
    }
  }

  useEffect(() => {
    if (autoCheck && autoCheck.trim().length >= 4) search(autoCheck, { pick: true });
    return () => { clearTimeout(timer.current); abort.current?.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoCheck]);

  function type(text) {
    onText(text); // parent clears any earlier choice
    clearTimeout(timer.current);
    setMessage("");
    if (text.trim().length < 4) {
      abort.current?.abort();
      setResults([]);
      setStatus("idle");
      setOpen(false);
      return;
    }
    // Wait for a pause in typing so we don't ask the free service on every keystroke.
    timer.current = setTimeout(() => search(text), 400);
  }

  function pickResult(r) {
    if (!r.inRange) return;
    // street-level match: keep the house number the customer typed
    const typedNumber = !r.precise ? (value.trim().match(/^\d+[a-z]?(?:\/\d+)?/i) || [""])[0] : "";
    onText(typedNumber ? `${typedNumber} ${r.label}` : r.label);
    onChoose(r);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e) {
    if (!open || !results.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => (a + 1) % results.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => (a <= 0 ? results.length - 1 : a - 1)); }
    else if (e.key === "Enter" && active >= 0) { e.preventDefault(); pickResult(results[active]); }
    else if (e.key === "Escape") setOpen(false);
  }

  const anyInRange = results.some((r) => r.inRange);
  const allFar = status === "done" && results.length > 0 && !anyInRange;
  const typed = value.trim().length >= 6;
  const canSkip = typed && !chosen && !unverified &&
    (status === "unavailable" || (status === "done" && (results.length === 0 || anyInRange)));

  return (
    <div className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        placeholder="Start typing your address"
        autoComplete="off"
        value={value}
        onChange={(e) => type(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => results.length && !chosen && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={field}
      />

      {open && results.length > 0 && (
        <ul id={listId} role="listbox" className="absolute z-30 left-0 right-0 mt-1 rounded-2xl border-2 border-ink/15 bg-canvas-light shadow-xl overflow-hidden">
          {results.map((r, i) => (
            <li
              key={r.label}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={active === i}
              aria-disabled={!r.inRange}
              // mouse-down (not click) so it lands before the input loses focus
              onMouseDown={(e) => { e.preventDefault(); pickResult(r); }}
              onMouseEnter={() => setActive(i)}
              className={`px-4 py-3 border-b border-ink/10 last:border-0 ${r.inRange ? "cursor-pointer" : "opacity-60"} ${active === i && r.inRange ? "bg-pine/10" : ""}`}
            >
              <span className="block font-display font-700 leading-snug">{r.label}</span>
              <span className={`block text-xs mt-0.5 ${r.inRange ? "text-pine" : "text-rust"}`}>
                {r.inRange ? `${r.distanceKm} km from the store` : `${r.distanceKm} km away. Outside our ${radiusKm} km delivery area`}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 space-y-2" aria-live="polite">
        {status === "loading" && <p className="text-sm text-ink/60">Searching...</p>}
        {chosen && (
          <p className="rounded-2xl bg-pine text-canvas-light px-4 py-3 text-sm">
            We can deliver to {chosen.label} ({chosen.distanceKm} km).
            {!chosen.precise && " We found the street but not the exact house number, so check yours is in the box above."}
          </p>
        )}
        {status === "done" && !chosen && results.length === 0 && typed && (
          <p className="text-sm text-ink/60">No matches yet. Keep typing the street and suburb.</p>
        )}
        {allFar && (
          <p role="alert" className="rounded-2xl bg-rust/10 text-rust px-4 py-3 text-sm">
            That looks outside our delivery area (we deliver within {radiusKm} km of the store). If it&apos;s a typo, fix it, or call (08) 8188 5301.
          </p>
        )}
        {message && <p role="alert" className="rounded-2xl bg-rust/10 text-rust px-4 py-3 text-sm">{message}</p>}
        {canSkip && (
          <button type="button" onClick={onUnverified} className="w-full text-sm underline underline-offset-4 text-ink/70">
            My address isn&apos;t listed. Continue anyway
          </button>
        )}
        {unverified && (
          <p className="rounded-2xl bg-gold/30 px-4 py-3 text-sm">
            We couldn&apos;t check this address, so the store will call you to confirm we can deliver there.
          </p>
        )}
      </div>
    </div>
  );
}
