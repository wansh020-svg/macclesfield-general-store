// Delivery runs: the driver leaves at set times, customers book a run, each run has a limit.
// Pure functions shared by the server (to enforce the rules) and the browser (to show them).
// Days are numbered 0 = Monday ... 6 = Sunday, times are Adelaide time.
import { DAY_NAMES, TZ, adelaideNow, fmtTime, toMinutes } from "@/lib/hours";

const hhmm = (mins) => `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
const TIME_OK = /^([01]\d|2[0-3]):[0-5]\d$/;
const FRI_TO_SUN = ["16:30", "17:30", "18:30", "19:30"].map((time) => ({ time, cap: null }));

// Starting runs: Fri, Sat, Sun at 4:30, 5:30, 6:30 and 7:30pm, five orders each, orders close 30 minutes before.
export const DEFAULT_RUNS = {
  times: [[], [], [], [], FRI_TO_SUN, FRI_TO_SUN, FRI_TO_SUN],
  capacity: 5,       // orders per run, unless a run has its own limit
  cutoffMinutes: 30, // a run stops taking orders this long before it leaves
  windowMinutes: 30, // how wide the arrival window is
};

const int = (v, lo, hi, what) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < lo || n > hi) throw new Error(`Delivery runs: ${what} must be a whole number from ${lo} to ${hi}`);
  return n;
};

// Check and tidy what staff typed. Throws a plain-English Error.
export function validRuns(input) {
  if (!input || !Array.isArray(input.times) || input.times.length !== 7) throw new Error("Delivery runs need all seven days");
  const times = input.times.map((day) => {
    if (!Array.isArray(day)) throw new Error("Delivery runs: each day needs a list of times");
    if (day.length > 12) throw new Error("Delivery runs: at most 12 runs a day");
    const seen = new Set();
    return day
      .map((r) => {
        const time = typeof r === "string" ? r : r?.time;
        if (!TIME_OK.test(String(time))) throw new Error("Delivery runs: times must look like 17:30");
        if (seen.has(time)) throw new Error(`Delivery runs: ${fmtTime(time)} is listed twice on one day`);
        seen.add(time);
        const cap = typeof r === "object" && r?.cap !== null && r?.cap !== undefined && r?.cap !== "" ? int(r.cap, 1, 50, "a run's order limit") : null;
        return { time, cap };
      })
      .sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  });
  return {
    times,
    capacity: int(input.capacity, 1, 50, "orders per run"),
    cutoffMinutes: int(input.cutoffMinutes, 0, 240, "the cutoff"),
    windowMinutes: int(input.windowMinutes, 10, 120, "the arrival window"),
  };
}

// Saved settings might be missing or older: always return a complete, valid set.
export function normRuns(saved) {
  try {
    return validRuns({ ...DEFAULT_RUNS, ...(saved || {}) });
  } catch {
    return DEFAULT_RUNS;
  }
}

// The delivery "window" shown on the site and print pieces: first departure to last departure plus the window.
export function deriveSchedule(runs) {
  return runs.times.map((day) => {
    if (!day.length) return null;
    const open = toMinutes(day[0].time);
    const close = Math.min(toMinutes(day[day.length - 1].time) + runs.windowMinutes, 23 * 60 + 59);
    return { open: hhmm(open), close: hhmm(close) };
  });
}

// "2026-11-06" for today in Adelaide
export const adelaideDate = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

// Monday = 0 for a "YYYY-MM-DD" string
export const dayOf = (dateStr) => (new Date(`${dateStr}T00:00:00Z`).getUTCDay() + 6) % 7;

export const addDays = (dateStr, n) => new Date(new Date(`${dateStr}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);

// "about 5:45pm to 6:15pm" for a run leaving at `time` (plus any delay)
export function arrivalText(time, delay, windowMinutes) {
  const dep = toMinutes(time) + (delay || 0);
  return `${fmtTime(dep + 15)} to ${fmtTime(dep + 15 + windowMinutes)}`;
}

// The runs for one date, with their state. `states` is a map of time -> { delay_min, closed, cancelled, extra_cap, custom },
// `counts` a map of time -> orders booked. Staff-added runs (custom) come from `states`.
export function computeRuns({ runs, dateStr, states = {}, counts = {}, nowMinutes = null, today = null, paused = false }) {
  const configured = runs.times[dayOf(dateStr)].map((r) => ({ time: r.time, cap: r.cap, custom: false }));
  const extra = Object.entries(states).filter(([t, s]) => s.custom && !configured.some((c) => c.time === t)).map(([time]) => ({ time, cap: null, custom: true }));
  return [...configured, ...extra]
    .sort((a, b) => toMinutes(a.time) - toMinutes(b.time))
    .map((r) => {
      const s = states[r.time] || {};
      const delay = s.delay_min || 0;
      const cap = (r.cap ?? runs.capacity) + (s.extra_cap || 0);
      const used = counts[r.time] || 0;
      const departs = toMinutes(r.time) + delay;
      const closesAt = departs - runs.cutoffMinutes;
      const past = today !== null && dateStr === today && nowMinutes !== null && nowMinutes >= closesAt;
      const before = today !== null && dateStr < today;
      let status = "open";
      if (s.cancelled) status = "cancelled";
      else if (paused) status = "paused";
      else if (past || before) status = "past";
      else if (s.closed) status = "closed";
      else if (used >= cap) status = "full";
      return {
        time: r.time, label: fmtTime(r.time), custom: r.custom, delay, cap, used, left: Math.max(0, cap - used), status,
        departs: fmtTime(departs), arrives: arrivalText(r.time, delay, runs.windowMinutes), closed: Boolean(s.closed), cancelled: Boolean(s.cancelled),
      };
    });
}

// The next day (after `dateStr`) that has any runs: { day: "Friday", label: "4:30pm" } or null
export function nextRunDay(runs, dateStr) {
  for (let i = 1; i <= 7; i++) {
    const d = addDays(dateStr, i);
    const first = runs.times[dayOf(d)][0];
    if (first) return { day: DAY_NAMES[dayOf(d)], label: fmtTime(first.time) };
  }
  return null;
}

export { adelaideNow };

const timeOf = (r) => (typeof r === "string" ? r : r.time);

// Is delivery bookable today (ignoring how full each run is)? Same answer shape as serviceState() in lib/hours.js,
// so the status chips and banners work unchanged. Customers can book any run for today, from the morning,
// until the last run's cutoff has passed.
export function runsServiceState(delivery, date = new Date()) {
  if (delivery?.mode === "closed") return { open: false, paused: true, next: null };
  const runs = delivery?.runs;
  if (!runs) return { open: false, next: null };
  const now = adelaideNow(date);
  const cut = Number(runs.cutoffMinutes) || 0;
  const today = (runs.times[now.day] || []).map(timeOf);
  const last = today.length ? toMinutes(today[today.length - 1]) - cut : null;
  if (last !== null && now.minutes < last) return { open: true, closesAt: fmtTime(last) };
  for (let offset = last !== null && now.minutes < last ? 0 : 1; offset <= 7; offset++) {
    const day = (now.day + offset) % 7;
    const first = (runs.times[day] || [])[0];
    if (!first) continue;
    const when = offset === 0 ? "today" : offset === 1 ? "tomorrow" : DAY_NAMES[day];
    return { open: false, next: { day, when, at: fmtTime(timeOf(first)), text: `${when} at ${fmtTime(timeOf(first))}` } };
  }
  return { open: false, next: null };
}
