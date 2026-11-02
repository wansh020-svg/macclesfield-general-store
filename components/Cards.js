"use client";

import { useState } from "react";
import { useCart } from "@/components/CartContext";
import OptionSheet from "@/components/OptionSheet";
import { useOrdering } from "@/components/OrderingContext";
import { money } from "@/lib/format";
import { toneAt } from "@/lib/tones";

// One scrolling row of cards under a big heading, like a streaming-app shelf.
export function Row({ id, title, tone = 0, children }) {
  const t = toneAt(tone);
  return (
    <section id={id} data-row className="scroll-mt-32 pt-10">
      <h2 className="font-display font-900 text-3xl uppercase tracking-tight px-5 max-w-5xl mx-auto flex items-center gap-3">
        <span>{title}</span>
        <span className={`w-9 h-9 rounded-full grid place-items-center text-lg leading-none ${t.solid}`} aria-hidden="true">
          &rarr;
        </span>
      </h2>
      <div className="mt-5 flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-5 px-5 pb-4 [scrollbar-width:none] md:scroll-px-[max(1.25rem,calc((100vw-64rem)/2+1.25rem))] md:px-[max(1.25rem,calc((100vw-64rem)/2+1.25rem))]">
        {children}
      </div>
    </section>
  );
}

function Stepper({ qty, label, tone, onMinus, onPlus, compact = false }) {
  const size = compact ? "w-8 h-9" : "w-12 h-11";
  return (
    <div className={`flex items-center justify-between rounded-full ${compact ? "shrink-0" : "w-full"} ${toneAt(tone).btn}`}>
      <button onClick={onMinus} aria-label={`Remove one ${label}`} className={`${size} text-xl leading-none`}>
        &minus;
      </button>
      {/* key={qty} restarts the animation so the number bounces on every change */}
      <span key={qty} className="font-display font-900 text-base animate-pop">
        {qty}
      </span>
      <button onClick={onPlus} aria-label={`Add one ${label}`} className={`${size} text-xl leading-none`}>
        +
      </button>
    </div>
  );
}

// Add button that turns into a stepper once the line is in the cart.
// compact = small round buttons, used for the several size options on one card.
function AddControl({ line, label, tone, compact = false }) {
  const { items, addItem, updateQty } = useCart();
  const { anyOpen: open } = useOrdering();
  const qty = items.find((i) => i.key === line.key)?.qty || 0;

  if (qty > 0) {
    return (
      <Stepper
        qty={qty} label={label} tone={tone} compact={compact}
        onMinus={() => updateQty(line.key, qty - 1)} onPlus={() => addItem(line)}
      />
    );
  }
  if (!open) {
    // not taking orders right now: browsing is fine, adding isn't
    return compact ? (
      <button disabled aria-label={`${label}: not taking orders right now`} className="shrink-0 w-9 h-9 rounded-full bg-ink/10 text-ink/30 text-xl leading-none">+</button>
    ) : (
      <button disabled aria-label={`${label}: not taking orders right now`} className="w-full rounded-full h-11 bg-ink/10 text-ink/40 font-display font-900 text-base">Closed</button>
    );
  }
  return compact ? (
    <button
      onClick={() => addItem(line)} aria-label={`Add ${label}`}
      className={`shrink-0 w-9 h-9 rounded-full text-xl leading-none active:scale-90 transition-transform ${toneAt(tone).btn}`}
    >
      +
    </button>
  ) : (
    <button
      onClick={() => addItem(line)} aria-label={`Add ${label}`}
      className={`w-full rounded-full h-11 font-display font-900 text-base active:scale-95 transition-transform ${toneAt(tone).btn}`}
    >
      Add
    </button>
  );
}

