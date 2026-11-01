"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/CartContext";
import { money } from "@/lib/format";
import { loadProfile, rememberOrder, saveProfile } from "@/lib/local";

const field = "w-full rounded-2xl border-2 border-ink/15 bg-canvas-light px-4 py-3 text-base focus:border-pine outline-none";

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const [form, setForm] = useState({ name: "", phone: "", address: "", notes: "" });
  // address check: idle | checking | results | none | unavailable
  const [addr, setAddr] = useState({ state: "idle", results: [], chosen: null, unverified: false, message: "", radiusKm: 5 });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [remember, setRemember] = useState(true);
  const router = useRouter();
  const autoChecked = useRef(false);

  // A returning customer's saved address is checked for them, once, when the page opens.
  // Never while typing: the free map service doesn't allow search-as-you-type.
  useEffect(() => {
    const p = loadProfile();
    setForm((f) => ({ ...f, name: p.name || "", phone: p.phone || "", address: p.address || "" }));
    if ((p.address || "").trim().length >= 6 && !autoChecked.current) {
      autoChecked.current = true;
      checkAddress(p.address);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeAddress(text) {
    setForm((f) => ({ ...f, address: text }));
    setAddr((a) => ({ ...a, state: "idle", results: [], chosen: null, unverified: false, message: "" }));
  }

  async function checkAddress(text = form.address) {
    if (text.trim().length < 6) {
      setAddr((a) => ({ ...a, state: "none", message: "Type your street number, street and suburb first." }));
      return;
    }
    setAddr((a) => ({ ...a, state: "checking", chosen: null, unverified: false, message: "" }));
    try {
      const res = await fetch("/api/address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAddr((a) => ({ ...a, state: "unavailable", message: data.error || "Couldn't check the address right now." }));
        return;
      }
      const fits = data.results.filter((r) => r.inRange);
      setAddr((a) => ({
        ...a,
        state: data.results.length ? "results" : "none",
        results: data.results,
        radiusKm: data.radiusKm,
        // one clear match inside the area: pick it for them
        chosen: fits.length === 1 && data.results.length === 1 ? fits[0] : null,
        message: data.results.length ? "" : "We couldn't find that address. Check the spelling, or continue and we'll call to confirm.",
      }));
    } catch {
      setAddr((a) => ({ ...a, state: "unavailable", message: "Couldn't reach the address checker. Check your connection." }));
    }
  }

  const addressReady = Boolean(addr.chosen) || addr.unverified;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!form.name || !form.phone || !form.address) {
      setError("Please fill in your name, phone, and address.");
      return;
    }
    if (!addressReady) {
      setError("Please check your address first.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: form.name,
          phone: form.phone,
          address: form.address,
          addressProof: addr.chosen?.proof,
          unverified: addr.unverified,
          notes: form.notes,
          items: items.map((i) => ({ itemId: i.itemId, dealId: i.dealId, size: i.size, qty: i.qty })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to place order");

      if (remember) saveProfile(form);
      rememberOrder({
        id: data.order.id, token: data.order.token, at: Date.now(), total: data.order.total,
        items: items.map((i) => ({ key: i.key, name: i.name, price: i.price, qty: i.qty, itemId: i.itemId, dealId: i.dealId, size: i.size })),
      });
      clearCart();
      router.push(`/checkout/success?id=${data.order.id}&t=${data.order.token}`);
    } catch (err) {
      setError(err.message && err.message !== "Failed to place order"
        ? err.message
        : "Something went wrong placing your order. Please call the store instead.");
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <section className="max-w-md mx-auto px-5 py-24 text-center">
        <p className="text-ink/60">Your cart is empty.</p>
      </section>
    );
  }

  return (
    <section className="max-w-md mx-auto px-5 pt-8 pb-16">
      <h1 className="font-display font-900 text-4xl leading-none">Where to?</h1>
      <p className="text-ink/60 mt-2">
        Cash on delivery: <span className="font-display font-900 text-ink">{money(total)}</span>. No card needed.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <input type="text" placeholder="Full name" autoComplete="name" value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} className={field} />
        <input type="tel" placeholder="Phone number" autoComplete="tel" value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })} className={field} />

        <div>
          <input type="text" placeholder="Delivery address, e.g. 12 Smith St, Macclesfield" autoComplete="street-address"
            value={form.address} onChange={(e) => changeAddress(e.target.value)} className={field} />
          <button type="button" onClick={() => checkAddress()} disabled={addr.state === "checking"}
            className="mt-2 w-full rounded-full bg-pine text-canvas-light font-display font-900 h-12 disabled:opacity-60 active:scale-95 transition-transform">
            {addr.state === "checking" ? "Checking..." : addr.chosen ? "Check again" : "Check address"}
          </button>
        </div>

        {addr.state === "results" && (
          <fieldset className="space-y-2">
            <legend className="font-mono text-xs uppercase tracking-widest text-ink/60 mb-1">Is it one of these?</legend>
            {addr.results.map((r) => (
              <label
                key={r.label}
                className={`block rounded-2xl border-2 p-4 ${!r.inRange ? "border-rust/40 bg-rust/5 opacity-80" : addr.chosen?.label === r.label ? "border-pine bg-pine/10" : "border-ink/15 bg-canvas-light"} ${r.inRange ? "cursor-pointer" : ""}`}
              >
                <input type="radio" name="addr" className="sr-only" disabled={!r.inRange}
                  checked={addr.chosen?.label === r.label} onChange={() => setAddr((a) => ({ ...a, chosen: r, unverified: false }))} />
                <span className="block font-display font-700">{r.label}</span>
                <span className={`block text-sm mt-1 ${r.inRange ? "text-pine" : "text-rust"}`}>
                  {r.inRange
                    ? `${r.distanceKm} km from the store`
                    : `${r.distanceKm} km away. Sorry, we deliver within ${addr.radiusKm} km.`}
                </span>
              </label>
            ))}
          </fieldset>
        )}

        {addr.chosen && (
          <p role="status" className="rounded-2xl bg-pine text-canvas-light px-4 py-3 text-sm">
            We can deliver to {addr.chosen.label} ({addr.chosen.distanceKm} km).
          </p>
        )}
        {addr.message && <p role="alert" className="rounded-2xl bg-rust/10 text-rust px-4 py-3 text-sm">{addr.message}</p>}

        {/* The skip link is for "not found" or "service down", or when some matches are in range but none is theirs.
            If every match is outside the delivery area there is no way around it. */}
        {(addr.state === "none" || addr.state === "unavailable" || (addr.state === "results" && addr.results.some((r) => r.inRange))) && !addr.unverified && !addr.chosen && (
          <button type="button" onClick={() => setAddr((a) => ({ ...a, unverified: true }))}
            className="w-full text-sm underline underline-offset-4 text-ink/70">
            My address isn&apos;t listed. Continue anyway
          </button>
        )}
        {addr.state === "results" && addr.results.length > 0 && !addr.results.some((r) => r.inRange) && (
          <p role="alert" className="rounded-2xl bg-rust/10 text-rust px-4 py-3 text-sm">
            That looks outside our delivery area (we deliver within {addr.radiusKm} km of the store). If it's a typo, fix it and check again, or call (08) 8188 5301.
          </p>
        )}
        {addr.unverified && (
          <p className="rounded-2xl bg-gold/30 px-4 py-3 text-sm">
            We couldn&apos;t check this address, so the store will call you to confirm we can deliver there.
          </p>
        )}

        <textarea placeholder="Notes: unit number, gate code, anything else (optional)" rows={3} value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })} className={field} />
        <label className="flex items-center gap-2 text-sm text-ink/70">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
          Remember my details on this phone
        </label>
        {error && <p role="alert" className="rounded-2xl bg-rust/10 text-rust px-4 py-3 text-sm">{error}</p>}
        <button type="submit" disabled={submitting || !addressReady}
          className="w-full rounded-full bg-rust text-canvas-light font-display font-900 text-xl h-14 disabled:opacity-50 active:scale-95 transition-transform">
          {submitting ? "Placing order..." : addressReady ? "Place order" : "Check your address to continue"}
        </button>
      </form>
    </section>
  );
}
