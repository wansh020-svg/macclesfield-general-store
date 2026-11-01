import { sql, withLock } from "@/lib/sql";
import { randomUUID } from "node:crypto";
import { seedDivisions } from "@/lib/seed";
import { STATUSES } from "@/lib/orderStatus";
import { DUMMY_HASH, hashPin, verifyPin, PIN_RE } from "@/lib/pin";

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
  await withLock(727001, async (db) => {
    await db.query(`
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
      )`);
    await db.query(`
      CREATE TABLE IF NOT EXISTS images (
        id SERIAL PRIMARY KEY,
        mime TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
    await db.query(`
      CREATE TABLE IF NOT EXISTS divisions (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        sort INT NOT NULL DEFAULT 0,
        active BOOLEAN NOT NULL DEFAULT TRUE
      )`);
    await db.query(`
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
      )`);
    await db.query(`
      CREATE TABLE IF NOT EXISTS deals (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        price NUMERIC,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        image_id INT,
        sort INT NOT NULL DEFAULT 0
      )`);

    // Added after launch: a short label staff can put on a card ("Popular", "New"...).
    await db.query("ALTER TABLE items ADD COLUMN IF NOT EXISTS tag TEXT");
    await db.query("ALTER TABLE deals ADD COLUMN IF NOT EXISTS tag TEXT");
    // Order lifecycle (added with live orders / the driver app).
    for (const col of [
      "driver_id INT", "track_token TEXT", "accepted_at TIMESTAMPTZ", "ready_at TIMESTAMPTZ",
      "picked_up_at TIMESTAMPTZ", "delivered_at TIMESTAMPTZ", "cash_collected NUMERIC", "cancel_reason TEXT",
    ]) await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS ${col}`);

    await db.query(`
      CREATE TABLE IF NOT EXISTS drivers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        pin_hash TEXT NOT NULL,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
    await db.query("CREATE UNIQUE INDEX IF NOT EXISTS drivers_name_key ON drivers (lower(name))");
    await db.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        key TEXT PRIMARY KEY,
        fails INT NOT NULL DEFAULT 0,
        locked_until TIMESTAMPTZ
      )`);

    const { rows } = await db.query("SELECT COUNT(*)::int AS n FROM divisions");
    if (rows[0].n === 0) await seedMenu(db);
  });
}

// One statement, so the starting menu goes in completely or not at all.
async function seedMenu(db) {
  await db.query(
    `WITH payload AS (SELECT $1::jsonb AS j),
     d AS (
       INSERT INTO divisions (name, sort)
       SELECT x->>'name', ord::int
       FROM payload, jsonb_array_elements(payload.j) WITH ORDINALITY AS t(x, ord)
       RETURNING id, sort
     )
     INSERT INTO items (division_id, category, name, description, price, price_note, sizes, sort)
     SELECT d.id, i->>'category', i->>'name', NULLIF(i->>'description', ''), (i->>'price')::numeric,
            i->>'price_note', NULLIF(i->'sizes', 'null'::jsonb), k::int
     FROM payload, jsonb_array_elements(payload.j) WITH ORDINALITY AS t(x, ord)
     JOIN d ON d.sort = t.ord::int
     CROSS JOIN LATERAL jsonb_array_elements(x->'items') WITH ORDINALITY AS u(i, k)`,
    [JSON.stringify(seedDivisions())]
  );
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
  const token = randomUUID(); // long and unguessable: the customer's tracking link
  const result = await sql`
    INSERT INTO orders (customer_name, phone, address, notes, items, estimated_total, track_token)
    VALUES (${customerName}, ${phone}, ${address}, ${notes || ""}, ${JSON.stringify(items)}, ${estimatedTotal}, ${token})
    RETURNING id, created_at, track_token
  `;
  return result.rows[0];
}

const numOrNull = (v) => (v === null || v === undefined ? null : Number(v));
const cleanOrder = (r) => ({ ...r, estimated_total: numOrNull(r.estimated_total), cash_collected: numOrNull(r.cash_collected) });

// Newest first. Tracking tokens never leave the server except to the customer who placed the order.
export async function getOrders(limit = 150) {
  await ensureSchema();
  const result = await sql.query(
    `SELECT o.id, o.created_at, o.customer_name, o.phone, o.address, o.notes, o.items, o.estimated_total, o.status,
            o.driver_id, d.name AS driver_name, o.accepted_at, o.ready_at, o.picked_up_at, o.delivered_at,
            o.cash_collected, o.cancel_reason
     FROM orders o LEFT JOIN drivers d ON d.id = o.driver_id
     ORDER BY o.created_at DESC LIMIT $1`, [limit]);
  return result.rows.map(cleanOrder);
}

