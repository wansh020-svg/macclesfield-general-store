import { sql } from "@vercel/postgres";
import { seedDivisions } from "@/lib/seed";

// ---------------------------------------------------------------- schema
let ready = null;

export function ensureSchema() {
  if (!ready) {
    ready = init().catch((e) => {
      ready = null; // try again on the next request
      throw e;
    });
  }
  return ready;
}
export const ensureTable = ensureSchema; // old name

async function init() {
  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      notes TEXT,
      items JSONB NOT NULL,
      estimated_total NUMERIC,
      status TEXT DEFAULT 'new'
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS images (
      id SERIAL PRIMARY KEY,
      mime TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS divisions (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      sort INT NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      division_id INT NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
      category TEXT,
      name TEXT NOT NULL,
      description TEXT,
      price NUMERIC,
      price_note TEXT,
      sizes JSONB,
      available BOOLEAN NOT NULL DEFAULT TRUE,
      image_id INT,
      sort INT NOT NULL DEFAULT 0
    )`;
  await sql`
    CREATE TABLE IF NOT EXISTS deals (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      price NUMERIC,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      image_id INT,
      sort INT NOT NULL DEFAULT 0
    )`;

  const { rows } = await sql`SELECT COUNT(*)::int AS n FROM divisions`;
  if (rows[0].n === 0) await seedMenu();
}

async function seedMenu() {
  let order = 0;
  for (const d of seedDivisions()) {
    const div = await sql.query("INSERT INTO divisions (name, sort) VALUES ($1, $2) RETURNING id", [d.name, ++order]);
    let k = 0;
    for (const it of d.items) {
      await sql.query(
        `INSERT INTO items (division_id, category, name, description, price, price_note, sizes, sort)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8)`,
        [div.rows[0].id, it.category, it.name, it.description, it.price, it.price_note,
         it.sizes ? JSON.stringify(it.sizes) : null, ++k]
      );
    }
  }
}

// ---------------------------------------------------------------- public reads
const num = (v) => (v === null || v === undefined ? null : Number(v));
const cleanItem = (r) => ({ ...r, price: num(r.price) });

export async function getMenu() {
  await ensureSchema();
  const d = await sql`SELECT id, name FROM divisions WHERE active ORDER BY sort, id`;
  const i = await sql`SELECT * FROM items ORDER BY sort, id`;
  return d.rows
    .map((div) => ({ ...div, items: i.rows.filter((r) => r.division_id === div.id).map(cleanItem) }))
    .filter((div) => div.items.length > 0);
}

export async function getDeals() {
  await ensureSchema();
  const { rows } = await sql`SELECT * FROM deals WHERE active ORDER BY sort, id`;
  return rows.map(cleanItem);
}

export async function getImage(id) {
  await ensureSchema();
  const { rows } = await sql.query("SELECT mime, data FROM images WHERE id = $1", [id]);
  return rows[0] || null;
}

// ---------------------------------------------------------------- orders
export async function createOrder({ customerName, phone, address, notes, items, estimatedTotal }) {
  await ensureSchema();
  const result = await sql`
    INSERT INTO orders (customer_name, phone, address, notes, items, estimated_total)
    VALUES (${customerName}, ${phone}, ${address}, ${notes || ""}, ${JSON.stringify(items)}, ${estimatedTotal})
    RETURNING id, created_at
  `;
  return result.rows[0];
}

export async function getOrders() {
  await ensureSchema();
  const result = await sql`SELECT * FROM orders ORDER BY created_at DESC`;
  return result.rows;
}

export async function markOrderStatus(id, status) {
  await sql`UPDATE orders SET status = ${status} WHERE id = ${id}`;
}

// Re-price a cart on the server so the browser can never choose its own prices.
// lines: [{ itemId | dealId, size?, qty }]. Returns { items, total } or throws Error(message).
export async function priceCart(lines) {
  await ensureSchema();
  const priced = [];
  for (const line of lines) {
    const qty = Number(line.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 50) throw new Error("Bad quantity");
    const id = Number(line.dealId ?? line.itemId);
    if (!Number.isInteger(id)) throw new Error("An item in your cart is no longer available");
    if (line.dealId) {
      const { rows } = await sql.query("SELECT * FROM deals WHERE id = $1 AND active AND price IS NOT NULL", [id]);
      if (!rows[0]) throw new Error("A deal in your cart is no longer available");
      priced.push({ name: `Deal: ${rows[0].title}`, qty, price: Number(rows[0].price) });
      continue;
    }
    const { rows } = await sql.query(
      `SELECT i.* FROM items i JOIN divisions d ON d.id = i.division_id
       WHERE i.id = $1 AND i.available AND d.active`, [id]);
    const it = rows[0];
    if (!it) throw new Error("An item in your cart is no longer available");
    if (Array.isArray(it.sizes) && it.sizes.length) {
      const s = it.sizes.find((x) => x.label === line.size);
      if (!s) throw new Error(`Please choose an option for ${it.name}`);
      priced.push({ name: `${it.name} - ${s.label}`, qty, price: Number(s.price) });
    } else if (it.price !== null) {
      priced.push({ name: it.name, qty, price: Number(it.price) });
    } else {
      throw new Error(`${it.name} has to be ordered in store`);
    }
  }
  const total = priced.reduce((sum, l) => sum + l.price * l.qty, 0);
  return { items: priced, total: Math.round(total * 100) / 100 };
}

// ---------------------------------------------------------------- staff editing
const text = (max) => (v) => {
  const s = String(v ?? "").trim().slice(0, max);
  return s === "" ? null : s;
};
const int = (v) => {
  if (v === null || v === "" || v === undefined) return null;
  const n = Number(v);
  if (!Number.isInteger(n)) throw new Error("Expected a whole number");
  return n;
};
const money = (v) => {
  if (v === null || v === "" || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 10000) throw new Error("Price must be a number");
  return Math.round(n * 100) / 100;
};
const bool = (v) => Boolean(v);
const sizes = (v) => {
  if (v === null || v === undefined || (Array.isArray(v) && v.length === 0)) return null;
  if (!Array.isArray(v)) throw new Error("Sizes must be a list");
  return JSON.stringify(
    v.map((s) => {
      const label = String(s.label ?? "").trim().slice(0, 40);
      if (!label) throw new Error("Every size needs a name");
      return { label, price: money(s.price) ?? (() => { throw new Error("Every size needs a price"); })() };
    })
  );
};

const SPECS = {
  divisions: {
    table: "divisions",
    fields: { name: [text(60), ""], sort: [int, ""], active: [bool, ""] },
    required: ["name"],
    scope: null,
  },
  items: {
    table: "items",
    fields: {
      division_id: [int, ""], category: [text(60), ""], name: [text(100), ""], description: [text(300), ""],
      price: [money, ""], price_note: [text(60), ""], sizes: [sizes, "::jsonb"], available: [bool, ""],
      image_id: [int, ""], sort: [int, ""],
    },
    required: ["division_id", "name"],
    scope: "division_id",
  },
  deals: {
    table: "deals",
    fields: { title: [text(80), ""], description: [text(300), ""], price: [money, ""], active: [bool, ""], image_id: [int, ""], sort: [int, ""] },
    required: ["title"],
    scope: null,
  },
};

export function staffKinds() {
  return Object.keys(SPECS);
}

function pick(spec, data) {
  const cols = [], vals = [], casts = [];
  for (const [col, [fn, cast]] of Object.entries(spec.fields)) {
    if (data[col] === undefined) continue;
    cols.push(col);
    vals.push(fn(data[col]));
    casts.push(cast);
  }
  return { cols, vals, casts };
}

export async function staffList(kind) {
  await ensureSchema();
  const spec = SPECS[kind];
  const { rows } = await sql.query(`SELECT * FROM ${spec.table} ORDER BY sort, id`);
  return rows.map(cleanItem);
}

export async function staffCreate(kind, data) {
  await ensureSchema();
  const spec = SPECS[kind];
  const { cols, vals, casts } = pick(spec, data);
  for (const r of spec.required) if (vals[cols.indexOf(r)] == null) throw new Error(`Missing ${r}`);
  if (!cols.includes("sort")) {
    const where = spec.scope ? `WHERE ${spec.scope} = $1` : "";
    const m = await sql.query(`SELECT COALESCE(MAX(sort), 0) + 1 AS next FROM ${spec.table} ${where}`,
      spec.scope ? [vals[cols.indexOf(spec.scope)]] : []);
    cols.push("sort"); vals.push(m.rows[0].next); casts.push("");
  }
  const ph = cols.map((_, i) => `$${i + 1}${casts[i]}`).join(", ");
  const { rows } = await sql.query(`INSERT INTO ${spec.table} (${cols.join(", ")}) VALUES (${ph}) RETURNING *`, vals);
  await cleanImages();
  return cleanItem(rows[0]);
}

export async function staffUpdate(kind, id, data) {
  await ensureSchema();
  const spec = SPECS[kind];
  const { cols, vals, casts } = pick(spec, data);
  if (cols.length === 0) throw new Error("Nothing to change");
  for (const r of spec.required) {
    const i = cols.indexOf(r);
    if (i !== -1 && vals[i] == null) throw new Error(`${r} can't be empty`);
  }
  const set = cols.map((c, i) => `${c} = $${i + 1}${casts[i]}`).join(", ");
  const { rows } = await sql.query(`UPDATE ${spec.table} SET ${set} WHERE id = $${cols.length + 1} RETURNING *`, [...vals, id]);
  if (!rows[0]) throw new Error("Not found");
  await cleanImages();
  return cleanItem(rows[0]);
}

export async function staffDelete(kind, id) {
  await ensureSchema();
  await sql.query(`DELETE FROM ${SPECS[kind].table} WHERE id = $1`, [id]);
  await cleanImages();
}

export async function saveImage(mime, data) {
  await ensureSchema();
  const { rows } = await sql.query("INSERT INTO images (mime, data) VALUES ($1, $2) RETURNING id", [mime, data]);
  return rows[0].id;
}

// Drop uploaded pictures nothing points at any more (ignoring fresh uploads not yet attached).
async function cleanImages() {
  await sql`
    DELETE FROM images
    WHERE created_at < NOW() - INTERVAL '10 minutes'
      AND id NOT IN (SELECT image_id FROM items WHERE image_id IS NOT NULL)
      AND id NOT IN (SELECT image_id FROM deals WHERE image_id IS NOT NULL)`;
}
