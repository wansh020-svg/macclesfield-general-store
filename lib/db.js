import { sql, withLock } from "@/lib/sql";
import { randomUUID } from "node:crypto";
import { CATEGORY_SIZES, seedDivisions } from "@/lib/seed";
import { STATUSES, allowedStatuses } from "@/lib/orderStatus";
import { DUMMY_HASH, hashPin, verifyPin, PIN_RE } from "@/lib/pin";
import { lookupAddress, normalizeQuery } from "@/lib/geo";
import { DEFAULT_PICKUP, adelaideNow, toMinutes } from "@/lib/hours";
import { planRoute } from "@/lib/route";
import { DEFAULT_RUNS, adelaideDate, computeRuns, dayOf, deriveSchedule, nextRunDay, normRuns, validRuns } from "@/lib/runs";

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
    await db.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL
      )`);
    await db.query(`
      CREATE TABLE IF NOT EXISTS address_cache (
        query TEXT PRIMARY KEY,
        results JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`);
    await db.query("CREATE TABLE IF NOT EXISTS rate_hits (key TEXT NOT NULL, at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
    await db.query("CREATE INDEX IF NOT EXISTS rate_hits_key_at ON rate_hits (key, at)");
    await db.query("ALTER TABLE deals ADD COLUMN IF NOT EXISTS tag TEXT");
    // Order lifecycle (added with live orders / the driver app).
    for (const col of [
      "driver_id INT", "track_token TEXT", "accepted_at TIMESTAMPTZ", "ready_at TIMESTAMPTZ",
      "picked_up_at TIMESTAMPTZ", "delivered_at TIMESTAMPTZ", "cash_collected NUMERIC", "cancel_reason TEXT",
      "address_status TEXT", "distance_km NUMERIC", "lat DOUBLE PRECISION", "lng DOUBLE PRECISION", "source TEXT",
      "order_type TEXT DEFAULT 'delivery'", "eta_minutes INT", "collected_at TIMESTAMPTZ", "delivery_fee NUMERIC",
      "client_key TEXT", "run_date DATE", "run_time TEXT", "stop_order INT",
    ]) await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS ${col}`);
    // One order per checkout attempt: a repeated tap or a retry after a bad connection finds the first order.
    await db.query("CREATE UNIQUE INDEX IF NOT EXISTS orders_client_key ON orders (client_key) WHERE client_key IS NOT NULL");
    await db.query("UPDATE orders SET order_type = 'delivery' WHERE order_type IS NULL");
    await db.query("ALTER TABLE orders ALTER COLUMN address DROP NOT NULL"); // a pickup has no address

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

    // Extras and choices ("Oat milk +$1", "Add bacon +$2") that staff attach to menu items.
    await db.query(`
      CREATE TABLE IF NOT EXISTS option_groups (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        kind TEXT NOT NULL DEFAULT 'many',
        required BOOLEAN NOT NULL DEFAULT FALSE,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        sort INT NOT NULL DEFAULT 0,
        choices JSONB NOT NULL DEFAULT '[]',
        categories JSONB NOT NULL DEFAULT '[]',
        item_ids JSONB NOT NULL DEFAULT '[]',
        except_item_ids JSONB NOT NULL DEFAULT '[]'
      )`);

    // "Add to your order?" suggestions shown at checkout (a menu item, optionally one of its sizes).
    await db.query(`
      CREATE TABLE IF NOT EXISTS checkout_offers (
        id SERIAL PRIMARY KEY,
        item_id INT NOT NULL,
        size TEXT,
        label TEXT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        sort INT NOT NULL DEFAULT 0
      )`);

    // What staff have done to a delivery run on a given day: delayed, closed, cancelled, allowed more orders, or added it.
    await db.query(`
      CREATE TABLE IF NOT EXISTS run_state (
        run_date DATE NOT NULL,
        run_time TEXT NOT NULL,
        delay_min INT NOT NULL DEFAULT 0,
        closed BOOLEAN NOT NULL DEFAULT FALSE,
        cancelled BOOLEAN NOT NULL DEFAULT FALSE,
        extra_cap INT NOT NULL DEFAULT 0,
        custom BOOLEAN NOT NULL DEFAULT FALSE,
        PRIMARY KEY (run_date, run_time)
      )`);
    for (const col of ["started_at TIMESTAMPTZ", "started_by INT", "finished_at TIMESTAMPTZ"]) {
      await db.query(`ALTER TABLE run_state ADD COLUMN IF NOT EXISTS ${col}`);
    }
    await db.query("CREATE INDEX IF NOT EXISTS orders_run ON orders (run_date, run_time)");

    // Phone numbers staff have marked as spam. Orders from them are refused.
    await db.query(`
      CREATE TABLE IF NOT EXISTS blocked_phones (
        id SERIAL PRIMARY KEY,
        phone TEXT NOT NULL UNIQUE,
        sort INT NOT NULL DEFAULT 0
      )`);

    const { rows } = await db.query("SELECT COUNT(*)::int AS n FROM divisions");
    if (rows[0].n === 0) await seedMenu(db);
    await seedOptions(db);
    await sizeHotDrinks(db);
    await nameHotDrinks(db);
    await seedOffers(db);
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

// Hot chocolate, tea and chai are sold in the coffee sizes. Fills in only items that still have no price at all
// (so anything staff already priced is left alone), and runs once.
async function sizeHotDrinks(db) {
  const done = await db.query("SELECT 1 FROM settings WHERE key = 'hot_drink_sizes'");
  if (done.rows[0]) return;
  await db.query(
    `UPDATE items SET sizes = $1::jsonb
     WHERE price IS NULL AND sizes IS NULL AND category IN ('Heavenly Hot Chocolate', 'Tea', 'Chai')`,
    [JSON.stringify(CATEGORY_SIZES.Coffee)]);
  await db.query("INSERT INTO settings (key, value) VALUES ('hot_drink_sizes', 'true'::jsonb) ON CONFLICT (key) DO NOTHING");
}

