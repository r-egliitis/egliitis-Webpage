"use client";

import { useEffect, useState } from "react";

/**
 * "Now" for the Day Log UI, corrected by the difference between this
 * device's clock and the server's at page load. Re-renders every 15 s and
 * whenever the tab becomes visible, so slots roll over on time.
 */
export function useClock(serverNow: number): number {
  const [offset] = useState(() => serverNow - Date.now());
  const [now, setNow] = useState(serverNow);

  useEffect(() => {
    const tick = () => setNow(Date.now() + offset);
    tick();
    const timer = setInterval(tick, 15_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [offset]);

  return now;
}
