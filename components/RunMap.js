"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

// A small OpenStreetMap (free, no key) with the shop and numbered pins for each stop.
// stops: [{ n, lat, lng, label }]. Stops with no location are simply left off the map.
export default function RunMap({ store, stops, height = 224 }) {
  const el = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current) return;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      const map = L.map(el.current, { scrollWheelZoom: false, attributionControl: true }).setView([store.lat, store.lng], 13);
      mapRef.current = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19, attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      const pin = (html, cls) => L.divIcon({ html, className: "", iconSize: [30, 30], iconAnchor: [15, 15], popupAnchor: [0, -14] });
      const shop = `<div style="width:30px;height:30px;border-radius:8px;background:#2F3B2C;color:#F0B93A;display:grid;place-items:center;font:900 15px sans-serif;border:2px solid #FAF3E4">S</div>`;
      const num = (n) => `<div style="width:30px;height:30px;border-radius:50%;background:#6E2A38;color:#FAF3E4;display:grid;place-items:center;font:900 15px sans-serif;border:2px solid #FAF3E4">${n}</div>`;
      L.marker([store.lat, store.lng], { icon: pin(shop), title: "The shop" }).addTo(map);
      const pts = [[store.lat, store.lng]];
      for (const s of stops) {
        if (s.lat == null || s.lng == null) continue;
        L.marker([s.lat, s.lng], { icon: pin(num(s.n)), title: s.label || `Stop ${s.n}` }).addTo(map);
        pts.push([s.lat, s.lng]);
      }
      if (pts.length > 1) {
        L.polyline(pts.concat([pts[0]]), { color: "#6E2A38", weight: 3, opacity: 0.6, dashArray: "6 6" }).addTo(map);
        map.fitBounds(pts, { padding: [28, 28], maxZoom: 16 });
      }
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
  }, [store.lat, store.lng, JSON.stringify(stops.map((s) => [s.n, s.lat, s.lng]))]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={el} role="img" aria-label="Map of the stops" style={{ height }} className="w-full rounded-2xl overflow-hidden border-2 border-ink/15 z-0" />;
}
