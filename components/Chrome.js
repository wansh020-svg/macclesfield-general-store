"use client";

import { usePathname } from "next/navigation";

// Hides the customer site's navigation and footer on the driver app.
export default function Chrome({ children }) {
  const path = usePathname() || "";
  return ["/driver", "/poster", "/flyer", "/tablecard", "/thankyou"].some((p) => path.startsWith(p)) ? null : children;
}
