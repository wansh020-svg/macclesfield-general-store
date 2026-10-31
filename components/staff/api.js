// Small helpers shared by the staff editors.
export async function api(kind, method, body, query = "") {
  const res = await fetch(`/api/staff/${kind}${query}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    window.location.href = "/dashboard/login";
    throw new Error("Your session expired. Please log in again.");
  }
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

// "Small=5.5, Medium=6" <-> [{label, price}]
export const sizesToText = (sizes) => (sizes || []).map((s) => `${s.label}=${s.price}`).join(", ");
export function textToSizes(text) {
  return String(text || "")
    .split(/[,\n]/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const m = p.match(/^(.*?)[\s=:]*\$?(\d+(?:\.\d+)?)$/);
      if (!m || !m[1].trim()) throw new Error(`Couldn't read the size "${p}". Use the form: Small=5.50, Large=7`);
      return { label: m[1].trim(), price: Number(m[2]) };
    });
}

// Shrink a photo in the browser before upload so it stays small and loads fast.
export function shrinkImage(file, maxWidth = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file isn't a picture we can read"));
    };
    img.src = url;
  });
}

export async function uploadImage(file) {
  const dataUrl = await shrinkImage(file);
  const res = await fetch("/api/images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dataUrl }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.id;
}
