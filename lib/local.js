// Things kept on the customer's own phone (no accounts yet).
const read = (key, fallback) => {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage blocked: the app still works, it just won't remember
  }
};

export const loadProfile = () => read("maccy-profile", {});
export const saveProfile = (p) => write("maccy-profile", { name: p.name || "", phone: p.phone || "", address: p.address || "" });
export const loadOrders = () => read("maccy-orders", []);
export function rememberOrder(order) {
  write("maccy-orders", [order, ...loadOrders()].slice(0, 20));
}
