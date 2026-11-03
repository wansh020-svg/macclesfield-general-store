"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { chime } from "@/lib/chime";
import { fmtTime } from "@/lib/hours";
import { money } from "@/lib/format";

const RunMap = dynamic(() => import("@/components/RunMap"), { ssr: false, loading: () => <div className="h-56 rounded-2xl bg-pine-dark/50" /> });

const POLL_VISIBLE = 10000;
const POLL_HIDDEN = 30000;
const big = "rounded-full font-display font-900 text-lg h-14 px-6 active:scale-95 transition-transform";

function MineCard({ order, busy, onAction, onMove, first, last }) {
  const [confirming, setConfirming] = useState(false);
  const [cash, setCash] = useState(String(order.estimated_total));
  // Verified orders navigate to the exact checked spot; unchecked ones fall back to the typed address.
  const dest = order.lat != null && order.lng != null ? `${order.lat},${order.lng}` : encodeURIComponent(order.address);
  return (
    <article className="rounded-3xl bg-canvas text-ink p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display font-900 text-2xl flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-rust text-canvas-light grid place-items-center text-xl" aria-label={`Stop ${order.stop}`}>{order.stop}</span>
          Order #{order.id}
        </p>
        <span className="flex gap-2">
          <button disabled={busy || first} onClick={() => onMove(order.id, -1)} aria-label={`Move order ${order.id} earlier`} className="w-10 h-10 rounded-full border-2 border-ink/25 disabled:opacity-30">&uarr;</button>
          <button disabled={busy || last} onClick={() => onMove(order.id, 1)} aria-label={`Move order ${order.id} later`} className="w-10 h-10 rounded-full border-2 border-ink/25 disabled:opacity-30">&darr;</button>
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-3 mt-2">
        <p className="font-mono text-xs uppercase tracking-widest text-ink/50">{order.items.reduce((n, i) => n + i.qty, 0) === 1 ? "1 item" : `${order.items.reduce((n, i) => n + i.qty, 0)} items`}</p>
      </div>

      <p className="font-display font-700 text-xl mt-3">{order.customer_name}</p>
      <p className="text-lg mt-1 leading-snug">{order.address}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${dest}`} target="_blank" rel="noreferrer" className="rounded-full bg-pine text-canvas-light text-center font-display font-700 py-3">Google</a>
        <a href={`https://maps.apple.com/?daddr=${dest}`} target="_blank" rel="noreferrer" className="rounded-full bg-pine text-canvas-light text-center font-display font-700 py-3">Apple</a>
        <a href={`tel:${order.phone}`} className="rounded-full bg-gold text-ink text-center font-display font-900 py-3">Call</a>
      </div>

      <ul className="mt-4 space-y-1">
        {order.items.map((it, i) => (
          <li key={i} className="flex gap-3"><span className="font-display font-900 w-8 shrink-0">{it.qty}&times;</span><span>{it.name}</span></li>
        ))}
      </ul>
      {order.notes && <p className="mt-3 rounded-xl bg-ink/10 px-3 py-2 text-sm italic">Note: {order.notes}</p>}

      <div className="mt-4 rounded-2xl bg-gold px-4 py-3 flex items-center justify-between">
        <span className="font-display font-700">Collect cash</span>
        <span className="font-display font-900 text-3xl">{money(order.estimated_total)}</span>
      </div>
      {Number(order.delivery_fee) > 0 && <p className="mt-1 text-xs font-mono uppercase tracking-widest text-ink/60">includes {money(order.delivery_fee)} delivery fee</p>}

      {!confirming ? (
        <div className="mt-4 space-y-3">
          <button disabled={busy} onClick={() => setConfirming(true)} className={`${big} w-full bg-pine text-canvas-light disabled:opacity-50`}>Delivered</button>
          <div className="flex gap-3">
            <button disabled={busy} onClick={() => {
              const reason = window.prompt("Why couldn't it be delivered? (nobody home, wrong address...)");
              if (reason !== null) onAction(order.id, "fail", { reason });
            }} className="flex-1 rounded-full border-2 border-rust text-rust font-display font-700 h-12 disabled:opacity-50">Can&apos;t deliver</button>
            <button disabled={busy} onClick={() => window.confirm("Give this order back so another driver can take it?") && onAction(order.id, "release")} className="flex-1 rounded-full border-2 border-ink/30 text-ink/70 font-display font-700 h-12 disabled:opacity-50">Give back</button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="font-mono text-xs uppercase tracking-widest text-ink/60">Cash you collected ($)</span>
            <input value={cash} onChange={(e) => setCash(e.target.value)} inputMode="decimal" className="mt-1 w-full rounded-2xl bg-canvas-light border-2 border-ink/20 px-4 py-3 text-2xl font-display font-900" />
          </label>
          <div className="flex gap-3">
            <button onClick={() => setConfirming(false)} className="rounded-full border-2 border-ink/30 font-display font-700 h-14 px-6">Back</button>
            <button disabled={busy} onClick={() => onAction(order.id, "deliver", { cash: Number(cash) })} className={`${big} flex-1 bg-pine text-canvas-light disabled:opacity-50`}>Confirm delivered</button>
          </div>
        </div>
      )}
    </article>
  );
}

