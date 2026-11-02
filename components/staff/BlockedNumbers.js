"use client";

import { useEffect, useState } from "react";
import { api } from "@/components/staff/api";
import { btn } from "@/components/staff/Bits";

// Phone numbers staff marked as spam on the Orders screen. Remove one to let that number order again.
export default function BlockedNumbers() {
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api("blocked_phones", "GET").then((d) => setRows(d.rows)).catch((e) => setMsg(e.message));
  }, []);

  async function unblock(id) {
    try {
      await api("blocked_phones", "DELETE", null, `?id=${id}`);
      setRows((rs) => rs.filter((r) => r.id !== id));
    } catch (e) {
      setMsg(e.message);
    }
  }

  return (
    <section className="mt-6 rounded-3xl border-2 border-ink/15 bg-canvas-light p-5 space-y-3">
      <h2 className="font-display font-900 text-xl">Blocked phone numbers</h2>
      <p className="text-sm text-ink/70">Numbers marked as spam. They can't order online. Press Unblock if one was a mistake.</p>
      {rows === null ? <p className="text-sm text-ink/50">Loading...</p> : rows.length === 0 ? (
        <p className="text-sm text-ink/50">None.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3">
              <span className="font-mono">{r.phone}</span>
              <button onClick={() => unblock(r.id)} className={`${btn} border border-ink/25`}>Unblock</button>
            </li>
          ))}
        </ul>
      )}
      {msg && <p role="alert" className="text-rust text-sm">{msg}</p>}
    </section>
  );
}