// Hot chocolates say "Hot Chocolate" and chais say "Chai" in their names. Renames only items still carrying the
// old names (so anything staff already renamed is left alone), and runs once.
async function nameHotDrinks(db) {
  const done = await db.query("SELECT 1 FROM settings WHERE key = 'hot_drink_names'");
  if (done.rows[0]) return;
  const renames = {"Heavenly Hot Chocolate": {"Milk": "Milk Hot Chocolate", "Dark": "Dark Hot Chocolate", "White": "White Hot Chocolate", "Mint (v/gf)": "Mint Hot Chocolate (v/gf)", "Orange (v/gf)": "Orange Hot Chocolate (v/gf)", "Chilli (v/gf)": "Chilli Hot Chocolate (v/gf)", "Salted Caramel (v/gf)": "Salted Caramel Hot Chocolate (v/gf)", "Milk Choc (v/gf)": "Milk Choc Hot Chocolate (v/gf)"}, "Chai": {"Spiced": "Spiced Chai", "Chocolate": "Chocolate Chai", "Vanilla": "Vanilla Chai", "Mango": "Mango Chai"}};
  for (const [category, names] of Object.entries(renames)) {
    for (const [from, to] of Object.entries(names)) {
      await db.query("UPDATE items SET name = $3 WHERE category = $1 AND name = $2", [category, from, to]);
    }
  }
  await db.query("INSERT INTO settings (key, value) VALUES ('hot_drink_names', 'true'::jsonb) ON CONFLICT (key) DO NOTHING");
}

// Checkout suggestions, and two curries moved to "Ask in store" (once each; staff can change both afterwards).
async function seedOffers(db) {
  const curry = await db.query("SELECT 1 FROM settings WHERE key = 'curries_ask'");
  if (!curry.rows[0]) {
    await db.query(
      `UPDATE items SET price = NULL, sizes = NULL
       WHERE category = 'Curries' AND name IN ('Mango Chicken (gf)', 'Vegetarian Curry (v)')`);
    await db.query("INSERT INTO settings (key, value) VALUES ('curries_ask', 'true'::jsonb) ON CONFLICT (key) DO NOTHING");
  }
  const done = await db.query("SELECT 1 FROM settings WHERE key = 'offers_seeded'");
  if (done.rows[0]) return;
  const find = async (category, name) => (await db.query("SELECT id FROM items WHERE category = $1 AND name = $2", [category, name])).rows[0]?.id;
  const wanted = [
    [await find("Chips & Share", "Side of chips with meal"), null, "Side of fries"],
    [await find("Sides & Snacks", "Chicken Nuggets"), "5 pieces", "5 nugget pack"],
    [await find("Sides & Snacks", "Dim Sims"), null, "3 dim sims"],
    [await find("Sides & Snacks", "Samosa (v)"), null, "Samosa"],
  ];
  let sort = 0;
  for (const [id, size, label] of wanted) {
    if (id) await db.query("INSERT INTO checkout_offers (item_id, size, label, sort) VALUES ($1, $2, $3, $4)", [id, size, label, ++sort]);
  }
  await db.query("INSERT INTO settings (key, value) VALUES ('offers_seeded', 'true'::jsonb) ON CONFLICT (key) DO NOTHING");
}

// Starting extras, taken from the prices already on the menu. Runs once (a settings flag remembers it),
// so staff can edit or delete them afterwards without them coming back.
async function seedOptions(db) {
  const done = await db.query("SELECT 1 FROM settings WHERE key = 'options_seeded'");
  if (done.rows[0]) return;
  const ch = (label, price = 1) => ({ id: `o${randomUUID().slice(0, 8)}`, label, price, available: true });
  const ids = async (category, names) => {
    const r = await db.query("SELECT id FROM items WHERE category = $1 AND name = ANY($2)", [category, names]);
    return r.rows.map((x) => x.id);
  };
  const syrups = () => [ch("Caramel syrup"), ch("Vanilla syrup"), ch("Hazelnut syrup")];
  const food = ["Rolls & Classics", "Sourdough Breakfasts", "Toast", "Toasted Sandwiches", "Croissants", "Muffins"];
  const groups = [
    { name: "Milk", kind: "one", categories: ["Coffee", "Heavenly Hot Chocolate", "Chai"], except: await ids("Coffee", ["Long Black"]),
      choices: [ch("Oat milk"), ch("Soy milk"), ch("Almond milk"), ch("Lactose free milk")] },
    { name: "Extras", kind: "many", categories: ["Coffee"], choices: [ch("Extra shot"), ...syrups(), ch("Sugar", 0)] },
    { name: "Syrups & sugar", kind: "many", categories: ["Heavenly Hot Chocolate", "Chai"], choices: [...syrups(), ch("Sugar", 0)] },
    { name: "Sugar", kind: "many", categories: ["Tea"], choices: [ch("Sugar", 0)] },
    { name: "Extras", kind: "many", categories: food,
      choices: [ch("Mushrooms", 2), ch("Tomato", 2), ch("Baby spinach", 1.5), ch("Hashbrown", 3.5), ch("Bacon", 2), ch("Egg", 2), ch("Avocado", 2), ch("Cheese", 0.5)] },
    { name: "Add-ons", kind: "many", items: await ids("Burgers", ["Beef Burger"]), choices: [ch("Add egg", 2), ch("Add bacon", 2)] },
    { name: "Extras", kind: "many", items: await ids("Meals", ["Fish and Chips"]), choices: [ch("Extra piece of fish", 4)] },
  ];
  let sort = 0;
  for (const g of groups) {
    await db.query(
      `INSERT INTO option_groups (name, kind, sort, choices, categories, item_ids, except_item_ids)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb)`,
      [g.name, g.kind, ++sort, JSON.stringify(g.choices), JSON.stringify(g.categories || []), JSON.stringify(g.items || []), JSON.stringify(g.except || [])]);
  }
  // The loose extras rows on the old menu are now real options, so they are removed as separate things to order.
  await db.query(
    `DELETE FROM items
     WHERE category = 'Extras' OR (category = 'Coffee' AND (name = 'Extra shot' OR name LIKE 'Alternative milks%' OR name LIKE 'Syrups%'))`);
  await db.query("INSERT INTO settings (key, value) VALUES ('options_seeded', 'true'::jsonb) ON CONFLICT (key) DO NOTHING");
}

