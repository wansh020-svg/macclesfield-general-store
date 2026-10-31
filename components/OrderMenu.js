"use client";

import { useEffect, useRef, useState } from "react";
import { ItemCard, Row } from "@/components/Cards";
import { slug } from "@/lib/format";
import { toneAt } from "@/lib/tones";

export default function OrderMenu({ divisions }) {
  const [active, setActive] = useState(divisions[0]?.name);
  const barRef = useRef(null);
  const lockUntil = useRef(0);

  // Light up the chip for whichever shelf is under the sticky bar.
  useEffect(() => {
    function onScroll() {
      if (Date.now() < lockUntil.current) return;
      let current = divisions[0]?.name;
      for (const d of divisions) {
        const el = document.getElementById(slug(d.name));
        if (el && el.getBoundingClientRect().top <= 150) current = d.name;
      }
      setActive(current);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [divisions]);

  // Arriving from a Home tile (/order#coffee): scroll to that shelf.
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ block: "start" }), 60);
  }, []);

  useEffect(() => {
    barRef.current?.querySelector(`[data-chip="${slug(active || "")}"]`)
      ?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [active]);

  function jump(name) {
    setActive(name);
    lockUntil.current = Date.now() + 700;
    document.getElementById(slug(name))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <div className="sticky top-16 z-40 bg-canvas border-b border-ink/10">
        <div ref={barRef} className="max-w-5xl mx-auto flex gap-2 overflow-x-auto px-5 py-3 [scrollbar-width:none]">
          {divisions.map((d, i) => (
            <button
              key={d.id}
              data-chip={slug(d.name)}
              onClick={() => jump(d.name)}
              className={`whitespace-nowrap rounded-full px-4 py-2 font-display font-700 text-sm border-2 transition-colors ${
                active === d.name ? `${toneAt(i).solid} ${toneAt(i).ring}` : "border-ink/15 text-ink/70 bg-canvas-light"
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
      </div>

      {divisions.map((d, i) => (
        <Row key={d.id} id={slug(d.name)} title={d.name} tone={i}>
          {d.items.map((item) => (
            <ItemCard key={item.id} item={item} tone={i} />
          ))}
        </Row>
      ))}
    </>
  );
}
