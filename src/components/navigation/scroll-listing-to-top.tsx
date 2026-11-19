"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Opens listing pages at the top when you navigate to them (e.g. a tile on
 * the homepage), without breaking the browser's own scroll restoration:
 * - Back/Forward (popstate) keeps the position the browser restores.
 * - A reload, or arriving on the page via Back/Forward from another site,
 *   keeps the restored position too.
 */
let historyNavigationPending = false;
let firstMountInDocument = true;
let listenersAttached = false;

function attachListeners() {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;
  window.addEventListener("popstate", () => {
    historyNavigationPending = true;
  });
  // A pointer interaction (click, touch, pointerdown) starts a fresh forward navigation.
  const markForward = () => {
    historyNavigationPending = false;
  };
  window.addEventListener("click", markForward, { capture: true });
  window.addEventListener("pointerdown", markForward, { capture: true });
  window.addEventListener("touchstart", markForward, { capture: true, passive: true });
}

if (typeof window !== "undefined") attachListeners();

function documentNavigationType(): string | undefined {
  try {
    const entry = performance.getEntriesByType?.("navigation")?.[0] as PerformanceNavigationTiming | undefined;
    return entry?.type;
  } catch {
    return undefined;
  }
}

/** Decide (and consume) whether this listing mount should scroll to the top. */
export function shouldScrollListingToTop(): boolean {
  if (firstMountInDocument) {
    firstMountInDocument = false;
    const type = documentNavigationType();
    if (type === "reload" || type === "back_forward") return false;
  }
  if (historyNavigationPending) {
    historyNavigationPending = false;
    return false;
  }
  return true;
}

/** Test helper: reset module state between tests. */
export function resetListingScrollStateForTests() {
  historyNavigationPending = false;
  firstMountInDocument = true;
}

export default function ScrollListingToTop() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    if (shouldScrollListingToTop()) {
      window.scrollTo(0, 0);
      // Secondary frame check in case streaming or layout shift on mobile happens right after mount
      requestAnimationFrame(() => {
        if (window.scrollY > 0) {
          window.scrollTo(0, 0);
        }
      });
    }
  }, [pathname]);
  return null;
}