// ---------------------------------------------------------------- public reads
const num = (v) => (v === null || v === undefined ? null : Number(v));
const cleanItem = (r) => ({ ...r, price: num(r.price) });

export async function getMenu() {
  await ensureSchema();
  const d = await sql`SELECT id, name FROM divisions WHERE active ORDER BY sort, id`;
  const i = await sql`SELECT * FROM items ORDER BY sort, id`;
  const groups = await activeGroups();
  return d.rows
    .map((div) => ({ ...div, items: i.rows.filter((r) => r.division_id === div.id).map((r) => ({ ...cleanItem(r), options: groupsFor(r, groups).map(publicGroup) })) }))
    .filter((div) => div.items.length > 0);
}

// ---------------------------------------------------------------- options (extras)
async function activeGroups() {
  const { rows } = await sql.query("SELECT * FROM option_groups WHERE active ORDER BY sort, id");
  return rows.filter((g) => Array.isArray(g.choices) && g.choices.length > 0);
}

// Which groups apply to this item: its category is ticked (and it isn't excluded), or it is ticked itself.
function groupsFor(item, groups) {
  return groups.filter((g) => {
    if ((g.except_item_ids || []).includes(item.id)) return false;
    return (g.categories || []).includes(item.category) || (g.item_ids || []).includes(item.id);
  });
}

const publicGroup = (g) => ({
  id: g.id, name: g.name, kind: g.kind, required: g.required,
  choices: g.choices.map((c) => ({ id: c.id, label: c.label, price: Number(c.price), available: c.available !== false })),
});

