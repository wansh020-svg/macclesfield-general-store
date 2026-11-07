"use client";

import { Analytics } from "@vercel/analytics/next";

// Vercel Web Analytics (visitors, pages, where they came from). Staff, driver and print pages are left out
// so the numbers show customers only. Turn it on or off in Vercel > project > Analytics.
const SKIP = /^\/(dashboard|driver|poster|flyer|tablecard|thankyou)(\/|$)/;

export default function SiteAnalytics() {
  return <Analytics beforeSend={(e) => (SKIP.test(new URL(e.url).pathname) ? null : e)} />;
}
