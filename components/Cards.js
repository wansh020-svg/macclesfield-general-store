"use client";

import { useCart } from "@/components/CartContext";
import { money } from "@/lib/format";

// One scrolling row of cards under a heading, like a streaming-app shelf.
export function Row({ id, title, children }) {
  return (
    <section id={id} data-row className="scroll-mt-32 pt-8">
      <h2 className="font-display font-900 text-2xl uppercase tracking-tight px-5 max-w-5xl mx-auto">
        {title} <span className="text-rust">&rarr;</span>
      </h2>
      <div className="mt-4 flex gap-3 overflow-x-auto snap-x snap-mandatory scroll-px-5 px-5 pb-3 [scrollbar-width:none] md:px-[max(1.25rem,calc((100vw-64rem)/2+1.25rem))]">
        {children}
      </div>
    </section>
  );
}

function Stepper({ qty, label, onMinus, onPlus }) {
  return (
    <div className="flex items-center justify-between bg-pine text-canvas-light rounded-full w-full">
      <button onClick={onMinus} aria-label={`Remove one ${label}`} className="w-10 h-10 text-xl leading-none">
        &minus;
      </button>
      <span className="font-mono text-sm">{qty}</span>
      <button onClick={onPlus} aria-label={`Add one ${label}`} className="w-10 h-10 text-xl leading-none">
        +
      </button>
    </div>
  );
}

// Add button that turns into a stepper once the line is in the cart.
// compact = small round buttons, used for the several size options on one card.
function AddControl({ line, label, text, compact = false }) {
  const { items, addItem, updateQty } = useCart();
  const qty = items.find((i) => i.key === line.key)?.qty || 0;

  if (compact) {
    return qty > 0 ? (
      <div className="flex items-center bg-pine text-canvas-light rounded-full shrink-0">
        <button onClick={() => updateQty(line.key, qty - 1)} aria-label={`Remove one ${label}`} className="w-8 h-9 text-lg leading-none">&minus;</button>
        <span className="font-mono text-xs w-4 text-center">{qty}</span>
        <button onClick={() => addItem(line)} aria-label={`Add one ${label}`} className="w-8 h-9 text-lg leading-none">+</button>
      </div>
    ) : (
      <button onClick={() => addItem(line)} aria-label={`Add ${label}`} className="shrink-0 w-9 h-9 rounded-full bg-rust text-canvas-light text-xl leading-none">+</button>
    );
  }

  return qty > 0 ? (
    <Stepper qty={qty} label={label} onMinus={() => updateQty(line.key, qty - 1)} onPlus={() => addItem(line)} />
  ) : (
    <button
      onClick={() => addItem(line)}
      aria-label={`Add ${label}`}
      className="w-full rounded-full bg-rust text-canvas-light font-mono text-xs uppercase tracking-widest h-10"
    >
      {text}
    </button>
  );
}

function Shell({ title, desc, imageId, children, dim }) {
  return (
    <article
      className={`snap-start shrink-0 w-44 flex flex-col text-center bg-canvas-light border border-ink/10 rounded-2xl p-3 ${
        dim ? "opacity-60" : ""
      }`}
    >
      {/* A picture only appears if staff uploaded one. No picture, no empty box. */}
      {imageId && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/images/${imageId}`} alt="" loading="lazy" className="w-full aspect-[4/3] object-cover rounded-xl mb-3" />
      )}
      <h3 className="font-display font-700 text-base leading-tight">{title}</h3>
      {desc && <p className="text-ink/60 text-xs leading-snug mt-1 line-clamp-3">{desc}</p>}
      <div className="mt-auto pt-3 space-y-2">{children}</div>
    </article>
  );
}

export function ItemCard({ item }) {
  const hasSizes = Array.isArray(item.sizes) && item.sizes.length > 0;
  const base = { itemId: item.id };

  if (!item.available) {
    return (
      <Shell title={item.name} desc={item.description} imageId={item.image_id} dim>
        <p className="font-mono text-xs uppercase tracking-widest text-ink/50 py-2">Sold out</p>
      </Shell>
    );
  }

  return (
    <Shell title={item.name} desc={item.description} imageId={item.image_id}>
      {hasSizes ? (
        item.sizes.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-2 text-left">
            <span className="min-w-0">
              <span className="block text-xs text-ink/80 leading-tight">{s.label}</span>
              <span className="block font-mono text-xs text-ink/60">{money(s.price)}</span>
            </span>
            <AddControl
              compact
              line={{ ...base, key: `i${item.id}:${s.label}`, size: s.label, name: `${item.name} - ${s.label}`, price: s.price }}
              label={`${item.name} ${s.label}`}
            />
          </div>
        ))
      ) : item.price !== null ? (
        <>
          <p className="font-mono text-sm text-ink/80">{item.price_note || money(item.price)}</p>
          <AddControl
            line={{ ...base, key: `i${item.id}`, name: item.name, price: item.price }}
            label={item.name}
            text="Add"
          />
        </>
      ) : (
        <p className="font-mono text-xs text-ink/50 py-2">Ask in store</p>
      )}
    </Shell>
  );
}

export function DealCard({ deal }) {
  return (
    <Shell title={deal.title} desc={deal.description} imageId={deal.image_id}>
      {deal.price !== null ? (
        <>
          <p className="font-mono text-sm text-ink/80">{money(deal.price)}</p>
          <AddControl
            line={{ dealId: deal.id, key: `d${deal.id}`, name: `Deal: ${deal.title}`, price: deal.price }}
            label={deal.title}
            text="Add"
          />
        </>
      ) : (
        <p className="font-mono text-xs text-ink/50 py-2">In store</p>
      )}
    </Shell>
  );
}
