// The life of an order. Shared by the server and the staff/driver screens.
// "fulfilled" is what the very first version of the site wrote; it counts as delivered.
//
//   delivery: new -> accepted -> ready -> out_for_delivery -> delivered
//   pickup:   new -> accepted -> ready -> collected
export const STATUSES = ["new", "accepted", "ready", "out_for_delivery", "delivered", "collected", "cancelled"];
export const ORDER_TYPES = ["delivery", "pickup"];

export const LABEL = {
  new: "New",
  accepted: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  fulfilled: "Delivered",
  collected: "Collected",
  cancelled: "Cancelled",
};

// "Ready" means different things: waiting for a driver, or waiting for the customer.
export const labelFor = (status, type) =>
  status === "ready" ? (type === "pickup" ? "Ready to collect" : "Ready for driver") : LABEL[status] || status;

export const isDone = (s) => s === "delivered" || s === "fulfilled" || s === "collected" || s === "cancelled";

// Which steps are allowed for which kind of order (a pickup is never "out for delivery").
export const allowedStatuses = (type) =>
  type === "pickup" ? ["new", "accepted", "ready", "collected", "cancelled"] : ["new", "accepted", "ready", "out_for_delivery", "delivered", "cancelled"];
