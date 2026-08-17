"use client";

import { useState } from "react";

export default function OrdersList({ initialOrders }) {
  const [orders, setOrders] = useState(initialOrders);

  async function markFulfilled(id) {
    await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "fulfilled" }),
    });
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status: "fulfilled" } : o)));
  }

  if (orders.length === 0) {
    return <p className="text-ink/60">No orders yet.</p>;
  }

  return (
    <div className="space-y-6">
      {orders.map((order) => (
        <div
          key={order.id}
          className={`border p-6 ${order.status === "fulfilled" ? "border-ink/10 opacity-50" : "border-ink/20"}`}
        >
          <div className="flex justify-between items-start mb-3 gap-4">
            <div>
              <p className="font-display font-700 text-lg">{order.customer_name}</p>
              <p className="text-ink/60 text-sm">
                {order.phone} &middot; {order.address}
              </p>
            </div>
            <span className="font-mono text-xs uppercase tracking-widest text-ink/50 whitespace-nowrap">
              {new Date(order.created_at).toLocaleString()}
            </span>
          </div>

          <ul className="text-sm text-ink/80 mb-3 space-y-1">
            {order.items.map((item, i) => (
              <li key={i}>
                {item.qty} &times; {item.name}
              </li>
            ))}
          </ul>

          {order.notes && <p className="text-ink/60 text-sm italic mb-3">Note: {order.notes}</p>}

          <div className="flex items-center justify-between">
            <span className="font-mono text-sm">
              Est. total: ${Number(order.estimated_total || 0).toFixed(2)}
            </span>
            {order.status !== "fulfilled" ? (
              <button
                onClick={() => markFulfilled(order.id)}
                className="bg-pine text-canvas-light font-mono text-xs uppercase tracking-widest px-4 py-2 hover:bg-pine-dark transition-colors"
              >
                Mark Fulfilled
              </button>
            ) : (
              <span className="font-mono text-xs uppercase tracking-widest text-pine">Fulfilled</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
