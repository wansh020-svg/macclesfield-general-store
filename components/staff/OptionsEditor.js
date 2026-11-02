"use client";

import { useMemo, useState } from "react";
import { api } from "@/components/staff/api";
import { Label, Toggle, btn, input } from "@/components/staff/Bits";

const has = (list, v) => list.includes(v);
const flip = (list, v) => (has(list, v) ? list.filter((x) => x !== v) : [...list, v]);

function Group({ group, items, onSaved, onDeleted }) {
  const [g, setG] = useState({
    name: group.name, kind: group.kind, required: group.required, active: group.active,
    choices: group.choices, categories: group.categories, item_ids: group.item_ids, except_item_ids: group.except_item_ids,
  });
  const [open, setOpen] = useState(null); // category whose items are showing
  const [msg, setMsg] = useState("");
  const set = (k, v) => setG((x) => ({ ...x, [k]: v }));
  const cats = useMemo(() => {
    const map = new Map();
    for (const it of items) if (it.category) map.set(it.category, [...(map.get(it.category) || []), it]);
    return [...map.entries()];
  }, [items]);

  async function save(patch = {}) {
    setMsg("Saving...");
    try {
      const { row } = await api("option_groups", "PATCH", { ...g, ...patch, id: group.id });
      onSaved(row);
      setMsg("Saved");
    } catch (e) {
      setMsg(e.message);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${group.name}"? Items lose these choices.`)) return;
    try {
      await api("option_groups", "DELETE", null, `?id=${group.id}`);
      onDeleted(group.id);
    } catch (e) {
      setMsg(e.message);
    }
  }

  const setChoice = (i, patch) => set("choices", g.choices.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const catOn = (c) => has(g.categories, c);
  const itemOn = (it) => (catOn(it.category) ? !has(g.except_item_ids, it.id) : has(g.item_ids, it.id));
  function toggleCat(c, list) {
    const ids = list.map((i) => i.id);
    setG((x) => ({
      ...x,
      categories: flip(x.categories, c),
      item_ids: x.item_ids.filter((id) => !ids.includes(id)),
      except_item_ids: x.except_item_ids.filter((id) => !ids.includes(id)),
    }));
  }
  function toggleItem(it) {
    if (catOn(it.category)) set("except_item_ids", flip(g.except_item_ids, it.id));
    else set("item_ids", flip(g.item_ids, it.id));
  }
  const count = items.filter(itemOn).length;

  return (
    <div className={`border border-ink/15 rounded-2xl p-4 grid gap-4 ${g.active ? "bg-canvas-light" : "bg-canvas opacity-70"}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Label text="Name"><input className={input} value={g.name} onChange={(e) => set("name", e.target.value)} /></Label>
        <Label text="Customer can">
          <select className={input} value={g.kind} onChange={(e) => set("kind", e.target.value)}>
            <option value="many">Pick any (tick boxes)</option>
            <option value="one">Pick one (like milk)</option>
          </select>
        </Label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={g.required} onChange={(e) => set("required", e.target.checked)} />
        They must choose one before adding (leave off for optional extras)
      </label>

      <div>
        <span className="font-mono text-[11px] uppercase tracking-widest text-ink/50">Choices and prices ($)</span>
        <div className="mt-1 space-y-2">
          {g.choices.map((c, i) => (
            <div key={c.id || i} className="flex flex-wrap items-center gap-2">
              <input className={`${input} flex-1 min-w-[8rem]`} aria-label="Choice name" value={c.label} onChange={(e) => setChoice(i, { label: e.target.value })} />
              <input className={`${input} w-20`} aria-label="Price" inputMode="decimal" value={c.price} onChange={(e) => setChoice(i, { price: e.target.value })} />
              <Toggle on={c.available !== false} onChange={(v) => setChoice(i, { available: v })} onLabel="In stock" offLabel="Sold out" />
              <button onClick={() => set("choices", g.choices.filter((_, j) => j !== i))} className={`${btn} border border-rust text-rust`} aria-label={`Remove ${c.label}`}>&times;</button>
            </div>
          ))}
        </div>
        <button onClick={() => set("choices", [...g.choices, { label: "", price: 0, available: true }])} className={`${btn} border border-ink/25 mt-2`}>+ Add choice</button>
      </div>

      <div>
        <span className="font-mono text-[11px] uppercase tracking-widest text-ink/50">Goes on ({count} items)</span>
        <p className="text-xs text-ink/50 mt-1">Tick a whole section, then open it to untick items it doesn&apos;t suit (no milk on a long black).</p>
        <div className="mt-2 space-y-1">
          {cats.map(([c, list]) => (
            <div key={c} className="rounded-xl border border-ink/10">
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <label className="flex items-center gap-2 text-sm font-700">
                  <input type="checkbox" checked={catOn(c)} onChange={() => toggleCat(c, list)} />
                  {c} <span className="text-ink/40 font-400">({list.filter(itemOn).length}/{list.length})</span>
                </label>
                <button onClick={() => setOpen(open === c ? null : c)} className="text-xs underline text-ink/60">{open === c ? "Hide items" : "Pick items"}</button>
              </div>
              {open === c && (
                <div className="px-3 pb-2 grid sm:grid-cols-2 gap-x-4">
                  {list.map((it) => (
                    <label key={it.id} className="flex items-center gap-2 text-sm py-1">
                      <input type="checkbox" checked={itemOn(it)} onChange={() => toggleItem(it)} /> {it.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Toggle on={g.active} onChange={(v) => { set("active", v); save({ active: v }); }} onLabel="Showing" offLabel="Hidden" />
        <button onClick={() => save()} className={`${btn} bg-rust text-canvas-light`}>Save</button>
        <button onClick={remove} className={`${btn} border border-rust text-rust`}>Delete</button>
        <span className="text-xs text-ink/60" role="status">{msg}</span>
      </div>
    </div>
  );
}

export default function OptionsEditor({ initialGroups, items }) {
  const [groups, setGroups] = useState(initialGroups);
  const [msg, setMsg] = useState("");

  async function add() {
    setMsg("");
    try {
      const { row } = await api("option_groups", "POST", {
        name: "New extras", kind: "many", required: false, active: true,
        choices: [{ label: "Example extra", price: 1, available: true }], categories: [], item_ids: [], except_item_ids: [],
      });
      setGroups((gs) => [...gs, row]);
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/70">
        Extras customers can add to an item: milk, syrups, extra shot, bacon and so on. Each set has its own choices and prices,
        and you choose which menu items it goes on. Prices are added to the item&apos;s price.
      </p>
      {groups.map((g) => (
        <Group
          key={g.id} group={g} items={items}
          onSaved={(row) => setGroups((gs) => gs.map((x) => (x.id === row.id ? row : x)))}
          onDeleted={(id) => setGroups((gs) => gs.filter((x) => x.id !== id))}
        />
      ))}
      <button onClick={add} className={`${btn} bg-pine text-canvas-light`}>+ New set of extras</button>
      {msg && <p role="alert" className="text-rust text-sm">{msg}</p>}
    </div>
  );
}
