"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/CartContext";
import { money } from "@/lib/format";
import { toneAt } from "@/lib/tones";

// "Make it yours": size, milk, extras. Opens from the item card and adds one customised line to the cart.
// The server re-checks every choice and price when the order is placed.
export default function OptionSheet({ item, tone = 0, onClose }) {
  const { addItem } = useCart();
  const sizes = Array.isArray(item.sizes) && item.sizes.length ? item.sizes : null;
  const [size, setSize] = useState(sizes ? sizes[0].label : null);
  const [picked, setPicked] = useState({}); // groupId -> array of choice ids
  const closeRef = useRef(null);
  const t = toneAt(tone);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const base = sizes ? Number(sizes.find((s) => s.label === size)?.price ?? 0) : Number(item.price);
  const chosen = useMemo(() => {
    const out = [];
    for (const g of item.options) for (const c of g.choices) if ((picked[g.id] || []).includes(c.id)) out.push(c);
    return out;
  }, [item.options, picked]);
  const total = Math.round((base + chosen.reduce((n, c) => n + c.price, 0)) * 100) / 100;
  const missing = item.options.find((g) => g.required && !(picked[g.id] || []).length);

  function toggle(g, c) {
    setPicked((p) => {
      const now = p[g.id] || [];
      if (g.kind === "one") return { ...p, [g.id]: now.includes(c.id) ? [] : [c.id] };
      return { ...p, [g.id]: now.includes(c.id) ? now.filter((x) => x !== c.id) : [...now, c.id] };
    });
  }

  function add() {
    const ids = chosen.map((c) => c.id).sort();
    addItem({
      itemId: item.id,
      key: `i${item.id}:${size || ""}:${ids.join("+")}`,
      name: size ? `${item.name} - ${size}` : item.name,
      size: size || undefined,
      options: ids,
      optionLabels: chosen.map((c) => c.label),
      price: total,
    });
    onClose();
  }

  const row = (on) =>
    `w-full flex items-center justify-between gap-3 rounded-2xl border-2 px-4 min-h-[3.25rem] text-left transition-colors ${on ? `${t.ring} ${t.solid}` : "border-ink/15 bg-canvas-light"}`;

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={`Customise ${item.name}`}>
      <button aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-ink/60" />
      <div className="relative w-full max-w-lg max-h-[90vh] flex flex-col bg-canvas rounded-t-[2rem] shadow-2xl">
        <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display font-900 text-2xl leading-tight">{item.name}</h2>
            {item.description && <p className="text-ink/60 text-sm mt-1">{item.description}</p>}
          </div>
          <button ref={closeRef} onClick={onClose} aria-label="Close" className="shrink-0 w-10 h-10 rounded-full bg-ink/10 text-xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto px-5 pb-4 space-y-6">
          {sizes && (
            <fieldset>
              <legend className="font-mono uppercase text-xs tracking-widest text-ink/60 mb-2">Size</legend>
              <div className="space-y-2">
                {sizes.map((s) => (
                  <button key={s.label} type="button" role="radio" aria-checked={size === s.label} onClick={() => setSize(s.label)} className={row(size === s.label)}>
                    <span className="font-display font-700">{s.label}</span>
                    <span className="font-mono text-sm">{money(s.price)}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {item.options.map((g) => {
            const sel = picked[g.id] || [];
            return (
              <fieldset key={g.id}>
                <legend className="font-mono uppercase text-xs tracking-widest text-ink/60 mb-2">
                  {g.name} &middot; {g.kind === "one" ? "pick one" : "pick any"}{g.required ? " (required)" : ""}
                </legend>
                <div className="space-y-2">
                  {g.kind === "one" && !g.required && (
                    <button type="button" role="radio" aria-checked={sel.length === 0} onClick={() => setPicked((p) => ({ ...p, [g.id]: [] }))} className={row(sel.length === 0)}>
                      <span className="font-display font-700">Standard</span>
                    </button>
                  )}
                  {g.choices.map((c) => {
                    const on = sel.includes(c.id);
                    return (
                      <button
                        key={c.id} type="button" disabled={!c.available}
                        role={g.kind === "one" ? "radio" : "checkbox"} aria-checked={on}
                        onClick={() => toggle(g, c)}
                        className={`${row(on)} ${c.available ? "" : "opacity-50"}`}
                      >
                        <span className="font-display font-700">{c.label}{!c.available && " (sold out)"}</span>
                        <span className="font-mono text-sm">{c.price > 0 ? `+${money(c.price)}` : "Free"}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>

        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))] border-t border-ink/10">
          <button
            onClick={add} disabled={Boolean(missing)}
            className={`w-full rounded-full h-14 font-display font-900 text-lg disabled:opacity-50 active:scale-95 transition-transform ${t.btn}`}
          >
            {missing ? `Choose ${missing.name.toLowerCase()}` : `Add to cart · ${money(total)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
