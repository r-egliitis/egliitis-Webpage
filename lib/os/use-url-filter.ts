"use client";

import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * A single query-string value kept in the URL without a server round trip.
 * history.replaceState is picked up by Next's router, so useSearchParams
 * stays in sync and a reload keeps the filter.
 */
export function useUrlFilter(key: string): [string | null, (value: string | null) => void] {
  const searchParams = useSearchParams();
  const value = searchParams.get(key);

  const setValue = useCallback(
    (next: string | null) => {
      const params = new URLSearchParams(window.location.search);
      if (next) params.set(key, next);
      else params.delete(key);
      const query = params.toString();
      window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
    },
    [key],
  );

  return [value, setValue];
}