function Shell({ title, desc, imageId, tag, tone, dim, children }) {
  const t = toneAt(tone);
  return (
    <article
      className={`snap-start shrink-0 w-48 flex flex-col text-center bg-canvas-light border-2 ${t.ring} rounded-3xl overflow-hidden ${
        dim ? "opacity-60" : ""
      }`}
    >
      {/* A picture only appears if staff uploaded one. No picture, no empty box. */}
      {imageId && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/images/${imageId}`} alt="" loading="lazy" className="w-full aspect-[4/3] object-cover" />
      )}
      <div className="p-4 flex flex-col flex-1">
        {tag && (
          <span className={`self-center mb-2 rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-widest ${t.solid}`}>
            {tag}
          </span>
        )}
        <h3 className="font-display font-900 text-xl leading-tight">{title}</h3>
        {desc && <p className="text-ink/60 text-xs leading-snug mt-2 line-clamp-3">{desc}</p>}
        <div className="mt-auto pt-4 space-y-2">{children}</div>
      </div>
    </article>
  );
}

const Price = ({ children }) => <p className="font-display font-900 text-2xl leading-none">{children}</p>;

// Items with extras open a "make it yours" sheet instead of adding straight away.
function CustomiseControl({ item, tone, from }) {
  const [openSheet, setOpenSheet] = useState(false);
  const { anyOpen: open } = useOrdering();
  const { items } = useCart();
  const inCart = items.filter((i) => i.itemId === item.id && !i.dealId).reduce((n, i) => n + i.qty, 0);
  if (!open) {
    return <button disabled aria-label={`${item.name}: not taking orders right now`} className="w-full rounded-full h-11 bg-ink/10 text-ink/40 font-display font-900 text-base">Closed</button>;
  }
  return (
    <>
      {from && <Price>{from}</Price>}
      <button
        onClick={() => setOpenSheet(true)} aria-label={`Customise ${item.name}`}
        className={`w-full rounded-full h-11 font-display font-900 text-base active:scale-95 transition-transform ${toneAt(tone).btn}`}
      >
        {inCart > 0 ? `Add another (${inCart})` : "Customise"}
      </button>
      {openSheet && <OptionSheet item={item} tone={tone} onClose={() => setOpenSheet(false)} />}
    </>
  );
}

export function ItemCard({ item, tone = 0 }) {
  const hasSizes = Array.isArray(item.sizes) && item.sizes.length > 0;
  const base = { itemId: item.id };
  const shell = { title: item.name, desc: item.description, imageId: item.image_id, tag: item.tag, tone };

  if (!item.available) {
    return (
      <Shell {...shell} dim>
        <p className="font-mono text-xs uppercase tracking-widest text-ink/50 py-2">Sold out</p>
      </Shell>
    );
  }

  const hasOptions = Array.isArray(item.options) && item.options.length > 0 && (hasSizes || item.price !== null);
  if (hasOptions) {
    const lowest = hasSizes ? Math.min(...item.sizes.map((s) => Number(s.price))) : Number(item.price);
    return (
      <Shell {...shell}>
        <CustomiseControl item={item} tone={tone} from={`${hasSizes && item.sizes.length > 1 ? "from " : ""}${money(lowest)}`} />
      </Shell>
    );
  }

  return (
    <Shell {...shell}>
      {hasSizes ? (
        item.sizes.map((s) => (
          <div key={s.label} className="flex items-center justify-between gap-2 text-left">
            <span className="min-w-0">
              <span className="block text-xs text-ink/70 leading-tight">{s.label}</span>
              <span className="block font-display font-900 text-lg leading-tight">{money(s.price)}</span>
            </span>
            <AddControl
              compact tone={tone} label={`${item.name} ${s.label}`}
              line={{ ...base, key: `i${item.id}:${s.label}`, size: s.label, name: `${item.name} - ${s.label}`, price: s.price }}
            />
          </div>
        ))
      ) : item.price !== null ? (
        <>
          <Price>{item.price_note || money(item.price)}</Price>
          <AddControl
            tone={tone} label={item.name}
            line={{ ...base, key: `i${item.id}`, name: item.name, price: item.price }}
          />
        </>
      ) : (
        <p className="font-mono text-xs text-ink/50 py-2">Ask in store</p>
      )}
    </Shell>
  );
}

export function DealCard({ deal, tone = 2 }) {
  return (
    <Shell title={deal.title} desc={deal.description} imageId={deal.image_id} tag={deal.tag} tone={tone}>
      {deal.price !== null ? (
        <>
          <Price>{money(deal.price)}</Price>
          <AddControl
            tone={tone} label={deal.title}
            line={{ dealId: deal.id, key: `d${deal.id}`, name: `Deal: ${deal.title}`, price: deal.price }}
          />
        </>
      ) : (
        <p className="font-mono text-xs text-ink/50 py-2">In store</p>
      )}
    </Shell>
  );
}

// The headline deal: one big gold banner at the top of Home.
export function DealBanner({ deal }) {
  const { items, addItem, updateQty } = useCart();
  const { anyOpen: open } = useOrdering();
  const key = `d${deal.id}`;
  const qty = items.find((i) => i.key === key)?.qty || 0;
  const line = { dealId: deal.id, key, name: `Deal: ${deal.title}`, price: deal.price };

  return (
    <div className="max-w-5xl mx-auto px-5 pt-8">
      <div className="bg-gold text-ink rounded-3xl overflow-hidden">
        {deal.image_id && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/images/${deal.image_id}`} alt="" className="w-full aspect-[16/9] object-cover" />
        )}
        <div className="p-6">
          <span className="inline-block rounded-full bg-ink text-gold px-3 py-1 font-mono text-[11px] uppercase tracking-widest">
            {deal.tag || "Deal"}
          </span>
          <h2 className="font-display font-900 text-4xl leading-[1.05] mt-3">{deal.title}</h2>
          {deal.description && <p className="mt-2 text-ink/80">{deal.description}</p>}
          {deal.price !== null && (
            <div className="mt-5 flex items-center justify-between gap-4">
              <span className="font-display font-900 text-5xl leading-none">{money(deal.price)}</span>
              {qty > 0 ? (
                <div className="flex items-center bg-ink text-gold rounded-full">
                  <button onClick={() => updateQty(key, qty - 1)} aria-label={`Remove one ${deal.title}`} className="w-12 h-12 text-2xl leading-none">&minus;</button>
                  <span key={qty} className="font-display font-900 text-xl w-6 text-center animate-pop">{qty}</span>
                  <button onClick={() => addItem(line)} aria-label={`Add one ${deal.title}`} className="w-12 h-12 text-2xl leading-none">+</button>
                </div>
              ) : (
                <button
                  disabled={!open} onClick={() => addItem(line)} aria-label={open ? `Add ${deal.title}` : `${deal.title}: not taking orders right now`}
                  className="rounded-full bg-ink text-gold font-display font-900 text-lg px-8 h-12 active:scale-95 transition-transform disabled:opacity-40 disabled:active:scale-100"
                >
                  {open ? "Add" : "Closed"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