// Staff-side status change. Records when each step happened.
export async function setOrderStatus(id, status, reason) {
  await ensureSchema();
  if (!STATUSES.includes(status)) throw new Error("Unknown status");
  const stamp = {
    accepted: "accepted_at = COALESCE(accepted_at, NOW())",
    ready: "ready_at = COALESCE(ready_at, NOW())",
    out_for_delivery: "picked_up_at = COALESCE(picked_up_at, NOW())",
    delivered: "delivered_at = COALESCE(delivered_at, NOW())",
    cancelled: "cancel_reason = $3",
  }[status];
  const sets = ["status = $2", stamp].filter(Boolean).join(", ");
  const params = status === "cancelled" ? [id, status, String(reason || "").slice(0, 200) || null] : [id, status];
  const { rowCount } = await sql.query(`UPDATE orders SET ${sets} WHERE id = $1`, params);
  return rowCount > 0;
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
      image_id: [int, ""], sort: [int, ""], tag: [text(20), ""],
    },
    required: ["division_id", "name"],
    scope: "division_id",
  },
  deals: {
    table: "deals",
    fields: { title: [text(80), ""], description: [text(300), ""], price: [money, ""], active: [bool, ""], image_id: [int, ""], sort: [int, ""], tag: [text(20), ""] },
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


// ---------------------------------------------------------------- drivers
// Midnight in Adelaide, as an instant, so "today" means the store's today.
const TODAY = "(date_trunc('day', NOW() AT TIME ZONE 'Australia/Adelaide') AT TIME ZONE 'Australia/Adelaide')";

export async function getDriver(id) {
  await ensureSchema();
  const { rows } = await sql.query("SELECT id, name, active FROM drivers WHERE id = $1", [id]);
  return rows[0] || null;
}

const MAX_FAILS = 5;
const LOCK_MINUTES = 10;

// Checks name + PIN. Wrong guesses are counted per name and per network address,
// and five in a row locks that name/address out for ten minutes.
export async function loginDriver(name, pin, ip) {
  await ensureSchema();
  const keys = [`name:${String(name).trim().toLowerCase().slice(0, 60)}`, `ip:${ip || "unknown"}`];
  const locked = await sql.query(
    "SELECT 1 FROM login_attempts WHERE key = ANY($1) AND locked_until > NOW() LIMIT 1", [keys]);
  if (locked.rows[0]) return { error: "Too many wrong tries. Wait 10 minutes, or ask the store to check your PIN.", status: 429 };

  const { rows } = await sql.query("SELECT id, name, pin_hash, active FROM drivers WHERE lower(name) = lower($1)", [String(name).trim()]);
  const driver = rows[0];
  const ok = verifyPin(pin, driver ? driver.pin_hash : DUMMY_HASH) && driver && driver.active;

  if (!ok) {
    for (const key of keys) {
      await sql.query(
        `INSERT INTO login_attempts (key, fails) VALUES ($1, 1)
         ON CONFLICT (key) DO UPDATE SET
           fails = CASE WHEN login_attempts.fails + 1 >= ${MAX_FAILS} THEN 0 ELSE login_attempts.fails + 1 END,
           locked_until = CASE WHEN login_attempts.fails + 1 >= ${MAX_FAILS}
                               THEN NOW() + INTERVAL '${LOCK_MINUTES} minutes' ELSE login_attempts.locked_until END`,
        [key]);
    }
    return { error: "Wrong name or PIN.", status: 401 };
  }
  await sql.query("DELETE FROM login_attempts WHERE key = $1", [keys[0]]);
  return { driver: { id: driver.id, name: driver.name } };
}

// What the driver app shows: orders anyone can take, the driver's own, and today's totals.
export async function driverBoard(driverId) {
  await ensureSchema();
  const [avail, mine, today] = await Promise.all([
    sql.query(`SELECT id, address, estimated_total, items, ready_at FROM orders
               WHERE status = 'ready' AND driver_id IS NULL ORDER BY ready_at, id`),
    sql.query(`SELECT id, customer_name, phone, address, notes, items, estimated_total, picked_up_at FROM orders
               WHERE status = 'out_for_delivery' AND driver_id = $1 ORDER BY picked_up_at, id`, [driverId]),
    sql.query(`SELECT COUNT(*)::int AS deliveries, COALESCE(SUM(cash_collected), 0) AS cash FROM orders
               WHERE driver_id = $1 AND status = 'delivered' AND delivered_at >= ${TODAY}`, [driverId]),
  ]);
  return {
    // Before a driver takes an order they only see roughly where it's going, not the street or the customer.
    available: avail.rows.map((o) => ({
      id: o.id,
      area: String(o.address).includes(",") ? String(o.address).split(",").slice(1).join(",").trim() : "Local delivery",
      total: Number(o.estimated_total),
      itemCount: o.items.reduce((n, i) => n + i.qty, 0),
      ready_at: o.ready_at,
    })),
    mine: mine.rows.map((o) => ({ ...o, estimated_total: Number(o.estimated_total) })),
    today: { deliveries: today.rows[0].deliveries, cash: Number(today.rows[0].cash) },
  };
}

// Each of these is ONE statement that checks the order is in the right state,
// so two drivers (or a double tap) can never both succeed.
export async function claimOrder(orderId, driverId) {
  await ensureSchema();
  const { rowCount } = await sql.query(
    `UPDATE orders SET status = 'out_for_delivery', driver_id = $2, picked_up_at = NOW()
     WHERE id = $1 AND status = 'ready' AND driver_id IS NULL`, [orderId, driverId]);
  return rowCount === 1;
}

export async function deliverOrder(orderId, driverId, cash) {
  await ensureSchema();
  const { rowCount } = await sql.query(
    `UPDATE orders SET status = 'delivered', delivered_at = NOW(), cash_collected = $3
     WHERE id = $1 AND driver_id = $2 AND status = 'out_for_delivery'`, [orderId, driverId, cash]);
  return rowCount === 1;
}

export async function failOrder(orderId, driverId, reason) {
  await ensureSchema();
  const { rowCount } = await sql.query(
    `UPDATE orders SET status = 'cancelled', cancel_reason = $3
     WHERE id = $1 AND driver_id = $2 AND status = 'out_for_delivery'`,
    [orderId, driverId, `Couldn't deliver: ${String(reason || "no reason given").slice(0, 150)}`]);
  return rowCount === 1;
}

export async function releaseOrder(orderId, driverId) {
  await ensureSchema();
  const { rowCount } = await sql.query(
    `UPDATE orders SET status = 'ready', driver_id = NULL, picked_up_at = NULL
     WHERE id = $1 AND driver_id = $2 AND status = 'out_for_delivery'`, [orderId, driverId]);
  return rowCount === 1;
}

// Staff: the Drivers tab.
export async function listDrivers() {
  await ensureSchema();
  const { rows } = await sql.query(
    `SELECT d.id, d.name, d.active, d.created_at,
            COUNT(o.id) FILTER (WHERE o.status = 'delivered' AND o.delivered_at >= ${TODAY})::int AS deliveries_today,
            COALESCE(SUM(o.cash_collected) FILTER (WHERE o.status = 'delivered' AND o.delivered_at >= ${TODAY}), 0) AS cash_today,
            COUNT(o.id) FILTER (WHERE o.status = 'out_for_delivery')::int AS on_the_road
     FROM drivers d LEFT JOIN orders o ON o.driver_id = d.id
     GROUP BY d.id ORDER BY d.active DESC, lower(d.name)`);
  return rows.map((r) => ({ ...r, cash_today: Number(r.cash_today) }));
}

export async function createDriver(name, pin) {
  await ensureSchema();
  const clean = String(name || "").trim().slice(0, 40);
  if (!clean) throw new Error("Give the driver a name");
  if (!PIN_RE.test(String(pin))) throw new Error("PIN must be 4 to 8 digits");
  try {
    const { rows } = await sql.query(
      "INSERT INTO drivers (name, pin_hash) VALUES ($1, $2) RETURNING id", [clean, hashPin(String(pin))]);
    return rows[0].id;
  } catch (err) {
    if (err.code === "23505") throw new Error("A driver with that name already exists");
    throw err;
  }
}

export async function updateDriver(id, { active, pin }) {
  await ensureSchema();
  if (pin !== undefined) {
    if (!PIN_RE.test(String(pin))) throw new Error("PIN must be 4 to 8 digits");
    await sql.query("UPDATE drivers SET pin_hash = $2 WHERE id = $1", [id, hashPin(String(pin))]);
  }
  if (active !== undefined) await sql.query("UPDATE drivers SET active = $2 WHERE id = $1", [id, Boolean(active)]);
}

// ---------------------------------------------------------------- customer tracking
export async function trackOrder(token) {
  await ensureSchema();
  const { rows } = await sql.query(
    `SELECT o.id, o.status, o.created_at, o.accepted_at, o.ready_at, o.picked_up_at, o.delivered_at,
            o.estimated_total, o.cancel_reason, d.name AS driver_name
     FROM orders o LEFT JOIN drivers d ON d.id = o.driver_id WHERE o.track_token = $1`, [token]);
  return rows[0] ? { ...rows[0], estimated_total: Number(rows[0].estimated_total) } : null;
}
