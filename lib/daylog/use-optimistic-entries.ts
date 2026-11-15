"use client";

import { useCallback, useOptimistic, useState, useTransition } from "react";
import type { TimelineEntry } from "@/lib/daylog/slots";
import type { ActionResult } from "@/lib/os/schemas";

// Same pattern as lib/os/use-optimistic-tasks.ts, for Day Log entries.

export type EntryChange =
  | { type: "add"; entry: TimelineEntry }
  | { type: "patch"; id: string; patch: Partial<TimelineEntry> }
  | { type: "remove"; id: string };

function applyChange(entries: TimelineEntry[], change: EntryChange): TimelineEntry[] {
  switch (change.type) {
    case "add":
      return entries.some((entry) => entry.id === change.entry.id) ? entries : [...entries, change.entry];
    case "patch":
      return entries.map((entry) => (entry.id === change.id ? { ...entry, ...change.patch } : entry));
    case "remove":
      return entries.filter((entry) => entry.id !== change.id);
  }
}

export function useOptimisticEntries(entries: TimelineEntry[]) {
  const [optimistic, apply] = useOptimistic(entries, applyChange);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    (change: EntryChange, action: () => Promise<ActionResult>) =>
      new Promise<ActionResult>((resolve) => {
        setError(null);
        startTransition(async () => {
          apply(change);
          const result = await action();
          if (!result.ok) setError(result.error);
          resolve(result);
        });
      }),
    [apply],
  );
  const clearError = useCallback(() => setError(null), []);

  return { entries: optimistic, run, pending, error, clearError };
}
