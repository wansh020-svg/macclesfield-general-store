"use client";

import { createContext, useContext, useEffect, useState } from "react";

const CartContext = createContext(null);

// A cart line: { key, name, price, qty, itemId | dealId, size? }
// The price shown here is for display only; the server prices the order itself.
export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("maccy-cart") || "[]");
      // Carts saved by the old site have no item ids and can't be ordered; drop them.
      setItems(saved.filter((i) => i.key && (i.itemId || i.dealId)));
    } catch (e) {
      // ignore corrupted cart data
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      try {
        localStorage.setItem("maccy-cart", JSON.stringify(items));
      } catch (e) {
        // storage can be blocked (private mode); the cart still works for this visit
      }
    }
  }, [items, loaded]);

  function addItem(item, qty = 1) {
    setItems((prev) => {
      const existing = prev.find((i) => i.key === item.key);
      if (existing) return prev.map((i) => (i.key === item.key ? { ...i, qty: i.qty + qty } : i));
      return [...prev, { ...item, qty }];
    });
  }

  function removeItem(key) {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }

  function updateQty(key, qty) {
    if (qty <= 0) return removeItem(key);
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, qty } : i)));
  }

  function clearCart() {
    setItems([]);
  }

  const total = items.reduce((sum, i) => sum + (i.price || 0) * i.qty, 0);
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
