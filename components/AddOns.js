"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/CartContext";
import { money } from "@/lib/format";

const SEEN = "maccy-addons-seen";
const seen = () => { try { return sessionStorage.getItem(SEEN) === "1"; } catch { return false; } };
const markSeen = () => { try { sessionStorage.setItem(SEEN, "1"); } catch {} };

const keyFor = (o) => (o.size ? `i${o.itemId}:${o.size}` : `i${o.itemId}`);

// Checkout extras (Dashboard > Extras > Offered at checkout). Pops up once per visit as picture cards,
// and a small bar on the page opens it again. Each one can be added as many times as they like.
export default function AddOns() {
  const { items, addItem, updateQty } = useCart();
  const [offers, setOffers] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/offers")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const list = Array.isArray(d.offers) ? d.offers : [];
        setOffers(list);
        if (list.length && !seen()) setOpen(true);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  if (offers.length === 0) return null;

  const qtyOf = (o) => items.find((i) => i.key === keyFor(o))?.qty || 0;
  const added = offers.reduce((n, o) => n + qtyOf(o), 0);
  const close = () => { markSeen(); setOpen(false); };
  const add = (o) => addItem({ itemId: o.itemId, key: keyFor(o), name: o.lineName, size: o.size, price: o.price });
  const less = (o) => updateQty(keyFor(o), qtyOf(o) - 1);

  return (
    <>
      <button
        type="button" onClick={() => setOpen(true)}
        className="mt-5 w-full flex items-center justify-between gap-3 rounded-3xl bg-gold/30 border-2 border-gold px-4 py-3 text-left"
      >
        <span>
          <span className="block font-display font-900 text-lg leading-tight">Make it extra tasty?</span>
          <span className="block text-sm text-ink/70">{added > 0 ? `${added} extra${added === 1 ? "" : "s"} added` : offers.slice(0, 3).map((o) => o.label).join(", ")}</span>
        </span>
        <span className="shrink-0 rounded-full bg-rust text-canvas-light font-display font-900 px-4 h-10 flex items-center">{added > 0 ? "Change" : "See extras"}</span>
      </button>
      {open && <Sheet offers={offers} qtyOf={qtyOf} add={add} less={less} added={added} onClose={close} />}
    </>
  );
}

function Sheet({ offers, qtyOf, add, less, added, onClose }) {
  const doneRef = useRef(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    doneRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Make it extra tasty">
      <button aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-ink/60" />
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-canvas rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl">
        <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display font-900 text-2xl leading-tight">Make it extra tasty</h2>
            <p className="text-ink/60 text-sm mt-1">Add a little something before you check out.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="shrink-0 w-10 h-10 rounded-full bg-ink/10 text-xl leading-none">&times;</button>
        </div>

        <ul className="overflow-y-auto px-4 pb-4 grid grid-cols-2 gap-3">
          {offers.map((o) => {
            const qty = qtyOf(o);
            return (
              <li key={o.id} className={`relative rounded-3xl bg-canvas-light border-2 p-2 pb-3 flex flex-col ${qty > 0 ? "border-pine" : "border-transparent"}`}>
                <div className="relative rounded-2xl overflow-hidden bg-canvas aspect-square flex items-center justify-center">
                  {o.imageId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/images/${o.imageId}`} alt="" loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="w-12 h-12 text-ink/15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 3v7a2 2 0 0 0 2 2v9M5 3v6M9 3v6M17 21V3c-2 1-3 3.5-3 7v3h3" />
                    </svg>
                  )}
                  {qty > 0 ? (
                    <span className="absolute top-2 right-2 flex items-center rounded-full bg-pine text-canvas-light shadow-lg">
                      <button type="button" onClick={() => less(o)} aria-label={`Remove one ${o.label}`} className="w-9 h-9 text-xl leading-none">&minus;</button>
                      <span key={qty} className="font-display font-900 w-5 text-center animate-pop">{qty}</span>
                      <button type="button" onClick={() => add(o)} aria-label={`Add one more ${o.label}`} className="w-9 h-9 text-xl leading-none">+</button>
                    </span>
                  ) : (
                    <button
                      type="button" onClick={() => add(o)} aria-label={`Add ${o.label}`}
                      className="absolute top-2 right-2 w-11 h-11 rounded-full bg-rust text-canvas-light text-3xl leading-none font-display shadow-lg active:scale-90 transition-transform"
                    >+</button>
                  )}
                </div>
                <p className="mt-2 px-1 font-display font-900 leading-tight text-center">{o.label}</p>
                <p className="px-1 font-mono text-sm text-ink/60 text-center">{money(o.price)}</p>
              </li>
            );
          })}
        </ul>

        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-ink/10">
          <button
            ref={doneRef} type="button" onClick={onClose}
            className={`w-full rounded-full font-display font-900 text-lg h-14 ${added > 0 ? "bg-rust text-canvas-light" : "bg-ink text-canvas-light"}`}
          >
            {added > 0 ? `Continue with ${added} extra${added === 1 ? "" : "s"}` : "No thanks"}
          </button>
        </div>
      </div>
    </div>
  );
}
