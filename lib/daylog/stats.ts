// Numbers for one Day Log day, computed from its timeline (lib/daylog/slots.ts).
// Pure, shared by the day page, compare and export. Durations are ms.

import type { DayShape, Pause, Slot, TimelineItem } from "@/lib/daylog/slots";

export type TagTime = { tagId: string | null; ms: number }; // tagId null = untagged

export type DayStats = {
  start: number;
  end: number;
  /** From the opening entry to the end (or now, while running). */
  trackedMs: number;
  /** Time covered by written entries (not skipped). */
  writtenMs: number;
  pausedMs: number;
  entries: number;
  slots: { empty: number; skipped: number; locked: number };
  /**
   * Time per tag, most first; untagged last. An entry with several tags
   * counts its full time towards each, so tags can add up to more than writtenMs.
   */
  perTag: TagTime[];
  /** Longest stretches with nothing written (adjacent empty slots merged), longest first. */
  longestGaps: Slot[];
};

export function dayStats(day: DayShape, items: TimelineItem[], pauses: Pause[], now: number): DayStats {
  const end = day.endedAt ?? Math.min(now, day.windowEnd);
  let writtenMs = 0;
  let entries = 0;
  const slots = { empty: 0, skipped: 0, locked: 0 };
  const tagMs = new Map<string | null, number>();
  const gaps: Slot[] = [];
  let gap: Slot | null = null;

  for (const item of items) {
    if (item.type === "empty") {
      if (item.locked) slots.locked++;
      else slots.empty++;
      gap = gap ? { start: gap.start, end: item.slot.end } : { ...item.slot };
      continue;
    }
    if (gap) gaps.push(gap);
    gap = null;

    if (item.type !== "entry") continue;
    const { entry } = item;
    if (entry.skipped) {
      slots.skipped++;
      continue;
    }
    const ms = Math.max(0, Math.min(entry.end, end) - entry.start);
    entries++;
    writtenMs += ms;
    const keys = entry.tagIds.length > 0 ? entry.tagIds : [null];
    for (const key of keys) tagMs.set(key, (tagMs.get(key) ?? 0) + ms);
  }
  if (gap) gaps.push(gap);

  const pausedMs = pauses.reduce(
    (sum, pause) => sum + Math.max(0, Math.min(pause.end ?? end, end) - Math.max(pause.start, day.startedAt)),
    0,
  );

  const perTag = [...tagMs.entries()]
    .map(([tagId, ms]) => ({ tagId, ms }))
    .sort((a, b) => (a.tagId === null ? 1 : b.tagId === null ? -1 : b.ms - a.ms));

  return {
    start: day.startedAt,
    end,
    trackedMs: Math.max(0, end - day.startedAt),
    writtenMs,
    pausedMs,
    entries,
    slots,
    perTag,
    longestGaps: gaps.sort((a, b) => b.end - b.start - (a.end - a.start)).slice(0, 3),
  };
}
