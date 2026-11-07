// Opening hours and delivery times, in the shop's own time zone (Adelaide, daylight saving included).
// Used on the server (to refuse orders at the wrong time) and in the browser (to show status).
// Days are numbered 0 = Monday ... 6 = Sunday.
import { SHOP } from "@/lib/site";

export const TZ = "Australia/Adelaide";
export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Fri, Sat and Sun: first run leaves 4:30pm, last 7:30pm, arriving by 8pm (matches the default delivery runs in lib/runs.js).
export const DEFAULT_SCHEDULE = [null, null, null, null, { open: "16:30", close: "20:00" }, { open: "16:30", close: "20:00" }, { open: "16:30", close: "20:00" }];

export const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
};

// "16:00" -> "4pm", "06:30" -> "6:30am"
export function fmtTime(hhmm) {
  const mins = typeof hhmm === "number" ? hhmm : toMinutes(hhmm);
  const h = Math.floor(mins / 60), m = mins % 60;
  const hour = ((h + 11) % 12) + 1;
  return `${hour}${m ? `:${String(m).padStart(2, "0")}` : ""}${h >= 12 && h < 24 ? "pm" : "am"}`;
}

// What day and minute is it in Adelaide right now?
export function adelaideNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-AU", { timeZone: TZ, weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(date);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  const day = DAY_SHORT.indexOf(get("weekday"));
  return { day: day === -1 ? 0 : day, minutes: (Number(get("hour")) % 24) * 60 + Number(get("minute")) };
}

// "Fri to Sun, 4pm to 8pm"  (groups days that share the same window)
export function describeWindows(windowsByDay) {
  const groups = new Map();
  windowsByDay.forEach((w, d) => {
    if (!w) return;
    const key = `${w.open}-${w.close}`;
    groups.set(key, { w, days: [...(groups.get(key)?.days || []), d] });
  });
  const dayList = (days) => {
    const runs = [];
    for (const d of days) {
      const last = runs[runs.length - 1];
      if (last && d === last[last.length - 1] + 1) last.push(d); else runs.push([d]);
    }
    // "Fri to Sun" for 3+ in a row, "Fri & Sat" for two, and "Tue & Thu" / "Mon, Wed & Fri" for gaps
    const parts = runs.map((r) => (r.length >= 3 ? `${DAY_SHORT[r[0]]} to ${DAY_SHORT[r[r.length - 1]]}` : r.map((d) => DAY_SHORT[d]).join(" & ")));
    return parts.length <= 1 ? parts[0] : `${parts.slice(0, -1).join(", ")} & ${parts[parts.length - 1]}`;
  };
  return [...groups.values()].map(({ w, days }) => ({ days: dayList(days), time: `${fmtTime(w.open)} to ${fmtTime(w.close)}`, text: `${dayList(days)}, ${fmtTime(w.open)} to ${fmtTime(w.close)}` }));
}

// Dine-in hours as a day-by-day array, from SHOP.hours.
export const storeWindows = () => {
  const out = Array(7).fill(null);
  for (const h of SHOP.hours) for (const d of h.days) out[d] = { open: h.open, close: h.close };
  return out;
};
export const storeHoursLines = () => describeWindows(storeWindows());

// cutoff = stop taking orders this many minutes before the window ends (pickup uses it).
function stateFor(windows, now, labelNoun, cutoff = 0) {
  const lastOrder = (w) => toMinutes(w.close) - cutoff;
  const w = windows[now.day];
  if (w && now.minutes >= toMinutes(w.open) && now.minutes < lastOrder(w)) {
    return { open: true, closesAt: fmtTime(lastOrder(w)), window: w };
  }
  // find the next time it opens
  for (let offset = 0; offset <= 7; offset++) {
    const day = (now.day + offset) % 7;
    const nw = windows[day];
    if (!nw || toMinutes(nw.open) >= lastOrder(nw)) continue;
    if (offset === 0 && now.minutes >= toMinutes(nw.open)) continue; // today's window already over
    const when = offset === 0 ? "today" : offset === 1 ? "tomorrow" : DAY_NAMES[day];
    return { open: false, next: { day, when, at: fmtTime(nw.open), text: `${when} at ${fmtTime(nw.open)}` } };
  }
  return { open: false, next: null, labelNoun };
}

export const storeState = (date = new Date()) => stateFor(storeWindows(), adelaideNow(date), "store");

// mode: "schedule" follows the weekly times; "open" and "closed" are manual overrides set in Settings.
// Works for delivery and for pickup (pickup also has lastOrderMinutes: stop taking orders that long before closing).
export function serviceState(cfg, date = new Date()) {
  const mode = cfg?.mode || "schedule";
  const windows = cfg?.schedule || DEFAULT_SCHEDULE;
  if (mode === "open") return { open: true, manual: true, closesAt: null };
  if (mode === "closed") return { open: false, paused: true, next: null };
  return stateFor(windows, adelaideNow(date), "service", Number(cfg?.lastOrderMinutes) || 0);
}
export const deliveryState = serviceState;
export const pickupState = serviceState;

// "Fri to Sun, 4pm to 8pm" for printing and short messages ("Paused" if switched off).
export function deliveryText(delivery) {
  if (delivery?.mode === "closed") return "paused for now";
  return describeWindows(delivery?.schedule || DEFAULT_SCHEDULE).map((l) => l.text).join(" and ") || "at set times";
}

// Pickup: Fri to Sun whenever the shop is open; Mon to Thu (no delivery) until 6pm. Settings can change it.
const pickupWindows = () => storeWindows().map((w, d) => (w && d <= 3 ? { ...w, close: "18:00" } : w));
export const DEFAULT_PICKUP = { mode: "schedule", schedule: pickupWindows(), prepMinutes: 15, lastOrderMinutes: 15 };

// "Mon to Thu, 6:30am to 6:30pm and Fri to Sun, 6:30am to 8pm" for pickup
export function pickupText(pickup) {
  if (pickup?.mode === "closed") return "paused for now";
  return describeWindows(pickup?.schedule || DEFAULT_PICKUP.schedule).map((l) => l.text).join(" and ") || "at set times";
}
