"use client";

import { useState } from "react";
import { api, sizesToText, textToSizes } from "@/components/staff/api";
import { ImageField, Label, Toggle, btn, input } from "@/components/staff/Bits";

function ItemEditor({ item, divisions, onSaved, onDeleted }) {
  const [d, setD] = useState({
    name: item.name, description: item.description || "", category: item.category || "",
    price: item.price ?? "", price_note: item.price_note || "", sizes: sizesToText(item.sizes),
    available: item.available, image_id: item.image_id, division_id: item.division_id, tag: item.tag || "",
  });
  const [msg, setMsg] = useState("");
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));

  async function save(patch = {}) {
    setMsg("Saving...");
    try {
      const body = { ...d, ...patch, id: item.id, sizes: textToSizes(patch.sizes ?? d.sizes) };
      const { row } = await api("items", "PATCH", body);
      onSaved(row);
      setMsg("Saved");
    } catch (e) {
      setMsg(e.message);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${item.name}" for good?`)) return;
    try {
      await api("items", "DELETE", null, `?id=${item.id}`);
      onDeleted(item.id);
    } catch (e) {
      setMsg(e.message);
    }
  }

  const shown = item.sizes?.length ? `${item.sizes.length} sizes` : item.price != null ? `$${item.price}` : "no price";

  return (
    <details className="border border-ink/10 rounded-xl bg-canvas-light">
      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3">
        <span className="min-w-0">
          <span className="font-display font-700">{item.name}</span>
          {!item.available && <span className="ml-2 text-xs text-rust">sold out</span>}
        </span>
        <span className="font-mono text-xs text-ink/50 shrink-0">{shown}</span>
      </summary>
      <div className="px-4 pb-4 pt-2 grid gap-3 border-t border-ink/10">
        <Label text="Name"><input className={input} value={d.name} onChange={(e) => set("name", e.target.value)} /></Label>
        <Label text="Description"><textarea rows={2} className={input} value={d.description} onChange={(e) => set("description", e.target.value)} /></Label>
        <div className="grid grid-cols-2 gap-3">
          <Label text="Price ($)"><input className={input} inputMode="decimal" value={d.price} onChange={(e) => set("price", e.target.value)} placeholder="e.g. 9.50" /></Label>
          <Label text="Price label"><input className={input} value={d.price_note} onChange={(e) => set("price_note", e.target.value)} placeholder="e.g. 3 for $6.50" /></Label>
        </div>
        <Label text="Sizes / options" hint="Optional. Replaces the single price. Example: Small=5.50, Medium=6, Large=7">
          <input className={input} value={d.sizes} onChange={(e) => set("sizes", e.target.value)} />
        </Label>
        <Label text="Tag (optional)" hint="A small label on the card, like Popular or New. Max 20 characters.">
          <input className={input} maxLength={20} value={d.tag} onChange={(e) => set("tag", e.target.value)} />
        </Label>
        <div className="grid grid-cols-2 gap-3">
          <Label text="Group label"><input className={input} value={d.category} onChange={(e) => set("category", e.target.value)} placeholder="e.g. Tea" /></Label>
          <Label text="Division">
            <select className={input} value={d.division_id} onChange={(e) => set("division_id", Number(e.target.value))}>
              {divisions.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </Label>
        </div>
        <ImageField imageId={d.image_id} onChange={(id) => { set("image_id", id); save({ image_id: id }); }} />
        <div className="flex flex-wrap items-center gap-2">
          <Toggle on={d.available} onChange={(v) => { set("available", v); save({ available: v }); }} onLabel="Available" offLabel="Sold out" />
          <button onClick={() => save()} className={`${btn} bg-rust text-canvas-light`}>Save</button>
          <button onClick={remove} className={`${btn} border border-rust text-rust`}>Delete</button>
          <span className="text-xs text-ink/60">{msg}</span>
        </div>
      </div>
    </details>
  );
}

function Division({ div, items, divisions, first, last, actions }) {
  const [name, setName] = useState(div.name);
  const [newName, setNewName] = useState("");
  const [msg, setMsg] = useState("");

  async function addItem(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const { row } = await api("items", "POST", { division_id: div.id, name: newName });
      actions.itemAdded(row);
      setNewName("");
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <section className="border border-ink/15 rounded-2xl p-4 bg-canvas">
      <div className="flex flex-wrap items-center gap-2">
        <input className={`${input} flex-1 min-w-40 font-display font-700 text-base`} value={name} onChange={(e) => setName(e.target.value)} />
        <button className={`${btn} bg-pine text-canvas-light`} onClick={() => actions.rename(div, name).catch((e) => setMsg(e.message))}>Rename</button>
        <button className={`${btn} border border-ink/20`} disabled={first} onClick={() => actions.move(div, -1)} aria-label="Move up">&uarr;</button>
        <button className={`${btn} border border-ink/20`} disabled={last} onClick={() => actions.move(div, 1)} aria-label="Move down">&darr;</button>
        <Toggle on={div.active} onChange={(v) => actions.setActive(div, v)} onLabel="Shown" offLabel="Hidden" />
        <button className={`${btn} border border-rust text-rust`} onClick={() => actions.remove(div)}>Delete</button>
      </div>
      {msg && <p className="text-rust text-xs mt-2">{msg}</p>}

      <div className="mt-4 space-y-2">
        {items.map((it) => (
          <ItemEditor key={`${it.id}-${it.division_id}`} item={it} divisions={divisions}
            onSaved={actions.itemSaved} onDeleted={actions.itemDeleted} />
        ))}
      </div>

      <form onSubmit={addItem} className="mt-3 flex gap-2">
        <input className={input} placeholder="New item name" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <button className={`${btn} bg-rust text-canvas-light shrink-0`}>Add item</button>
      </form>
    </section>
  );
}

export default function MenuEditor({ initialDivisions, initialItems }) {
  const [divisions, setDivisions] = useState(initialDivisions);
  const [items, setItems] = useState(initialItems);
  const [newDiv, setNewDiv] = useState("");
  const [error, setError] = useState("");

  const replaceDiv = (row) => setDivisions((ds) => ds.map((d) => (d.id === row.id ? row : d)));

  const actions = {
    async rename(div, name) {
      const { row } = await api("divisions", "PATCH", { id: div.id, name });
      replaceDiv(row);
    },
    async setActive(div, active) {
      try { replaceDiv((await api("divisions", "PATCH", { id: div.id, active })).row); } catch (e) { setError(e.message); }
    },
    async move(div, dir) {
      const i = divisions.findIndex((d) => d.id === div.id);
      const other = divisions[i + dir];
      if (!other) return;
      try {
        const a = await api("divisions", "PATCH", { id: div.id, sort: other.sort });
        const b = await api("divisions", "PATCH", { id: other.id, sort: div.sort });
        setDivisions((ds) => ds.map((d) => (d.id === a.row.id ? a.row : d.id === b.row.id ? b.row : d)).sort((x, y) => x.sort - y.sort || x.id - y.id));
      } catch (e) { setError(e.message); }
    },
    async remove(div) {
      const n = items.filter((i) => i.division_id === div.id).length;
      if (!window.confirm(`Delete "${div.name}" and its ${n} item(s) for good?`)) return;
      try {
        await api("divisions", "DELETE", null, `?id=${div.id}`);
        setDivisions((ds) => ds.filter((d) => d.id !== div.id));
        setItems((is) => is.filter((i) => i.division_id !== div.id));
      } catch (e) { setError(e.message); }
    },
    itemAdded: (row) => setItems((is) => [...is, row]),
    itemSaved: (row) => setItems((is) => is.map((i) => (i.id === row.id ? row : i))),
    itemDeleted: (id) => setItems((is) => is.filter((i) => i.id !== id)),
  };

  async function addDivision(e) {
    e.preventDefault();
    if (!newDiv.trim()) return;
    try {
      const { row } = await api("divisions", "POST", { name: newDiv });
      setDivisions((ds) => [...ds, row]);
      setNewDiv("");
      setError("");
    } catch (err) { setError(err.message); }
  }

  return (
    <div>
      <p className="text-ink/70 text-sm mb-6 max-w-xl">
        Each division is one sideways shelf on the Order page. Tap an item to edit it. Items with no price show
        &ldquo;Ask in store&rdquo; and can&apos;t be ordered until you give them one.
      </p>
      {error && <p className="text-rust text-sm mb-4">{error}</p>}
      <div className="space-y-5">
        {divisions.map((d, i) => (
          <Division key={d.id} div={d} items={items.filter((it) => it.division_id === d.id)} divisions={divisions}
            first={i === 0} last={i === divisions.length - 1} actions={actions} />
        ))}
      </div>
      <form onSubmit={addDivision} className="mt-6 flex gap-2">
        <input className={input} placeholder="New division name, e.g. Desserts" value={newDiv} onChange={(e) => setNewDiv(e.target.value)} />
        <button className={`${btn} bg-pine text-canvas-light shrink-0`}>Add division</button>
      </form>
    </div>
  );
}