// What to suggest at checkout: active suggestions whose item is on the menu, in stock and priced.
export async function getOffers() {
  await ensureSchema();
  const { rows } = await sql.query(
    `SELECT o.id, o.size, o.label, i.id AS item_id, i.name, i.price, i.sizes
     FROM checkout_offers o
     JOIN items i ON i.id = o.item_id AND i.available
     JOIN divisions d ON d.id = i.division_id AND d.active
     WHERE o.active ORDER BY o.sort, o.id`);
  const out = [];
  for (const r of rows) {
    let price = null;
    if (r.size) price = (Array.isArray(r.sizes) ? r.sizes : []).find((s) => s.label === r.size)?.price ?? null;
    else if (!(Array.isArray(r.sizes) && r.sizes.length)) price = r.price;
    if (price === null || price === undefined) continue;
    out.push({
      id: r.id, itemId: r.item_id, size: r.size || undefined, price: Number(price),
      label: r.label || (r.size ? `${r.name} - ${r.size}` : r.name),
      lineName: r.size ? `${r.name} - ${r.size}` : r.name,
    });
  }
  return out;
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
export async function createOrder({ customerName, phone, address, notes, items, estimatedTotal, place, source, orderType = "delivery", etaMinutes = null, deliveryFee = 0, clientKey = null, run = null }) {
  await ensureSchema();
  const token = randomUUID(); // long and unguessable: the customer's tracking link
  const insert = (db) => db.query(
    `INSERT INTO orders (customer_name, phone, address, notes, items, estimated_total, track_token,
                         address_status, distance_km, lat, lng, source, order_type, eta_minutes, delivery_fee, client_key, run_date, run_time)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
     RETURNING id, created_at, track_token`,
    [customerName, phone, orderType === "pickup" ? null : address, notes || "", JSON.stringify(items), estimatedTotal, token,
     orderType === "pickup" ? null : place?.verified ? "verified" : "unverified", place?.distanceKm ?? null, place?.lat ?? null, place?.lng ?? null,
     source || null, orderType, etaMinutes, deliveryFee, clientKey, run?.date ?? null, run?.time ?? null]);
  if (!run) return (await insert(sql)).rows[0];

  // A delivery books a run. Checked and saved under one lock, so two customers can't both take the last place.
  return withLock(727002, async (db) => {
    const cfg = (await db.query("SELECT value FROM settings WHERE key = 'delivery'")).rows[0]?.value || {};
    const list = computeRuns({
      runs: normRuns(cfg.runs), dateStr: run.date, states: await loadRunStates(db, run.date), counts: await loadRunCounts(db, run.date),
      nowMinutes: adelaideNow().minutes, today: run.date, paused: cfg.mode === "closed",
    });
    const r = list.find((x) => x.time === run.time);
    const why = { cancelled: "That delivery run has been cancelled.", closed: "That delivery run has closed.", past: "That delivery run has closed.", full: "That delivery run just filled up.", paused: "Delivery is paused right now." };
    if (!r || r.status !== "open") throw Object.assign(new Error(`${r ? why[r.status] : "That delivery run isn't available."} Please choose another.`), { code: "RUN" });
    return (await insert(db)).rows[0];
  });
}

// The order a checkout attempt already created, shaped like the answer the customer gets.
export async function orderByClientKey(key) {
  await ensureSchema();
  if (!key) return null;
  const { rows } = await sql.query(
    "SELECT id, created_at, track_token, estimated_total, delivery_fee, order_type, eta_minutes FROM orders WHERE client_key = $1", [key]);
  const r = rows[0];
  if (!r) return null;
  const total = Number(r.estimated_total), fee = Number(r.delivery_fee || 0);
  return { id: r.id, created_at: r.created_at, total, subtotal: Math.round((total - fee) * 100) / 100, deliveryFee: fee, token: r.track_token, type: r.order_type || "delivery", etaMinutes: r.eta_minutes };
}

const numOrNull = (v) => (v === null || v === undefined ? null : Number(v));
const cleanOrder = (r) => ({ ...r, estimated_total: numOrNull(r.estimated_total), cash_collected: numOrNull(r.cash_collected), distance_km: numOrNull(r.distance_km), delivery_fee: numOrNull(r.delivery_fee) });

// Newest first. Tracking tokens never leave the server except to the customer who placed the order.
export async function getOrders(limit = 150) {
  await ensureSchema();
  const result = await sql.query(
    `SELECT o.id, o.created_at, o.customer_name, o.phone, o.address, o.notes, o.items, o.estimated_total, o.status,
            o.driver_id, d.name AS driver_name, o.accepted_at, o.ready_at, o.picked_up_at, o.delivered_at,
            o.cash_collected, o.cancel_reason, o.address_status, o.distance_km, o.source,
            o.order_type, o.eta_minutes, o.collected_at, o.delivery_fee, o.lat, o.lng,
            o.run_date::text AS run_date, o.run_time, COALESCE(rs.delay_min, 0) AS run_delay, COALESCE(rs.cancelled, FALSE) AS run_cancelled
     FROM orders o LEFT JOIN drivers d ON d.id = o.driver_id
     LEFT JOIN run_state rs ON rs.run_date = o.run_date AND rs.run_time = o.run_time
     ORDER BY o.created_at DESC LIMIT $1`, [limit]);
  return result.rows.map(cleanOrder);
}

// Staff-side status change. Records when each step happened. A pickup can't go "out for delivery"
// and a delivery can't be "collected".
export async function setOrderStatus(id, status, reason) {
  await ensureSchema();
  if (!STATUSES.includes(status)) throw new Error("Unknown status");
  const found = await sql.query("SELECT order_type FROM orders WHERE id = $1", [id]);
  if (!found.rows[0]) return false;
  if (!allowedStatuses(found.rows[0].order_type).includes(status)) throw new Error(`A ${found.rows[0].order_type} order can't be marked ${status.replace(/_/g, " ")}`);
  const stamp = {
    accepted: "accepted_at = COALESCE(accepted_at, NOW())",
    ready: "ready_at = COALESCE(ready_at, NOW())",
    out_for_delivery: "picked_up_at = COALESCE(picked_up_at, NOW())",
    delivered: "delivered_at = COALESCE(delivered_at, NOW())",
    collected: "collected_at = COALESCE(collected_at, NOW())",
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
  let groups; // loaded the first time a line needs it
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
    let name = it.name, base;
    if (Array.isArray(it.sizes) && it.sizes.length) {
      const s = it.sizes.find((x) => x.label === line.size);
      if (!s) throw new Error(`Please choose an option for ${it.name}`);
      name = `${it.name} - ${s.label}`;
      base = Number(s.price);
    } else if (it.price !== null) {
      base = Number(it.price);
    } else {
      throw new Error(`${it.name} has to be ordered in store`);
    }
    const extra = pickOptions(it, line.options, groups ??= await activeGroups());
    if (extra.labels.length) name = `${name} (${extra.labels.join(", ")})`;
    priced.push({ name, qty, price: Math.round((base + extra.price) * 100) / 100, ...(extra.labels.length ? { options: extra.labels } : {}) });
  }
  const total = priced.reduce((sum, l) => sum + l.price * l.qty, 0);
  return { items: priced, total: Math.round(total * 100) / 100 };
}

// Checks the extras a customer ticked against what staff set up for this item, and prices them.
// Anything that isn't offered for this item, is sold out, or breaks a "pick one" rule is refused.
function pickOptions(item, chosen, groups) {
  const ids = Array.isArray(chosen) ? [...new Set(chosen.map(String))].slice(0, 30) : [];
  const offered = groupsFor(item, groups);
  const labels = [];
  let price = 0;
  const used = new Set();
  for (const g of offered) {
    const mine = g.choices.filter((c) => ids.includes(c.id));
    if (mine.length > 1 && g.kind === "one") throw new Error(`Please choose only one ${g.name.toLowerCase()} for ${item.name}`);
    if (g.required && mine.length === 0) throw new Error(`Please choose an option for ${item.name}: ${g.name}`);
    for (const c of mine) {
      if (c.available === false) throw new Error(`${c.label} is no longer available`);
      labels.push(c.label);
      price += Number(c.price) || 0;
      used.add(c.id);
    }
  }
  if (ids.some((x) => !used.has(x))) throw new Error(`An extra you chose isn't available for ${item.name} any more`);
  return { labels, price };
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

const kindOf = (v) => {
  if (v !== "one" && v !== "many") throw new Error("Options type must be pick one or pick many");
  return v;
};
const textList = (v) => {
  if (!Array.isArray(v)) throw new Error("Options categories must be a list");
  return JSON.stringify([...new Set(v.map((x) => String(x).trim().slice(0, 60)).filter(Boolean))].slice(0, 60));
};
const idList = (v) => {
  if (!Array.isArray(v)) throw new Error("Options items must be a list");
  return JSON.stringify([...new Set(v.map(Number).filter(Number.isInteger))].slice(0, 500));
};
const choices = (v) => {
  if (!Array.isArray(v)) throw new Error("Options choices must be a list");
  if (v.length > 30) throw new Error("Options can have at most 30 choices");
  const seen = new Set();
  return JSON.stringify(
    v.map((c) => {
      const label = String(c.label ?? "").trim().slice(0, 40);
      if (!label) throw new Error("Every choice needs a name");
      let id = /^[a-z0-9-]{4,40}$/i.test(String(c.id ?? "")) && !seen.has(String(c.id)) ? String(c.id) : `o${randomUUID().slice(0, 8)}`;
      seen.add(id);
      return { id, label, price: money(c.price ?? 0) ?? 0, available: c.available !== false };
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
  option_groups: {
    table: "option_groups",
    fields: {
      name: [text(60), ""], kind: [kindOf, ""], required: [bool, ""], active: [bool, ""], sort: [int, ""],
      choices: [choices, "::jsonb"], categories: [textList, "::jsonb"], item_ids: [idList, "::jsonb"], except_item_ids: [idList, "::jsonb"],
    },
    required: ["name"],
    scope: null,
  },
  blocked_phones: {
    table: "blocked_phones",
    fields: { phone: [(v) => digitsOf(v) || null, ""] },
    required: ["phone"],
    scope: null,
  },
  offers: {
    table: "checkout_offers",
    fields: { item_id: [int, ""], size: [text(40), ""], label: [text(60), ""], active: [bool, ""], sort: [int, ""] },
    required: ["item_id"],
    scope: null,
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
  const cfg = await getDelivery();
  const dateStr = adelaideDate();
  const [avail, mine, today, pending, finishable] = await Promise.all([
    sql.query(`SELECT id, address, estimated_total, items, ready_at, run_date::text AS run_date, run_time FROM orders
               WHERE status = 'ready' AND driver_id IS NULL AND order_type = 'delivery' ORDER BY run_date, run_time, ready_at, id`),
    sql.query(`SELECT id, customer_name, phone, address, lat, lng, notes, items, estimated_total, delivery_fee, picked_up_at, run_time, stop_order FROM orders
               WHERE status = 'out_for_delivery' AND driver_id = $1 ORDER BY picked_up_at, id`, [driverId]),
    sql.query(`SELECT COUNT(*)::int AS deliveries, COALESCE(SUM(cash_collected), 0) AS cash FROM orders
               WHERE driver_id = $1 AND status = 'delivered' AND delivered_at >= ${TODAY}`, [driverId]),
    loadRunReadiness(sql, dateStr),
    sql.query("SELECT 1 FROM run_state WHERE started_by = $1 AND started_at IS NOT NULL AND finished_at IS NULL AND run_date = $2 LIMIT 1", [driverId, dateStr]),
  ]);
  const store = { lat: cfg.lat, lng: cfg.lng };
  const stops = mine.rows.map((o) => ({ ...o, estimated_total: Number(o.estimated_total), delivery_fee: numOrNull(o.delivery_fee), lat: numOrNull(o.lat), lng: numOrNull(o.lng) }));
  // The driver's own order wins if they set one for every stop; otherwise the shortest drive.
  const manual = stops.length > 0 && stops.every((o) => o.stop_order !== null);
  const plan = planRoute(store, stops);
  const order = manual ? stops.slice().sort((a, b) => a.stop_order - b.stop_order).map((o) => o.id) : plan.order;
  const ordered = order.map((id, k) => ({ ...stops.find((o) => o.id === id), stop: k + 1 }));
  return {
    // Before a driver takes an order they only see roughly where it's going, not the street or the customer.
    available: avail.rows.map((o) => ({
      id: o.id,
      area: String(o.address).includes(",") ? String(o.address).split(",").slice(1).join(",").trim() : "Local delivery",
      total: Number(o.estimated_total),
      itemCount: o.items.reduce((n, i) => n + i.qty, 0),
      ready_at: o.ready_at,
      run_time: o.run_time,
    })),
    mine: ordered,
    canFinish: finishable.rows.length > 0 && ordered.length === 0,
    route: { store, km: plan.km, manual, cash: Math.round(stops.reduce((n, o) => n + o.estimated_total, 0) * 100) / 100 },
    // today's runs that still have orders being made or waiting for a driver
    pending: Object.entries(pending).filter(([, r]) => r.ready || r.cooking).map(([time, r]) => ({ run_time: time, ready: r.ready, cooking: r.cooking })).sort((a, b) => a.run_time.localeCompare(b.run_time)),
    today: { deliveries: today.rows[0].deliveries, cash: Number(today.rows[0].cash) },
  };
}

// "Start run": the driver takes every ready order in today's run at once.
export async function startRun(driverId, runTime) {
  await ensureSchema();
  if (!TIME_OK.test(String(runTime))) throw new Error("Expected a run time");
  const date = adelaideDate();
  const { rows } = await sql.query(
    `UPDATE orders SET status = 'out_for_delivery', driver_id = $3, picked_up_at = NOW(), stop_order = NULL
     WHERE run_date = $1 AND run_time = $2 AND status = 'ready' AND driver_id IS NULL AND order_type = 'delivery' RETURNING id`,
    [date, runTime, driverId]);
  if (rows.length === 0) throw new Error("Expected orders that are ready in that run");
  await sql.query("INSERT INTO run_state (run_date, run_time) VALUES ($1, $2) ON CONFLICT DO NOTHING", [date, runTime]);
  await sql.query(
    "UPDATE run_state SET started_at = COALESCE(started_at, NOW()), started_by = $3, finished_at = NULL WHERE run_date = $1 AND run_time = $2",
    [date, runTime, driverId]);
  return rows.length;
}

// "Run finished": the driver is back. Only once nothing is left on the road.
export async function finishRun(driverId) {
  await ensureSchema();
  const left = await sql.query("SELECT COUNT(*)::int AS n FROM orders WHERE driver_id = $1 AND status = 'out_for_delivery'", [driverId]);
  if (left.rows[0].n > 0) throw new Error("Expected every order delivered first");
  const { rowCount } = await sql.query(
    "UPDATE run_state SET finished_at = NOW() WHERE started_by = $1 AND started_at IS NOT NULL AND finished_at IS NULL AND run_date = $2",
    [driverId, adelaideDate()]);
  return rowCount;
}

// The driver puts their stops in their own order (the list must be exactly the stops they're carrying).
export async function reorderStops(driverId, ids) {
  await ensureSchema();
  const { rows } = await sql.query("SELECT id FROM orders WHERE driver_id = $1 AND status = 'out_for_delivery'", [driverId]);
  const mine = rows.map((r) => r.id).sort((a, b) => a - b);
  const given = Array.isArray(ids) ? ids.map(Number) : [];
  if (given.length !== mine.length || [...given].sort((a, b) => a - b).some((v, k) => v !== mine[k])) throw new Error("Expected exactly the stops you are carrying");
  for (let k = 0; k < given.length; k++) await sql.query("UPDATE orders SET stop_order = $2 WHERE id = $1", [given[k], k + 1]);
  return true;
}

// Each of these is ONE statement that checks the order is in the right state,
// so two drivers (or a double tap) can never both succeed.
export async function claimOrder(orderId, driverId) {
  await ensureSchema();
  const { rowCount } = await sql.query(
    `UPDATE orders SET status = 'out_for_delivery', driver_id = $2, picked_up_at = NOW()
     WHERE id = $1 AND status = 'ready' AND driver_id IS NULL AND order_type = 'delivery'`, [orderId, driverId]);
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

// ---------------------------------------------------------------- delivery runs
async function loadRunStates(db, dateStr) {
  const { rows } = await db.query("SELECT run_time, delay_min, closed, cancelled, extra_cap, custom, started_at, finished_at FROM run_state WHERE run_date = $1", [dateStr]);
  return Object.fromEntries(rows.map((r) => [r.run_time, r]));
}

async function loadRunCounts(db, dateStr) {
  const { rows } = await db.query(
    `SELECT run_time, COUNT(*)::int AS n FROM orders
     WHERE run_date = $1 AND order_type = 'delivery' AND status <> 'cancelled' GROUP BY run_time`, [dateStr]);
  return Object.fromEntries(rows.map((r) => [r.run_time, r.n]));
}

// Per run on one day: how many delivery orders are ready, still being made, on the road, delivered.
async function loadRunReadiness(db, dateStr) {
  const { rows } = await db.query(
    `SELECT run_time,
            COUNT(*) FILTER (WHERE status = 'ready' AND driver_id IS NULL)::int AS ready,
            COUNT(*) FILTER (WHERE status IN ('new', 'accepted'))::int AS cooking,
            COUNT(*) FILTER (WHERE status = 'out_for_delivery')::int AS on_road,
            COUNT(*) FILTER (WHERE status = 'delivered')::int AS delivered
     FROM orders WHERE run_date = $1 AND order_type = 'delivery' GROUP BY run_time`, [dateStr]);
  return Object.fromEntries(rows.map((r) => [r.run_time, r]));
}

// Today's runs (or another date's) with spots left and whether each is still open to book.
export async function getRunBoard(date = new Date(), forDate = null) {
  await ensureSchema();
  const today = adelaideDate(date);
  const dateStr = forDate || today;
  const cfg = await getDelivery();
  const runs = computeRuns({
    runs: cfg.runs, dateStr, states: await loadRunStates(sql, dateStr), counts: await loadRunCounts(sql, dateStr),
    nowMinutes: adelaideNow(date).minutes, today, paused: cfg.mode === "closed",
  });
  const ready = await loadRunReadiness(sql, dateStr);
  const withState = runs.map((r) => {
    const x = ready[r.time] || { ready: 0, cooking: 0, on_road: 0, delivered: 0 };
    return { ...r, ready: x.ready, cooking: x.cooking, onRoad: x.on_road, delivered: x.delivered,
             readyToGo: x.ready > 0 && x.cooking === 0 && x.on_road === 0 };
  });
  const stateMap = await loadRunStates(sql, dateStr);
  for (const r of withState) {
    r.startedAt = stateMap[r.time]?.started_at || null;
    r.finishedAt = stateMap[r.time]?.finished_at || null;
  }
  return { date: dateStr, paused: cfg.mode === "closed", runs: withState, next: nextRunDay(cfg.runs, dateStr), store: { lat: cfg.lat, lng: cfg.lng } };
}

const TIME_OK = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_OK = /^\d{4}-\d{2}-\d{2}$/;

// Staff controls for one run on one day.
export async function runAction({ action, date, time, minutes }) {
  await ensureSchema();
  if (!DATE_OK.test(String(date)) || !TIME_OK.test(String(time))) throw new Error("Expected a run date and time");
  await sql.query("INSERT INTO run_state (run_date, run_time) VALUES ($1, $2) ON CONFLICT DO NOTHING", [date, time]);
  const m = Number(minutes);
  const set = async (sqlText, params = []) => { await sql.query(`UPDATE run_state SET ${sqlText} WHERE run_date = $1 AND run_time = $2`, [date, time, ...params]); };
  if (action === "delay") {
    if (!Number.isInteger(m) || m < -60 || m > 60) throw new Error("Expected a delay between -60 and 60 minutes");
    await set("delay_min = GREATEST(0, LEAST(120, delay_min + $3))", [m]);
  } else if (action === "close") await set("closed = TRUE");
  else if (action === "reopen") await set("closed = FALSE");
  else if (action === "cancel") await set("cancelled = TRUE");
  else if (action === "uncancel") await set("cancelled = FALSE");
  else if (action === "more") {
    if (!Number.isInteger(m) || m < 1 || m > 20) throw new Error("Expected between 1 and 20 extra places");
    await set("extra_cap = extra_cap + $3", [m]);
  } else if (action === "add") {
    const cfg = await getDelivery();
    if (cfg.runs.times[dayOf(date)].some((r) => r.time === time)) throw new Error("That run is already on the list");
    await set("custom = TRUE, cancelled = FALSE");
  } else throw new Error("Expected a run action");
  return getRunBoard(new Date(), date);
}

// Staff move a delivery order to another run on the same day. Staff may use a run that is full or closed.
export async function moveOrderToRun(orderId, time) {
  await ensureSchema();
  if (!TIME_OK.test(String(time))) throw new Error("Expected a run time");
  const { rows } = await sql.query("SELECT run_date::text AS run_date, order_type, status FROM orders WHERE id = $1", [orderId]);
  const o = rows[0];
  if (!o) return false;
  if (o.order_type !== "delivery" || !["new", "accepted", "ready"].includes(o.status)) throw new Error("Expected a delivery order that hasn't left yet");
  const date = o.run_date || adelaideDate();
  const board = await getRunBoard(new Date(), date);
  const r = board.runs.find((x) => x.time === time);
  if (!r || r.cancelled) throw new Error("Expected a run that isn't cancelled");
  await sql.query("UPDATE orders SET run_date = $2, run_time = $3 WHERE id = $1", [orderId, date, time]);
  return true;
}

// ---------------------------------------------------------------- customer tracking
export async function trackOrder(token) {
  await ensureSchema();
  const { rows } = await sql.query(
    `SELECT o.id, o.status, o.created_at, o.accepted_at, o.ready_at, o.picked_up_at, o.delivered_at,
            o.order_type, o.eta_minutes, o.collected_at,
            o.estimated_total, o.cancel_reason, d.name AS driver_name,
            o.run_date::text AS run_date, o.run_time, COALESCE(rs.delay_min, 0) AS run_delay
     FROM orders o LEFT JOIN drivers d ON d.id = o.driver_id
     LEFT JOIN run_state rs ON rs.run_date = o.run_date AND rs.run_time = o.run_time
     WHERE o.track_token = $1`, [token]);
  return rows[0] ? { ...rows[0], estimated_total: Number(rows[0].estimated_total) } : null;
}


// ---------------------------------------------------------------- delivery area
// Approximate centre of Macclesfield until the store sets its exact spot in the dashboard.
const DEFAULT_DELIVERY = {
  lat: -35.1667, lng: 138.85, radiusKm: 5, enforce: true, located: false,
  mode: "schedule", // "schedule" = follow the weekly times; "open" / "closed" = manual override
  runs: DEFAULT_RUNS, // the delivery runs; the weekly "window" (schedule) is worked out from these
  feeBase: 8, // delivery fee in dollars
  farKm: null, feeFar: null, // optional higher fee beyond farKm
  minOrder: 0, // minimum food total for a delivery order (0 = none)
  freeOver: null, // food total that earns free delivery (null = never)
};

export async function getDelivery() {
  await ensureSchema();
  const { rows } = await sql.query("SELECT value FROM settings WHERE key = 'delivery'");
  const saved = rows[0]?.value || {};
  const runs = normRuns(saved.runs);
  return { ...DEFAULT_DELIVERY, ...saved, runs, schedule: deriveSchedule(runs) };
}

let deliveryCache = null;

// A week of opening windows, Monday first: null (closed) or { open: "16:00", close: "20:00" }.
function validSchedule(schedule, who) {
  if (!Array.isArray(schedule) || schedule.length !== 7) throw new Error(`${who} times need all seven days`);
  const ok = /^([01]\d|2[0-3]):[0-5]\d$/;
  return schedule.map((w) => {
    if (!w) return null;
    if (!ok.test(String(w.open)) || !ok.test(String(w.close))) throw new Error(`${who} times must look like 16:00`);
    if (toMinutes(w.close) <= toMinutes(w.open)) throw new Error(`${who} must finish after it starts`);
    return { open: w.open, close: w.close };
  });
}

export async function saveDelivery(patch) {
  const current = await getDelivery();
  const next = { ...current };
  if (patch.radiusKm !== undefined) {
    const r = Number(patch.radiusKm);
    if (!Number.isFinite(r) || r < 0.5 || r > 100) throw new Error("Radius must be between 0.5 and 100 km");
    next.radiusKm = Math.round(r * 10) / 10;
  }
  if (patch.enforce !== undefined) next.enforce = Boolean(patch.enforce);
  if (patch.lat !== undefined || patch.lng !== undefined) {
    const lat = Number(patch.lat), lng = Number(patch.lng);
    if (!(lat >= -44 && lat <= -9 && lng >= 112 && lng <= 154)) throw new Error("That location isn't in Australia");
    next.lat = lat; next.lng = lng; next.located = true;
  }
  if (patch.mode !== undefined) {
    if (!["schedule", "open", "closed"].includes(patch.mode)) throw new Error("Delivery mode must be schedule, open or closed");
    next.mode = patch.mode;
  }
  if (patch.runs !== undefined) next.runs = validRuns(patch.runs);
  delete next.schedule; // worked out from the runs whenever it is read
  // delivery fee: blank or null clears the optional ones
  const optional = (v) => (v === null || v === undefined || v === "" ? null : Number(v));
  const dollars = (v, max, what) => {
    if (!Number.isFinite(v) || v < 0 || v > max) throw new Error(`Delivery ${what} must be between $0 and $${max}`);
    return Math.round(v * 100) / 100;
  };
  if (patch.feeBase !== undefined) next.feeBase = dollars(Number(patch.feeBase), 100, "fee");
  if (patch.minOrder !== undefined) next.minOrder = dollars(Number(patch.minOrder || 0), 1000, "minimum order");
  if (patch.freeOver !== undefined) {
    const v = optional(patch.freeOver);
    next.freeOver = v === null ? null : dollars(v, 1000, "free-delivery amount");
  }
  if (patch.farKm !== undefined || patch.feeFar !== undefined) {
    const km = optional(patch.farKm ?? next.farKm), fee = optional(patch.feeFar ?? next.feeFar);
    if ((km === null) !== (fee === null)) throw new Error("Delivery far-away fee needs both a distance and a fee, or neither");
    if (km !== null && (!Number.isFinite(km) || km < 0.5 || km > 100)) throw new Error("Delivery far-away distance must be between 0.5 and 100 km");
    next.farKm = km === null ? null : Math.round(km * 10) / 10;
    next.feeFar = fee === null ? null : dollars(fee, 100, "far-away fee");
  }
  await sql.query(
    "INSERT INTO settings (key, value) VALUES ('delivery', $1::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
    [JSON.stringify(next)]);
  deliveryCache = null;
  return next;
}

// ---------------------------------------------------------------- pickup times
export async function getPickup() {
  await ensureSchema();
  const { rows } = await sql.query("SELECT value FROM settings WHERE key = 'pickup'");
  return { ...DEFAULT_PICKUP, ...(rows[0]?.value || {}) };
}

export async function savePickup(patch) {
  const next = { ...(await getPickup()) };
  if (patch.mode !== undefined) {
    if (!["schedule", "open", "closed"].includes(patch.mode)) throw new Error("Pickup mode must be schedule, open or closed");
    next.mode = patch.mode;
  }
  if (patch.prepMinutes !== undefined) {
    const n = Number(patch.prepMinutes);
    if (!Number.isInteger(n) || n < 1 || n > 180) throw new Error("Pickup prep time must be 1 to 180 minutes");
    next.prepMinutes = n;
  }
  if (patch.lastOrderMinutes !== undefined) {
    const n = Number(patch.lastOrderMinutes);
    if (!Number.isInteger(n) || n < 0 || n > 120) throw new Error("Pickup last-order time must be 0 to 120 minutes");
    next.lastOrderMinutes = n;
  }
  if (patch.schedule !== undefined) next.schedule = validSchedule(patch.schedule, "Pickup");
  await sql.query(
    "INSERT INTO settings (key, value) VALUES ('pickup', $1::jsonb) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
    [JSON.stringify(next)]);
  deliveryCache = null;
  return next;
}

// The same settings, remembered for a few seconds. Used by the pages every visitor sees
// (footer, home, layout) so they don't each hit the database.
export async function getDeliveryCached() {
  return (await getOrderingCached()).delivery;
}

export async function getOrderingCached() {
  if (deliveryCache && Date.now() - deliveryCache.at < 20000) return deliveryCache.value;
  const [delivery, pickup] = await Promise.all([getDelivery(), getPickup()]);
  const value = { delivery, pickup };
  deliveryCache = { at: Date.now(), value };
  return value;
}

// Only what the browser needs to show hours and block the Add buttons.
export const publicDelivery = (d) => ({
  mode: d.mode, schedule: d.schedule, radiusKm: d.radiusKm,
  runs: { times: d.runs.times.map((day) => day.map((r) => r.time)), cutoffMinutes: d.runs.cutoffMinutes, windowMinutes: d.runs.windowMinutes },
  feeBase: d.feeBase, farKm: d.farKm, feeFar: d.feeFar, minOrder: d.minOrder, freeOver: d.freeOver,
});
export const publicOrdering = ({ delivery, pickup }) => ({
  delivery: publicDelivery(delivery),
  pickup: { mode: pickup.mode, schedule: pickup.schedule, prepMinutes: pickup.prepMinutes, lastOrderMinutes: pickup.lastOrderMinutes },
});

// Phone numbers compared by digits only, so "0400 123 456" and "0400123456" are the same number.
export const digitsOf = (v) => String(v ?? "").replace(/\D/g, "").slice(0, 20);

export async function isPhoneBlocked(phone) {
  await ensureSchema();
  const key = digitsOf(phone);
  if (!key) return false;
  const { rows } = await sql.query("SELECT 1 FROM blocked_phones WHERE phone = $1", [key]);
  return rows.length > 0;
}

// How many of this phone's orders are still waiting for staff to accept.
export async function waitingOrdersFor(phone) {
  await ensureSchema();
  const { rows } = await sql.query(
    "SELECT COUNT(*)::int AS n FROM orders WHERE status = 'new' AND regexp_replace(phone, '\\D', '', 'g') = $1", [digitsOf(phone)]);
  return rows[0].n;
}

// Staff pressed "Spam": cancel the order and block its phone number.
export async function markSpam(orderId) {
  await ensureSchema();
  const { rows } = await sql.query("SELECT phone FROM orders WHERE id = $1", [orderId]);
  if (!rows[0]) return false;
  await sql.query("UPDATE orders SET status = 'cancelled', cancel_reason = 'Spam' WHERE id = $1", [orderId]);
  const key = digitsOf(rows[0].phone);
  if (key) await sql.query("INSERT INTO blocked_phones (phone) VALUES ($1) ON CONFLICT (phone) DO NOTHING", [key]);
  return true;
}

// At most `max` calls per `minutes` for a key (an address, a person...). Returns true if allowed.
export async function allowHit(key, max, minutes) {
  await ensureSchema();
  await sql.query("DELETE FROM rate_hits WHERE at < NOW() - INTERVAL '1 hour'");
  const { rows } = await sql.query(
    `SELECT COUNT(*)::int AS n FROM rate_hits WHERE key = $1 AND at > NOW() - ($2 || ' minutes')::interval`, [key, String(minutes)]);
  if (rows[0].n >= max) return false;
  await sql.query("INSERT INTO rate_hits (key) VALUES ($1)", [key]);
  return true;
}

// Look an address up (cached for 30 days so the free service isn't hit twice for the same text).
export async function findAddress(text) {
  await ensureSchema();
  const q = normalizeQuery(text);
  if (q.length < 4) return { results: [] };
  const cached = await sql.query("SELECT results FROM address_cache WHERE query = $1 AND created_at > NOW() - INTERVAL '30 days'", [q]);
  if (cached.rows[0]) return { results: cached.rows[0].results, cached: true };
  if (Math.random() < 0.02) await sql.query("DELETE FROM address_cache WHERE created_at < NOW() - INTERVAL '30 days'");
  const here = await getDelivery();
  const results = await lookupAddress(text, here);
  if (results.length) {
    await sql.query(
      `INSERT INTO address_cache (query, results) VALUES ($1, $2::jsonb)
       ON CONFLICT (query) DO UPDATE SET results = EXCLUDED.results, created_at = NOW()`, [q, JSON.stringify(results)]);
  }
  return { results };
}
