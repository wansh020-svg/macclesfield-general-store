"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isDone, labelFor } from "@/lib/orderStatus";
import { money } from "@/lib/format";
import { chime } from "@/lib/chime";
import { fmtTime } from "@/lib/hours";
import RunsPanel from "@/components/staff/RunsPanel";

const POLL_VISIBLE = 8000;
const NAG_AFTER = 60000; // an order unseen this long rings faster
const NAG_RING = 8000;
const POLL_HIDDEN = 30000;
const REPEAT_RING = 20000; // keep ringing while an order is waiting to be accepted
const PILL = {
  new: "bg-gold text-ink animate-pulse",
  accepted: "bg-pine text-canvas-light",
  ready: "bg-sage text-canvas-light",
  out_for_delivery: "bg-clay text-canvas-light",
  delivered: "bg-ink/10 text-ink/60",
  collected: "bg-ink/10 text-ink/60",
  fulfilled: "bg-ink/10 text-ink/60",
  cancelled: "bg-rust/15 text-rust",
};
const btn = "rounded-full font-display font-900 px-5 h-11 text-base active:scale-95 transition-transform";

function ago(iso, now) {
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h} h ${mins % 60} min ago` : new Date(iso).toLocaleDateString("en-AU");
}

function OrderCard({ order, now, onStatus, onSpam, runs, onMove }) {
  const done = isDone(order.status);
  const pickup = order.order_type === "pickup";
  return (
    <article className={`rounded-3xl border-2 p-5 ${order.status === "new" ? "border-gold bg-gold/10" : "border-ink/15 bg-canvas-light"} ${done ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display font-900 text-2xl leading-none">
            Order #{order.id}{" "}
            <span className={`align-middle rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-widest ${pickup ? "bg-gold text-ink" : "bg-ink text-canvas-light"}`}>
              {pickup ? "Pickup" : "Delivery"}
            </span>
          </p>
          <p className="font-mono text-xs uppercase tracking-widest text-ink/50 mt-1">
            {ago(order.created_at, now)}{order.source ? ` · via ${order.source}` : ""}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-widest ${PILL[order.status] || PILL.delivered}`}>
          {labelFor(order.status, order.order_type)}
        </span>
      </div>

      {!pickup && order.run_time && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-widest ${order.run_cancelled ? "bg-rust text-canvas-light" : "bg-pine text-canvas-light"}`}>
            {fmtTime(order.run_time)} run{order.run_delay > 0 ? ` (+${order.run_delay} min)` : ""}{order.run_cancelled ? " CANCELLED" : ""}
          </span>
          {["new", "accepted", "ready"].includes(order.status) && runs?.length > 0 && (
            <label className="text-xs text-ink/60 flex items-center gap-2">
              Move to
              <select
                aria-label={`Move order ${order.id} to another run`} value="" onChange={(e) => e.target.value && onMove(order, e.target.value)}
                className="border border-ink/20 bg-canvas-light rounded-lg px-2 py-1 text-sm"
              >
                <option value="">another run...</option>
                {runs.filter((r) => r.time !== order.run_time && !r.cancelled).map((r) => <option key={r.time} value={r.time}>{r.label}{r.status !== "open" ? ` (${r.status})` : ""}</option>)}
              </select>
            </label>
          )}
        </div>
      )}
      {!pickup && order.run_cancelled && !isDone(order.status) && (
        <p className="mt-2 rounded-xl bg-rust/10 text-rust px-3 py-2 text-sm font-700">This run was cancelled. Move the order to another run, or cancel it and call the customer.</p>
      )}

      <p className="font-display font-700 text-lg mt-4">{order.customer_name}</p>
      <p className="mt-1">
        <a href={`tel:${order.phone}`} className="underline underline-offset-4 decoration-gold">{order.phone}</a>
      </p>
      {pickup && (
        <p className="mt-2 inline-block rounded-full bg-gold/30 text-ink px-3 py-1 font-mono text-[11px] uppercase tracking-widest">
          Customer collects{order.eta_minutes ? ` · ready in about ${order.eta_minutes} min` : ""}
        </p>
      )}
      {!pickup && (
        <>
          {order.address_status === "unverified" && (
            <p className="mt-2 inline-block rounded-full bg-rust text-canvas-light px-3 py-1 font-mono text-[11px] uppercase tracking-widest">
              Address not checked: call to confirm
            </p>
          )}
          {order.address_status === "verified" && order.distance_km != null && (
            <p className="mt-2 inline-block rounded-full bg-sage/20 text-sage px-3 py-1 font-mono text-[11px] uppercase tracking-widest">
              {order.distance_km} km away
            </p>
          )}
          <p className="mt-1">
            <a href={`https://maps.google.com/?q=${encodeURIComponent(order.address)}`} target="_blank" rel="noreferrer" className="underline underline-offset-4 decoration-gold">
              {order.address}
            </a>
          </p>
        </>
      )}

      <ul className="mt-4 space-y-1 text-ink/90">
        {order.items.map((it, i) => (
          <li key={i} className="flex gap-3">
            <span className="font-display font-900 w-8 shrink-0">{it.qty}&times;</span>
            <span>{it.name}</span>
          </li>
        ))}
      </ul>
      {order.notes && <p className="mt-3 rounded-xl bg-ink/5 px-3 py-2 text-sm italic">Note: {order.notes}</p>}
      {order.status === "cancelled" && order.cancel_reason && <p className="mt-3 text-sm text-rust">Cancelled: {order.cancel_reason}</p>}
      {order.status === "out_for_delivery" && order.driver_name && (
        <p className="mt-3 text-sm font-700">On the road with {order.driver_name}</p>
      )}
      {order.status === "delivered" && order.driver_name && (
        <p className={`mt-3 text-sm ${Number(order.cash_collected) !== Number(order.estimated_total) ? "text-rust font-700" : "text-ink/70"}`}>
          Delivered by {order.driver_name}. Cash collected {money(order.cash_collected ?? 0)}
          {Number(order.cash_collected) !== Number(order.estimated_total) && ` (order was ${money(order.estimated_total || 0)})`}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <span className="font-display font-900 text-2xl">{money(order.estimated_total || 0)} <span className="font-mono text-xs uppercase tracking-widest text-ink/50">{pickup ? "at the counter" : "cash"}</span>{Number(order.delivery_fee) > 0 && <span className="block font-mono text-xs uppercase tracking-widest text-ink/50">includes {money(order.delivery_fee)} delivery</span>}</span>
        <div className="flex flex-wrap gap-2">
          {order.status === "new" && (
            <>
              <button onClick={() => onSpam(order)} className={`${btn} border-2 border-ink/30 text-ink/60`}>Spam</button>
              <button onClick={() => onStatus(order, "cancelled")} className={`${btn} border-2 border-rust text-rust`}>Cancel</button>
              <button onClick={() => onStatus(order, "accepted")} className={`${btn} bg-pine text-canvas-light`}>Accept</button>
            </>
          )}
          {order.status === "accepted" && (
            <>
              <button onClick={() => onStatus(order, "cancelled")} className={`${btn} border-2 border-rust text-rust`}>Cancel</button>
              <button onClick={() => onStatus(order, "ready")} className={`${btn} bg-sage text-canvas-light`}>{pickup ? "Ready to collect" : "Ready"}</button>
            </>
          )}
          {order.status === "ready" && (
            <>
              <button onClick={() => onStatus(order, "cancelled")} className={`${btn} border-2 border-rust text-rust`}>Cancel</button>
              {pickup && <button onClick={() => onStatus(order, "collected")} className={`${btn} bg-ink text-canvas-light`}>Mark collected</button>}
            </>
          )}
          {order.status === "out_for_delivery" && (
            <button onClick={() => onStatus(order, "delivered")} className={`${btn} bg-ink text-canvas-light`}>Mark delivered</button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function OrdersBoard({ initialOrders }) {
  const [orders, setOrders] = useState(initialOrders);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [soundOn, setSoundOn] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [notifPerm, setNotifPerm] = useState("unsupported");
  const [banner, setBanner] = useState("");
  const [offline, setOffline] = useState(false);
  const failures = useRef(0);
  const lastRing = useRef(0);
  const wasOffline = useRef(false);
  const [filter, setFilter] = useState("all"); // all | delivery | pickup
  const ctxRef = useRef(null);
  const knownMax = useRef(Math.max(0, ...initialOrders.map((o) => o.id)));
  const soundRef = useRef(false);
  soundRef.current = soundOn;

  // ---- sound (browsers only allow it after a tap, so we ask for one)
  const unlockAudio = useCallback(() => {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!ctxRef.current) ctxRef.current = new AC();
      ctxRef.current.resume().then(() => setAudioReady(ctxRef.current.state === "running"));
    } catch {
      // no audio support: the visual alerts still work
    }
  }, []);

  const ring = useCallback(() => {
    lastRing.current = Date.now();
    if (soundRef.current && ctxRef.current?.state === "running") chime(ctxRef.current);
    try {
      navigator.vibrate?.([200, 100, 200]);
    } catch {
      // vibration not supported
    }
  }, []);

  useEffect(() => {
    try {
      if (localStorage.getItem("maccy-alerts") === "1") setSoundOn(true);
    } catch {
      // storage blocked
    }
    if ("Notification" in window) setNotifPerm(Notification.permission);
    const unlock = () => soundRef.current && unlockAudio();
    window.addEventListener("pointerdown", unlock);
    return () => window.removeEventListener("pointerdown", unlock);
  }, [unlockAudio]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    try {
      localStorage.setItem("maccy-alerts", next ? "1" : "0");
    } catch {
      // storage blocked
    }
    if (next) {
      unlockAudio();
      setTimeout(() => ctxRef.current?.state === "running" && chime(ctxRef.current), 50); // test chime
    }
  }

  // ---- keep the tablet awake while alerts are on
  useEffect(() => {
    if (!soundOn || !("wakeLock" in navigator)) return;
    let lock = null;
    const grab = async () => {
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        // not allowed right now (e.g. battery saver): fine
      }
    };
    grab();
    const again = () => document.visibilityState === "visible" && grab();
    document.addEventListener("visibilitychange", again);
    return () => {
      document.removeEventListener("visibilitychange", again);
      lock?.release?.().catch(() => {});
    };
  }, [soundOn]);

  // ---- polling
  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      if (res.status === 401) {
        window.location.href = "/dashboard/login";
        return;
      }
      if (!res.ok) throw new Error("bad response");
      const { orders: fresh } = await res.json();
      setError("");
      failures.current = 0;
      setOffline(false);
      if (wasOffline.current) {
        wasOffline.current = false;
        setBanner("Back online. Check the orders below.");
      }
      setOrders(fresh);
      const arrived = fresh.filter((o) => o.id > knownMax.current && o.status === "new");
      if (fresh.length) knownMax.current = Math.max(knownMax.current, ...fresh.map((o) => o.id));
      if (arrived.length) {
        ring();
        setBanner(arrived.length === 1 ? `New ${arrived[0].order_type === "pickup" ? "pickup" : "delivery"} order #${arrived[0].id} from ${arrived[0].customer_name}` : `${arrived.length} new orders`);
        if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
          new Notification("New order", { body: `#${arrived[0].id} · ${arrived[0].customer_name}` });
        }
      }
    } catch {
      failures.current += 1;
      setError("Can't reach the server. Retrying...");
      if (failures.current >= 2) {
        wasOffline.current = true;
        setOffline(true);
      }
    }
  }, [ring]);

  useEffect(() => {
    let timer;
    const loop = () => {
      timer = setTimeout(async () => {
        await refresh();
        loop();
      }, document.hidden ? POLL_HIDDEN : POLL_VISIBLE);
    };
    loop();
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      clearTimeout(timer);
      clearInterval(tick);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  // ---- keep ringing until every new order has been accepted or cancelled (faster once one has waited a minute)
  const waitingOrders = orders.filter((o) => o.status === "new");
  const waiting = waitingOrders.length;
  const oldestWait = waiting ? now - Math.min(...waitingOrders.map((o) => new Date(o.created_at).getTime())) : 0;
  const nagging = waiting > 0 && oldestWait > NAG_AFTER;
  useEffect(() => {
    if (!soundOn || !audioReady || (!waiting && !offline)) return;
    const id = setInterval(() => {
      const gap = offline ? REPEAT_RING : nagging ? NAG_RING : REPEAT_RING;
      if (Date.now() - lastRing.current >= gap - 500) {
        lastRing.current = Date.now();
        ring();
      }
    }, 2000);
    return () => clearInterval(id);
  }, [waiting, offline, nagging, soundOn, audioReady, ring]);

  // flash the tab title so a waiting order is hard to miss
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (!waiting && !offline) return;
    const id = setInterval(() => setFlash((f) => !f), 1000);
    return () => clearInterval(id);
  }, [waiting, offline]);

  useEffect(() => {
    if (offline) { document.title = flash ? "NOT CONNECTED | Orders" : "Orders may be missing"; return; }
    if (waiting && flash) { document.title = `NEW ORDER (${waiting})`; return; }
    document.title = waiting ? `(${waiting}) New order | Macclesfield General Store` : "Orders | Macclesfield General Store";
  }, [waiting, offline, flash]);

  useEffect(() => {
    if (!waiting) setBanner((b) => (b.startsWith("Back online") ? b : ""));
  }, [waiting]);

  // ---- actions
  const [runs, setRuns] = useState([]);
  async function onMove(order, time) {
    setError("");
    try {
      const res = await fetch(`/api/orders/${order.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ moveToRun: time }) });
      if (res.status === 401) { window.location.href = "/dashboard/login"; return; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't move the order");
      setOrders((os) => os.map((o) => (o.id === order.id ? { ...o, run_time: time, run_cancelled: false, run_delay: 0 } : o)));
      refresh();
    } catch (e) {
      setError(e.message);
    }
  }

  async function onSpam(order) {
    if (!window.confirm(`Mark order #${order.id} as spam? It is cancelled and ${order.phone} can't order online again.`)) return;
    const before = orders;
    setOrders((os) => os.map((o) => (o.id === order.id ? { ...o, status: "cancelled", cancel_reason: "Spam" } : o)));
    try {
      const res = await fetch(`/api/orders/${order.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spam: true }) });
      if (res.status === 401) { window.location.href = "/dashboard/login"; return; }
      if (!res.ok) throw new Error();
    } catch {
      setOrders(before);
      setError(`Couldn't mark order #${order.id} as spam. Try again.`);
    }
  }

  async function onStatus(order, status) {
    let reason;
    if (status === "cancelled") {
      reason = window.prompt(`Cancel order #${order.id}? Give a short reason (the customer isn't notified):`, "");
      if (reason === null) return;
    }
    const before = orders;
    setOrders((os) => os.map((o) => (o.id === order.id ? { ...o, status, cancel_reason: reason || o.cancel_reason } : o)));
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reason }),
      });
      if (res.status === 401) {
        window.location.href = "/dashboard/login";
        return;
      }
      if (!res.ok) throw new Error();
    } catch {
      setOrders(before);
      setError(`Couldn't update order #${order.id}. Try again.`);
    }
  }

  const shown = orders.filter((o) => filter === "all" || (o.order_type || "delivery") === filter);
  const activeCount = (type) => orders.filter((o) => (o.order_type || "delivery") === type && !isDone(o.status)).length;
  const needsAction = shown.filter((o) => o.status === "new");
  const inProgress = shown.filter((o) => ["accepted", "ready", "out_for_delivery"].includes(o.status)).reverse();
  const finished = shown.filter((o) => isDone(o.status)).slice(0, 30);

  const soundProblem = !soundOn ? "off" : !audioReady ? "blocked" : null;
  return (
    <div>
      {offline && (
        <div role="alert" className="mb-5 rounded-2xl bg-rust text-canvas-light px-5 py-4 font-display font-900 text-xl animate-pulse">
          NOT CONNECTED. You may be missing orders. Check the internet, or phone the store on a mobile if it stays red.
        </div>
      )}
      {soundProblem && (
        <div role="alert" className={`mb-5 rounded-2xl px-5 py-4 ${waiting ? "bg-rust text-canvas-light" : "bg-gold text-ink"}`}>
          <p className="font-display font-900 text-xl">
            {soundProblem === "off" ? "Sound is OFF. You will not hear new orders." : "Sound is blocked by the browser."}
          </p>
          <button
            onClick={soundProblem === "off" ? toggleSound : unlockAudio}
            className={`${btn} mt-3 ${waiting ? "bg-canvas-light text-ink" : "bg-ink text-canvas-light"}`}
          >
            {soundProblem === "off" ? "Turn on alerts" : "Tap to enable sound"}
          </button>
        </div>
      )}
      {nagging && (
        <div role="alert" className="mb-5 rounded-2xl bg-rust text-canvas-light px-5 py-4 font-display font-900 text-xl animate-pulse">
          {waiting === 1 ? "1 order is" : `${waiting} orders are`} waiting {Math.max(1, Math.floor(oldestWait / 60000))} min or more. Accept or cancel {waiting === 1 ? "it" : "them"} to stop the alarm.
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <button
          onClick={toggleSound}
          className={`${btn} ${soundOn ? "bg-pine text-canvas-light" : "bg-gold text-ink"}`}
        >
          {soundOn ? "Alerts on" : "Turn on alerts"}
        </button>
        {notifPerm === "default" && (
          <button onClick={() => Notification.requestPermission().then(setNotifPerm)} className={`${btn} border-2 border-ink/20`}>
            Desktop notifications
          </button>
        )}
        <span className="text-sm text-ink/60">
          {soundOn
            ? audioReady
              ? "Rings every 20 seconds until new orders are accepted."
              : "Tap anywhere on the page to switch the sound on."
            : "Switch on to hear a chime for each new order."}
        </span>
      </div>

      <RunsPanel refreshKey={orders.length} onRuns={setRuns} />

      <div role="tablist" aria-label="Filter orders" className="flex gap-2 mb-5">
        {[["all", "All"], ["delivery", `Delivery (${activeCount("delivery")})`], ["pickup", `Pickup (${activeCount("pickup")})`]].map(([key, text]) => (
          <button key={key} role="tab" aria-selected={filter === key} onClick={() => setFilter(key)}
            className={`rounded-full px-4 py-2 font-display font-700 text-sm border-2 ${filter === key ? "bg-pine text-canvas-light border-pine" : "border-ink/15 text-ink/70 bg-canvas-light"}`}>
            {text}
          </button>
        ))}
      </div>

      {banner && (
        <div role="alert" className="mb-5 rounded-2xl bg-gold text-ink px-5 py-4 font-display font-900 text-xl animate-rise">
          {banner}
        </div>
      )}
      {error && <p className="mb-5 rounded-2xl bg-rust/10 text-rust px-4 py-3 text-sm">{error}</p>}

      <h2 className="font-display font-900 text-2xl">Needs action {needsAction.length > 0 && <span className="text-rust">({needsAction.length})</span>}</h2>
      <div className="mt-3 space-y-4">
        {needsAction.length === 0 && <p className="text-ink/60">No new orders. This page updates by itself.</p>}
        {needsAction.map((o) => <OrderCard key={o.id} order={o} now={now} onStatus={onStatus} onSpam={onSpam} runs={runs} onMove={onMove} />)}
      </div>

      <h2 className="font-display font-900 text-2xl mt-10">In progress ({inProgress.length})</h2>
      <div className="mt-3 space-y-4">
        {inProgress.length === 0 && <p className="text-ink/60">Nothing being made or delivered.</p>}
        {inProgress.map((o) => <OrderCard key={o.id} order={o} now={now} onStatus={onStatus} onSpam={onSpam} runs={runs} onMove={onMove} />)}
      </div>

      <details className="mt-10">
        <summary className="cursor-pointer font-display font-900 text-2xl">Finished ({finished.length})</summary>
        <div className="mt-3 space-y-4">
          {finished.map((o) => <OrderCard key={o.id} order={o} now={now} onStatus={onStatus} onSpam={onSpam} runs={runs} onMove={onMove} />)}
        </div>
      </details>
    </div>
  );
}
