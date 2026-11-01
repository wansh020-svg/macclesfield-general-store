"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LABEL, isDone } from "@/lib/orderStatus";
import { money } from "@/lib/format";
import { chime } from "@/lib/chime";

const POLL_VISIBLE = 8000;
const POLL_HIDDEN = 30000;
const REPEAT_RING = 20000; // keep ringing while an order is waiting to be accepted
const PILL = {
  new: "bg-gold text-ink animate-pulse",
  accepted: "bg-pine text-canvas-light",
  ready: "bg-sage text-canvas-light",
  out_for_delivery: "bg-clay text-canvas-light",
  delivered: "bg-ink/10 text-ink/60",
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

function OrderCard({ order, now, onStatus }) {
  const done = isDone(order.status);
  return (
    <article className={`rounded-3xl border-2 p-5 ${order.status === "new" ? "border-gold bg-gold/10" : "border-ink/15 bg-canvas-light"} ${done ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display font-900 text-2xl leading-none">Order #{order.id}</p>
          <p className="font-mono text-xs uppercase tracking-widest text-ink/50 mt-1">{ago(order.created_at, now)}</p>
        </div>
        <span className={`rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-widest ${PILL[order.status] || PILL.delivered}`}>
          {LABEL[order.status] || order.status}
        </span>
      </div>

      <p className="font-display font-700 text-lg mt-4">{order.customer_name}</p>
      <p className="mt-1">
        <a href={`tel:${order.phone}`} className="underline underline-offset-4 decoration-gold">{order.phone}</a>
      </p>
      <p className="mt-1">
        <a href={`https://maps.google.com/?q=${encodeURIComponent(order.address)}`} target="_blank" rel="noreferrer" className="underline underline-offset-4 decoration-gold">
          {order.address}
        </a>
      </p>

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
        <span className="font-display font-900 text-2xl">{money(order.estimated_total || 0)} <span className="font-mono text-xs uppercase tracking-widest text-ink/50">cash</span></span>
        <div className="flex flex-wrap gap-2">
          {order.status === "new" && (
            <>
              <button onClick={() => onStatus(order, "cancelled")} className={`${btn} border-2 border-rust text-rust`}>Cancel</button>
              <button onClick={() => onStatus(order, "accepted")} className={`${btn} bg-pine text-canvas-light`}>Accept</button>
            </>
          )}
          {order.status === "accepted" && (
            <>
              <button onClick={() => onStatus(order, "cancelled")} className={`${btn} border-2 border-rust text-rust`}>Cancel</button>
              <button onClick={() => onStatus(order, "ready")} className={`${btn} bg-sage text-canvas-light`}>Ready</button>
            </>
          )}
          {order.status === "ready" && (
            <button onClick={() => onStatus(order, "cancelled")} className={`${btn} border-2 border-rust text-rust`}>Cancel</button>
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
      setOrders(fresh);
      const arrived = fresh.filter((o) => o.id > knownMax.current && o.status === "new");
      if (fresh.length) knownMax.current = Math.max(knownMax.current, ...fresh.map((o) => o.id));
      if (arrived.length) {
        ring();
        setBanner(arrived.length === 1 ? `New order #${arrived[0].id} from ${arrived[0].customer_name}` : `${arrived.length} new orders`);
        if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
          new Notification("New order", { body: `#${arrived[0].id} · ${arrived[0].customer_name}` });
        }
      }
    } catch {
      setError("Can't reach the server. Retrying...");
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

  // ---- keep ringing until every new order has been accepted or cancelled
  const waiting = orders.filter((o) => o.status === "new").length;
  useEffect(() => {
    if (!waiting || !soundOn || !audioReady) return;
    const id = setInterval(ring, REPEAT_RING);
    return () => clearInterval(id);
  }, [waiting, soundOn, audioReady, ring]);

  useEffect(() => {
    document.title = waiting ? `(${waiting}) New order | Macclesfield General Store` : "Orders | Macclesfield General Store";
    if (!waiting) setBanner("");
  }, [waiting]);

  // ---- actions
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

  const needsAction = orders.filter((o) => o.status === "new");
  const inProgress = orders.filter((o) => ["accepted", "ready", "out_for_delivery"].includes(o.status)).reverse();
  const finished = orders.filter((o) => isDone(o.status)).slice(0, 30);

  return (
    <div>
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

      {banner && (
        <div role="alert" className="mb-5 rounded-2xl bg-gold text-ink px-5 py-4 font-display font-900 text-xl animate-rise">
          {banner}
        </div>
      )}
      {error && <p className="mb-5 rounded-2xl bg-rust/10 text-rust px-4 py-3 text-sm">{error}</p>}

      <h2 className="font-display font-900 text-2xl">Needs action {needsAction.length > 0 && <span className="text-rust">({needsAction.length})</span>}</h2>
      <div className="mt-3 space-y-4">
        {needsAction.length === 0 && <p className="text-ink/60">No new orders. This page updates by itself.</p>}
        {needsAction.map((o) => <OrderCard key={o.id} order={o} now={now} onStatus={onStatus} />)}
      </div>

      <h2 className="font-display font-900 text-2xl mt-10">In progress ({inProgress.length})</h2>
      <div className="mt-3 space-y-4">
        {inProgress.length === 0 && <p className="text-ink/60">Nothing being made or delivered.</p>}
        {inProgress.map((o) => <OrderCard key={o.id} order={o} now={now} onStatus={onStatus} />)}
      </div>

      <details className="mt-10">
        <summary className="cursor-pointer font-display font-900 text-2xl">Finished ({finished.length})</summary>
        <div className="mt-3 space-y-4">
          {finished.map((o) => <OrderCard key={o.id} order={o} now={now} onStatus={onStatus} />)}
        </div>
      </details>
    </div>
  );
}
