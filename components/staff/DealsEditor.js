"use client";

import { useState } from "react";
import { api } from "@/components/staff/api";
import { ImageField, Label, Toggle, btn, input } from "@/components/staff/Bits";

function Deal({ deal, first, last, onSaved, onDeleted, onMove }) {
  const [d, setD] = useState({
    title: deal.title, description: deal.description || "", price: deal.price ?? "",
    active: deal.active, image_id: deal.image_id,
  });
  const [msg, setMsg] = useState("");
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));

  async function save(patch = {}) {
    setMsg("Saving...");
    try {
      const { row } = await api("deals", "PATCH", { ...d, ...patch, id: deal.id });
      onSaved(row);
      setMsg("Saved");
    } catch (e) {
      setMsg(e.message);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete the deal "${deal.title}"?`)) return;
    try {
      await api("deals", "DELETE", null, `?id=${deal.id}`);
      onDeleted(deal.id);
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <div className={`border border-ink/15 rounded-2xl p-4 grid gap-3 ${deal.active ? "bg-canvas-light" : "bg-canvas opacity-70"}`}>
      <Label text="Title"><input className={input} value={d.title} onChange={(e) => set("title", e.target.value)} /></Label>
      <Label text="Description"><textarea rows={2} className={input} value={d.description} onChange={(e) => set("description", e.target.value)} /></Label>
      <Label text="Price ($)" hint="Leave blank for an info-only card with no Add button.">
        <input className={input} inputMode="decimal" value={d.price} onChange={(e) => set("price", e.target.value)} placeholder="e.g. 15" />
      </Label>
      <ImageField imageId={d.image_id} onChange={(id) => { set("image_id", id); save({ image_id: id }); }} />
      <div className="flex flex-wrap items-center gap-2">
        <Toggle on={d.active} onChange={(v) => { set("active", v); save({ active: v }); }} onLabel="Showing" offLabel="Hidden" />
        <button className={`${btn} border border-ink/20`} disabled={first} onClick={() => onMove(deal, -1)} aria-label="Move earlier">&larr;</button>
        <button className={`${btn} border border-ink/20`} disabled={last} onClick={() => onMove(deal, 1)} aria-label="Move later">&rarr;</button>
        <button onClick={() => save()} className={`${btn} bg-rust text-canvas-light`}>Save</button>
        <button onClick={remove} className={`${btn} border border-rust text-rust`}>Delete</button>
        <span className="text-xs text-ink/60">{msg}</span>
      </div>
    </div>
  );
}

export default function DealsEditor({ initialDeals }) {
  const [deals, setDeals] = useState(initialDeals);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");

  async function add(e) {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const { row } = await api("deals", "POST", { title, active: false });
      setDeals((ds) => [...ds, row]);
      setTitle("");
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }

  async function move(deal, dir) {
    const i = deals.findIndex((x) => x.id === deal.id);
    const other = deals[i + dir];
    if (!other) return;
    try {
      const a = await api("deals", "PATCH", { id: deal.id, sort: other.sort });
      const b = await api("deals", "PATCH", { id: other.id, sort: deal.sort });
      setDeals((ds) => ds.map((x) => (x.id === a.row.id ? a.row : x.id === b.row.id ? b.row : x)).sort((x, y) => x.sort - y.sort || x.id - y.id));
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div>
      <p className="text-ink/70 text-sm mb-6 max-w-xl">
        Deals appear as cards in a row on the Home page. New deals start hidden, so fill one in, then switch it to
        Showing.
      </p>
      {error && <p className="text-rust text-sm mb-4">{error}</p>}
      <div className="space-y-4">
        {deals.length === 0 && <p className="text-ink/60">No deals yet.</p>}
        {deals.map((d, i) => (
          <Deal key={d.id} deal={d} first={i === 0} last={i === deals.length - 1} onMove={move}
            onSaved={(row) => setDeals((ds) => ds.map((x) => (x.id === row.id ? row : x)))}
            onDeleted={(id) => setDeals((ds) => ds.filter((x) => x.id !== id))} />
        ))}
      </div>
      <form onSubmit={add} className="mt-6 flex gap-2">
        <input className={input} placeholder="New deal title, e.g. Burger + chips" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button className={`${btn} bg-rust text-canvas-light shrink-0`}>Add deal</button>
      </form>
    </div>
  );
}
