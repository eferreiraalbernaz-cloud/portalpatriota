"use client";

import { useLayoutEffect } from "react";

// Also covers client-side/programmatic transitions from the public layout.
export function AdFreeBoundary({ children }: { children: React.ReactNode }) {
  useLayoutEffect(() => {
    if (window.__portalMonetagStarted) window.location.reload();
  }, []);
  return children;
}
