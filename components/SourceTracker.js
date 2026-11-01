"use client";

import { useEffect } from "react";

// Remembers where a visitor came from (the ?src=poster / ?src=flyer on our QR codes),
// so the order can say which advertising worked. Kept for 30 days on their phone.
export default function SourceTracker() {
  useEffect(() => {
    try {
      const src = new URLSearchParams(window.location.search).get("src");
      if (src && /^[a-z0-9_-]{1,20}$/i.test(src)) {
        localStorage.setItem("maccy-src", JSON.stringify({ src: src.toLowerCase(), at: Date.now() }));
      }
    } catch {
      // storage blocked: orders just won't carry a source
    }
  }, []);
  return null;
}

export function readSource() {
  try {
    const v = JSON.parse(localStorage.getItem("maccy-src") || "null");
    return v && Date.now() - v.at < 30 * 86400000 ? v.src : null;
  } catch {
    return null;
  }
}
