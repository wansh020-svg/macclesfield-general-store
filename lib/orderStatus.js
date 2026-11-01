// The life of an order. Shared by the server and the staff/driver screens.
// "fulfilled" is what the very first version of the site wrote; it counts as delivered.
export const STATUSES = ["new", "accepted", "ready", "out_for_delivery", "delivered", "cancelled"];

export const LABEL = {
  new: "New",
  accepted: "Preparing",
  ready: "Ready for driver",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  fulfilled: "Delivered",
  cancelled: "Cancelled",
};

export const isDone = (s) => s === "delivered" || s === "fulfilled" || s === "cancelled";
