"use client";

import { useState } from "react";
import { api } from "@/components/staff/api";
import { Label, Toggle, btn, input } from "@/components/staff/Bits";

function Offer({ offer, items, onSaved, onDeleted }) {
  const [o, setO] = useState({ item_id: offer.item_id, size: offer.size || "", label: offer.label || "", active: offer.active });
  const [msg, setMsg] = useState("");
  const item = items.find((i) => i.id === Number(o.item_id));
  const sizes = Array.isArray(item?.sizes) ? item.sizes : [];

  async function save(patch = {}) {
    setMsg("Saving...");
    try {
      const next = { ...o, ...patch };
      if (!sizes.some((s) => s.label === next.size)) next.size = "";
      const { row } = await api("offers", "PATCH", { ...next, id: offer.id });
      onSaved(row);
      setMsg("Saved");
    } catch (e) {
      setMsg(e.message);
    }
  }

  async function remove() {
    try {
      await api("offers", "DELETE", null, `?id=${offer.id}`);
      onDeleted(offer.id);
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <div className={`border border-ink/15 rounded-2xl p-4 grid gap-3 ${o.active ? "bg-canvas-light" : "bg-canvas opacity-70"}`}>
      <Label text="Menu item">
        <select className={`${input} mt-1`} value={o.item_id} onChange={(e) => setO({ ...o, item_id: Number(e.target.value), size: "" })}>
          {items.map((i) => <option key={i.id} value={i.id}>{i.category}: {i.name}{i.price == null && !(i.sizes || []).length ? " (no price)" : ""}</option>)}
        </select>
      </Label>
      {sizes.length > 0 && (
        <Label text="Size">
          <select className={`${input} mt-1`} value={o.size} onChange={(e) => setO({ ...o, size: e.target.value })}>
            <option value="">Choose a size</option>
            {sizes.map((s) => <option key={s.label} value={s.label}>{s.label} (${s.price})</option>)}
          </select>
        </Label>
      )}
      <Label text="Shown to customers as (optional)" hint="Leave blank to use the item name.">
        <input className={`${input} mt-1`} value={o.label} onChange={(e) => setO({ ...o, label: e.target.value })} placeholder="e.g. 5 nugget pack" />
      </Label>
      <div className="flex flex-wrap items-center gap-2">
        <Toggle on={o.active} onChange={(v) => { setO({ ...o, active: v }); save({ active: v }); }} onLabel="Showing" offLabel="Hidden" />
        <button onClick={() => save()} className={`${btn} bg-rust text-canvas-light`}>Save</button>
        <button onClick={remove} className={`${btn} border border-rust text-rust`}>Remove</button>
        <span className="text-xs text-ink/60" role="status">{msg}</span>
      </div>
    </div>
  );
}

export default function OffersEditor({ initialOffers, items }) {
  const [offers, setOffers] = useState(initialOffers);
  const [msg, setMsg] = useState("");

  async function add() {
    setMsg("");
    try {
      const first = items.find((i) => i.price != null) || items[0];
      const { row } = await api("offers", "POST", { item_id: first.id, active: false });
      setOffers((os) => [...os, row]);
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/70">
        Shown to customers at checkout as &ldquo;Add something to your order?&rdquo;. They can add each one as many times as they like.
        An item with no price, or one that is sold out, is left out until it&apos;s priced or back in stock.
      </p>
      {offers.map((o) => (
        <Offer
          key={o.id} offer={o} items={items}
          onSaved={(row) => setOffers((os) => os.map((x) => (x.id === row.id ? row : x)))}
          onDeleted={(id) => setOffers((os) => os.filter((x) => x.id !== id))}
        />
      ))}
      <button onClick={add} className={`${btn} bg-pine text-canvas-light`}>+ Add a suggestion</button>
      {msg && <p role="alert" className="text-rust text-sm">{msg}</p>}
    </div>
  );
}