export default function DriverApp({ driver, initialBoard }) {
  const [board, setBoard] = useState(initialBoard);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [shift, setShift] = useState(false); // sound + keep-awake on
  const [audioReady, setAudioReady] = useState(false);
  const ctxRef = useRef(null);
  const seen = useRef(new Set(initialBoard.available.map((o) => o.id)));
  const shiftRef = useRef(false);
  shiftRef.current = shift;
  const router = useRouter();

  const ring = useCallback(() => {
    if (shiftRef.current && ctxRef.current?.state === "running") chime(ctxRef.current);
    try { navigator.vibrate?.([200, 100, 200]); } catch { /* not supported */ }
  }, []);

  function startShift() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        ctxRef.current = ctxRef.current || new AC();
        ctxRef.current.resume().then(() => {
          setAudioReady(ctxRef.current.state === "running");
          if (ctxRef.current.state === "running") chime(ctxRef.current);
        });
      }
    } catch { /* no audio: visual alerts still work */ }
    setShift(true);
  }

  // keep the phone awake during a shift (iPhone: iOS 16.4+)
  useEffect(() => {
    if (!shift || !("wakeLock" in navigator)) return;
    let lock = null;
    const grab = async () => { try { lock = await navigator.wakeLock.request("screen"); } catch { /* not allowed right now */ } };
    grab();
    const again = () => document.visibilityState === "visible" && grab();
    document.addEventListener("visibilitychange", again);
    return () => { document.removeEventListener("visibilitychange", again); lock?.release?.().catch(() => {}); };
  }, [shift]);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/driver/orders", { cache: "no-store" });
      if (res.status === 401) { router.refresh(); return; }
      if (!res.ok) throw new Error();
      const data = await res.json();
      setError("");
      setBoard(data);
      const fresh = data.available.filter((o) => !seen.current.has(o.id));
      data.available.forEach((o) => seen.current.add(o.id));
      if (fresh.length) ring();
    } catch {
      setError("No connection. Trying again...");
    }
  }, [ring, router]);

  useEffect(() => {
    let timer;
    const loop = () => { timer = setTimeout(async () => { await refresh(); loop(); }, document.hidden ? POLL_HIDDEN : POLL_VISIBLE); };
    loop();
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [refresh]);

  async function act(id, action, body) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/driver/orders/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body || {}),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { router.refresh(); return; }
      if (!res.ok) setError(data.error || "Something went wrong.");
    } catch {
      setError("No connection. Try again.");
    } finally {
      setBusyId(null);
      refresh();
    }
  }

  async function startRun(runTime, cooking) {
    if (cooking > 0 && !window.confirm(`${cooking} order${cooking === 1 ? " is" : "s are"} still being made. Start the run without ${cooking === 1 ? "it" : "them"}?`)) return;
    setBusyId(`run:${runTime}`);
    setError("");
    try {
      const res = await fetch("/api/driver/runs/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ runTime }) });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { router.refresh(); return; }
      if (!res.ok) setError(data.error || "Something went wrong.");
    } catch {
      setError("No connection. Try again.");
    } finally {
      setBusyId(null);
      refresh();
    }
  }

  async function finishRun() {
    setBusyId("finish");
    setError("");
    try {
      const res = await fetch("/api/driver/runs/finish", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(data.error || "Something went wrong.");
    } catch {
      setError("No connection. Try again.");
    } finally {
      setBusyId(null);
      refresh();
    }
  }

  async function moveStop(id, dir) {
    const ids = board.mine.map((o) => o.id);
    const k = ids.indexOf(id), j = k + dir;
    if (k < 0 || j < 0 || j >= ids.length) return;
    [ids[k], ids[j]] = [ids[j], ids[k]];
    setBoard((b) => ({ ...b, mine: ids.map((x, n) => ({ ...b.mine.find((o) => o.id === x), stop: n + 1 })), route: { ...b.route, manual: true } }));
    try {
      const res = await fetch("/api/driver/orders/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
      if (!res.ok) throw new Error();
    } catch {
      setError("Couldn't save the new order. Refreshing.");
    } finally {
      refresh();
    }
  }

  // Every stop in the order they are listed, as one Google Maps trip from where the driver is now.
  const tripUrl = (() => {
    const where = (o) => (o.lat != null && o.lng != null ? `${o.lat},${o.lng}` : o.address);
    const stops = board.mine.map(where);
    if (stops.length === 0) return null;
    const dest = encodeURIComponent(stops[stops.length - 1]);
    const way = stops.slice(0, -1).map(encodeURIComponent).join("%7C");
    return `https://www.google.com/maps/dir/?api=1&destination=${dest}${way ? `&waypoints=${way}` : ""}&travelmode=driving`;
  })();

  // ready orders grouped by the run they belong to
  const groups = (() => {
    const map = new Map();
    for (const o of board.available) {
      const key = o.run_time || "";
      map.set(key, [...(map.get(key) || []), o]);
    }
    for (const p of board.pending || []) if (!map.has(p.run_time)) map.set(p.run_time, []);
    return [...map.entries()].sort(([a], [b]) => (a || "99").localeCompare(b || "99"));
  })();
  const cookingFor = (t) => (board.pending || []).find((p) => p.run_time === t)?.cooking || 0;

  // "Need help": ask the phone where it is (a few seconds at most), then tell the store.
  const [help, setHelp] = useState("idle"); // idle | confirm | sending | sent | failed
  async function sendHelp() {
    setHelp("sending");
    const where = await new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({});
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy }),
        () => resolve({}),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 15000 }
      );
    });
    try {
      const res = await fetch("/api/driver/help", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(where) });
      if (!res.ok) throw new Error();
      setHelp("sent");
    } catch {
      setHelp("failed");
    }
  }

  async function logout() {
    await fetch("/api/driver/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <main className="max-w-md mx-auto px-4 pt-6 pb-16">
      <header className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-canvas-light/60">Driver</p>
          <h1 className="font-display font-900 text-3xl leading-none">Hi, {driver.name.split(" ")[0]}</h1>
        </div>
        <button onClick={logout} className="font-mono text-xs uppercase tracking-widest text-canvas-light/60 underline">Sign out</button>
      </header>

      <div className="mt-4 rounded-3xl bg-pine px-5 py-4 flex items-center justify-between">
        <span className="font-display font-700">Today</span>
        <span className="font-display font-900 text-lg">{board.today.deliveries} {board.today.deliveries === 1 ? "delivery" : "deliveries"} &middot; {money(board.today.cash)} cash</span>
      </div>

      {!shift ? (
        <button onClick={startShift} className={`${big} w-full mt-4 bg-gold text-ink`}>Start shift (sound on)</button>
      ) : (
        <p className="mt-3 text-sm text-canvas-light/70">
          {audioReady ? "Shift on. You'll hear a chime when an order is ready." : "Shift on. Tap Start shift again if you can't hear chimes."}
        </p>
      )}

      {error && <p role="alert" className="mt-4 rounded-2xl bg-rust px-4 py-3 text-sm">{error}</p>}

      <section aria-label="Need help" className="mt-4">
        {help === "idle" && (
          <button onClick={() => setHelp("confirm")} className="w-full rounded-full border-2 border-rust bg-rust/20 text-canvas-light font-display font-900 h-12">Need help</button>
        )}
        {help === "confirm" && (
          <div className="rounded-3xl bg-rust p-5 space-y-3">
            <p className="font-display font-900 text-xl">Send an alert to the store?</p>
            <p className="text-sm text-canvas-light/90">Your location goes with it if your phone allows it. If you are in danger, call 000 first.</p>
            <a href="tel:000" className="block text-center rounded-full bg-canvas-light text-ink font-display font-900 py-3">Call 000</a>
            <div className="flex gap-3">
              <button onClick={() => setHelp("idle")} className="flex-1 rounded-full border-2 border-canvas-light/60 font-display font-700 h-12">Cancel</button>
              <button onClick={sendHelp} className="flex-1 rounded-full bg-gold text-ink font-display font-900 h-12">Send alert</button>
            </div>
          </div>
        )}
        {help === "sending" && <p role="status" className="rounded-2xl bg-rust px-4 py-3 font-display font-700">Sending... getting your location.</p>}
        {help === "sent" && (
          <div role="status" className="rounded-3xl bg-rust p-5 space-y-3">
            <p className="font-display font-900 text-xl">The store has been alerted.</p>
            <p className="text-sm">They will phone you. If you are in danger, call 000.</p>
            <div className="flex gap-3">
              <a href="tel:000" className="flex-1 text-center rounded-full bg-canvas-light text-ink font-display font-900 py-3">Call 000</a>
              <button onClick={() => setHelp("idle")} className="flex-1 rounded-full border-2 border-canvas-light/60 font-display font-700 h-12">Okay</button>
            </div>
          </div>
        )}
        {help === "failed" && (
          <div role="alert" className="rounded-3xl bg-rust p-5 space-y-3">
            <p className="font-display font-900 text-xl">The alert didn&apos;t send.</p>
            <p className="text-sm">Phone the store on (08) 8188 5301, or call 000 if you are in danger.</p>
            <div className="flex gap-3">
              <a href="tel:0881885301" className="flex-1 text-center rounded-full bg-gold text-ink font-display font-900 py-3">Call the store</a>
              <button onClick={() => setHelp("confirm")} className="flex-1 rounded-full border-2 border-canvas-light/60 font-display font-700 h-12">Try again</button>
            </div>
          </div>
        )}
      </section>

      <h2 className="font-display font-900 text-2xl mt-8">On the road ({board.mine.length})</h2>
      <div className="mt-3 space-y-4">
        {board.mine.length === 0 && <p className="text-canvas-light/60">You have nothing to deliver. Take an order below when it's ready.</p>}
        {board.mine.length > 0 && (
          <div className="rounded-3xl bg-pine px-5 py-4 space-y-3">
            <p className="font-display font-700">
              {board.mine.length} {board.mine.length === 1 ? "stop" : "stops"} &middot; about {board.route.km} km round trip &middot; <span className="font-900">{money(board.route.cash)}</span> cash to collect
            </p>
            <p className="text-xs text-canvas-light/70">{board.route.manual ? "Stops are in your order." : "Stops are in the shortest order. Use the arrows to change it."}</p>
            <RunMap store={board.route.store} stops={board.mine.map((o) => ({ n: o.stop, lat: o.lat, lng: o.lng, label: o.customer_name }))} />
            {tripUrl && <a href={tripUrl} target="_blank" rel="noreferrer" className="block text-center rounded-full bg-gold text-ink font-display font-900 py-3">Whole run in Google Maps</a>}
          </div>
        )}
        {board.mine.map((o, k) => <MineCard key={o.id} order={o} busy={busyId === o.id} onAction={act} onMove={moveStop} first={k === 0} last={k === board.mine.length - 1} />)}
        {board.canFinish && (
          <button disabled={busyId === "finish"} onClick={finishRun} className={`${big} w-full bg-gold text-ink disabled:opacity-50`}>Run finished: back at the shop</button>
        )}
      </div>

      <h2 className="font-display font-900 text-2xl mt-10">Ready for pickup ({board.available.length})</h2>
      <div className="mt-3 space-y-6">
        {groups.length === 0 && <p className="text-canvas-light/60">No orders waiting. This page updates by itself.</p>}
        {groups.map(([time, list]) => (
          <section key={time || "other"} aria-label={time ? `${fmtTime(time)} run` : "Other orders"} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-display font-900 text-xl">{time ? `${fmtTime(time)} run` : "Other orders"}</p>
                <p className="font-mono text-xs uppercase tracking-widest text-canvas-light/60">
                  {list.length} ready{cookingFor(time) > 0 ? ` · ${cookingFor(time)} still being made` : ""}
                </p>
              </div>
              {time && list.length > 0 && (
                <button disabled={busyId === `run:${time}`} onClick={() => startRun(time, cookingFor(time))} className="rounded-full bg-gold text-ink font-display font-900 h-12 px-5 shrink-0 disabled:opacity-50 active:scale-95 transition-transform">
                  Start run ({list.length})
                </button>
              )}
            </div>
            {list.map((o) => (
              <article key={o.id} className="rounded-3xl bg-pine p-5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-display font-900 text-xl">Order #{o.id}</p>
                  <p className="text-canvas-light/70 truncate">{o.area}</p>
                  <p className="font-mono text-xs uppercase tracking-widest text-canvas-light/50 mt-1">{o.itemCount} {o.itemCount === 1 ? "item" : "items"} &middot; {money(o.total)} cash</p>
                </div>
                <button disabled={busyId === o.id} onClick={() => act(o.id, "claim")} className="rounded-full bg-gold text-ink font-display font-900 text-lg h-12 px-6 shrink-0 disabled:opacity-50 active:scale-95 transition-transform">Pick up</button>
              </article>
            ))}
          </section>
        ))}
      </div>
    </main>
  );
}
