"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/CartContext";
import { menu, groups, splitItem, parsePrice, cartName } from "@/lib/menu";

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");

function Stepper({ qty, onMinus, onPlus, label }) {
  return (
    <div className="flex items-center bg-pine text-canvas-light rounded-full">
      <button onClick={onMinus} aria-label={`Remove one ${label}`} className="w-9 h-9 text-lg leading-none">
        &minus;
      </button>
      <span className="font-mono text-sm w-5 text-center">{qty}</span>
      <button onClick={onPlus} aria-label={`Add one ${label}`} className="w-9 h-9 text-lg leading-none">
        +
      </button>
    </div>
  );
}

function ItemRow({ cat, item }) {
  const { items, addItem, updateQty } = useCart();
  const { title, desc } = splitItem(item.name);
  const price = parsePrice(item.price);

  const qtyOf = (name) => items.find((i) => i.name === name)?.qty || 0;

  return (
    <li className="py-4 flex gap-4 items-start justify-between">
      <div className="min-w-0">
        <p className="font-display font-700 text-lg leading-snug">{title}</p>
        {desc && <p className="text-ink/60 text-sm mt-1 leading-snug">{desc}</p>}
        {item.price && <p className="font-mono text-sm text-ink/70 mt-2">{item.price}</p>}
      </div>

      <div className="shrink-0 flex flex-col items-end gap-2">
        {cat.sizes ? (
          cat.sizes.map((s) => {
            const name = cartName(cat, item, s.label);
            const q = qtyOf(name);
            return (
              <div key={s.label} className="flex items-center gap-2">
                <span className="font-mono text-xs text-ink/60">
                  {s.label} ${s.price.toFixed(2)}
                </span>
                {q > 0 ? (
                  <Stepper qty={q} label={name} onMinus={() => updateQty(name, q - 1)} onPlus={() => addItem({ name, price: s.price })} />
                ) : (
                  <button
                    onClick={() => addItem({ name, price: s.price })}
                    aria-label={`Add ${name}`}
                    className="w-9 h-9 rounded-full bg-rust text-canvas-light text-xl leading-none"
                  >
                    +
                  </button>
                )}
              </div>
            );
          })
        ) : price ? (
          (() => {
            const name = cartName(cat, item);
            const q = qtyOf(name);
            return q > 0 ? (
              <Stepper qty={q} label={name} onMinus={() => updateQty(name, q - 1)} onPlus={() => addItem({ name, price })} />
            ) : (
              <button
                onClick={() => addItem({ name, price })}
                aria-label={`Add ${name}`}
                className="w-10 h-10 rounded-full bg-rust text-canvas-light text-2xl leading-none"
              >
                +
              </button>
            );
          })()
        ) : (
          <span className="font-mono text-xs text-ink/40 text-right max-w-[6rem]">Ask in store</span>
        )}
      </div>
    </li>
  );
}

export default function MenuPage() {
  const [active, setActive] = useState(groups[0]);
  const { count, total } = useCart();
  const barRef = useRef(null);
  const lockUntil = useRef(0);

  // Highlight the group chip for whichever section is under the sticky bars.
  useEffect(() => {
    const els = groups.map((g) => document.getElementById(slug(g))).filter(Boolean);
    function onScroll() {
      if (Date.now() < lockUntil.current) return;
      let current = groups[0];
      for (const el of els) {
        if (el.getBoundingClientRect().top <= 140) current = el.dataset.group;
      }
      setActive(current);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Keep the active chip visible inside the horizontally scrolling bar.
  useEffect(() => {
    const chip = barRef.current?.querySelector(`[data-chip="${slug(active)}"]`);
    chip?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  function jump(g) {
    setActive(g);
    lockUntil.current = Date.now() + 700;
    document.getElementById(slug(g))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="pb-28">
      <div className="bg-pine-dark text-canvas-light px-5 pt-8 pb-6">
        <div className="max-w-2xl mx-auto">
          <span className="price-tag">On the Board</span>
          <h1 className="font-display font-900 text-4xl mt-4">Menu</h1>
          <p className="text-canvas-light/70 text-sm mt-2">
            Order for delivery &mdash; pay cash when it arrives. Items marked &ldquo;Ask in store&rdquo; can&apos;t be
            ordered online yet.
          </p>
        </div>
      </div>

      <div className="sticky top-16 z-40 bg-canvas border-b border-ink/10">
        <div ref={barRef} className="max-w-2xl mx-auto flex gap-2 overflow-x-auto px-5 py-3 [scrollbar-width:none]">
          {groups.map((g) => (
            <button
              key={g}
              data-chip={slug(g)}
              onClick={() => jump(g)}
              className={`whitespace-nowrap rounded-full px-4 py-2 font-mono text-xs uppercase tracking-widest border transition-colors ${
                active === g ? "bg-pine text-canvas-light border-pine" : "border-ink/20 text-ink/70"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5">
        {groups.map((g) => (
          <section key={g} id={slug(g)} data-group={g} className="scroll-mt-32 pt-10">
            <h2 className="font-display font-900 text-3xl mb-2">{g}</h2>
            {menu[g].map((cat) => (
              <div key={cat.name} className="mt-8">
                <h3 className="font-mono text-xs uppercase tracking-widest text-rust">{cat.name}</h3>
                {cat.note && <p className="text-ink/60 text-sm mt-1">{cat.note}</p>}
                <ul className="divide-y divide-ink/10 border-t border-ink/10 mt-3">
                  {cat.items.map((item) => (
                    <ItemRow key={item.name} cat={cat} item={item} />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}
      </div>

      {count > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-50 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-canvas via-canvas/95 to-transparent">
          <Link
            href="/cart"
            className="max-w-2xl mx-auto flex items-center justify-between rounded-full bg-rust text-canvas-light px-6 py-4 shadow-lg"
          >
            <span className="flex items-center gap-3">
              <span className="bg-canvas-light/20 rounded-full w-7 h-7 flex items-center justify-center font-mono text-sm">
                {count}
              </span>
              <span className="font-display font-700 text-lg">View cart</span>
            </span>
            <span className="font-mono">${total.toFixed(2)}</span>
          </Link>
        </div>
      )}
    </div>
  );
}
