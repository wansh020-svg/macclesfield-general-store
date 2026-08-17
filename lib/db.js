import { sql } from "@vercel/postgres";

export async function ensureTable() {
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
    )
  `;
}

export async function createOrder({ customerName, phone, address, notes, items, estimatedTotal }) {
  await ensureTable();
  const result = await sql`
    INSERT INTO orders (customer_name, phone, address, notes, items, estimated_total)
    VALUES (${customerName}, ${phone}, ${address}, ${notes || ""}, ${JSON.stringify(items)}, ${estimatedTotal})
    RETURNING id, created_at
  `;
  return result.rows[0];
}

export async function getOrders() {
  await ensureTable();
  const result = await sql`SELECT * FROM orders ORDER BY created_at DESC`;
  return result.rows;
}

export async function markOrderStatus(id, status) {
  await sql`UPDATE orders SET status = ${status} WHERE id = ${id}`;
}
