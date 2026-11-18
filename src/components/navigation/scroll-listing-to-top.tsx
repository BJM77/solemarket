"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Next.js should reset scroll on a new route, but a full-viewport Suspense
 * fallback on listing pages can leave the previous page's scroll position in
 * place after the details stream in. This only mounts on listing routes, so
 * browser Back to a scrolled homepage is left to the history restoration.
 */
export default function ScrollListingToTop() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
