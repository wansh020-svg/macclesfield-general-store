// Order the stops on a delivery run so the drive is as short as possible: shop -> every stop -> shop.
// Straight-line distances (roads wind, but this is enough to group neighbours and avoid back-and-forth).
// With up to 8 stops every order is tried, so the answer is exact; more than that uses nearest-neighbour.
const R = 6371;
const rad = (d) => (d * Math.PI) / 180;

export function km(a, b) {
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const placed = (s) => s.lat !== null && s.lat !== undefined && s.lng !== null && s.lng !== undefined && Number.isFinite(Number(s.lat)) && Number.isFinite(Number(s.lng));

export function tripKm(store, order) {
  let total = 0, at = store;
  for (const s of order) { total += km(at, s); at = s; }
  return total + (order.length ? km(at, store) : 0);
}

// stops: [{ id, lat, lng }] -> { order: [ids...], km, unplaced: [ids...] }
export function planRoute(store, stops) {
  const pts = stops.filter(placed).map((s) => ({ id: s.id, lat: Number(s.lat), lng: Number(s.lng) }));
  const unplaced = stops.filter((s) => !placed(s)).map((s) => s.id);
  let best = pts;
  if (pts.length > 1 && pts.length <= 8) {
    let bestKm = Infinity;
    const used = Array(pts.length).fill(false), cur = [];
    const walk = (soFar, at) => {
      if (soFar >= bestKm) return; // can't beat the best already found
      if (cur.length === pts.length) {
        const total = soFar + km(at, store);
        if (total < bestKm - 1e-9) { bestKm = total; best = [...cur]; }
        return;
      }
      for (let i = 0; i < pts.length; i++) {
        if (used[i]) continue;
        used[i] = true; cur.push(pts[i]);
        walk(soFar + km(at, pts[i]), pts[i]);
        cur.pop(); used[i] = false;
      }
    };
    walk(0, store);
  } else if (pts.length > 8) {
    const left = [...pts], out = [];
    let at = store;
    while (left.length) {
      let k = 0;
      for (let i = 1; i < left.length; i++) if (km(at, left[i]) < km(at, left[k])) k = i;
      at = left.splice(k, 1)[0];
      out.push(at);
    }
    best = out;
  }
  return { order: [...best.map((p) => p.id), ...unplaced], km: Math.round(tripKm(store, best) * 10) / 10, unplaced };
}
