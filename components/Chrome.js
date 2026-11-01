"use client";

import { usePathname } from "next/navigation";

// Hides the customer site's navigation and footer on the driver app.
export default function Chrome({ children }) {
  return usePathname()?.startsWith("/driver") ? null : children;
}
