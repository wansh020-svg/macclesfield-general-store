// Postgres access through the standard `pg` driver.
//
// This replaces @vercel/postgres, which refuses direct (non-pooled) connection
// strings. `pg` works with any normal Postgres URL, so whatever Vercel put in
// POSTGRES_URL (Neon, Prisma Postgres, Supabase...) is fine.
import { Pool } from "pg";

// `sslmode=require` (and prefer / verify-ca) already behave as `verify-full` in this driver, but a future version
// will weaken them and today it prints a warning on every start. Say what we mean, so nothing changes and the
// warning goes away.
function strictSsl(url) {
  return url.replace(/([?&]sslmode=)(require|prefer|verify-ca)(?=&|$)/, "$1verify-full");
}

function connectionString() {
  // Prefer POSTGRES_URL; ignore prisma+postgres:// (that one is for Prisma's own client).
  for (const name of ["POSTGRES_URL", "DATABASE_URL", "POSTGRES_URL_NON_POOLING"]) {
    const v = process.env[name];
    if (v && /^postgres(ql)?:\/\//.test(v)) return strictSsl(v);
  }
  throw new Error("No Postgres connection string found (expected POSTGRES_URL).");
}

function pool() {
  // One pool per server instance, kept across requests.
  if (!globalThis.__maccyPool) {
    globalThis.__maccyPool = new Pool({
      connectionString: connectionString(),
      max: Number(process.env.PG_POOL_MAX) || 2, // small: every serverless instance has its own pool
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 8000,
    });
    globalThis.__maccyPool.on("error", (err) => console.error("Postgres pool error:", err.message));
  }
  return globalThis.__maccyPool;
}

// sql`SELECT * FROM t WHERE id = ${id}`  (values become $1, $2... parameters)
export function sql(strings, ...values) {
  let text = strings[0];
  for (let i = 0; i < values.length; i++) text += `$${i + 1}${strings[i + 1]}`;
  return pool().query(text, values);
}

// sql.query("SELECT * FROM t WHERE id = $1", [id])
sql.query = (text, values = []) => pool().query(text, values);

// Run fn(db) while holding a Postgres advisory lock, so only one server instance
// does one-time setup (creating tables, seeding the menu) at a time.
export async function withLock(key, fn) {
  const client = await pool().connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [key]);
    return await fn(client);
  } finally {
    try {
      await client.query("SELECT pg_advisory_unlock($1)", [key]);
    } finally {
      client.release();
    }
  }
}
