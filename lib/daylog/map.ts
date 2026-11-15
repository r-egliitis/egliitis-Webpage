import type { DayShape, TimelineEntry } from "@/lib/daylog/slots";
import { toMs } from "@/lib/daylog/time";
import type { DaylogDay, DaylogEntry, DaylogEntryTag } from "@/types/database";

// Database rows → the shapes lib/daylog/slots.ts works with.

export function toTimelineEntries(
  entries: Pick<DaylogEntry, "id" | "kind" | "start_at" | "end_at" | "body" | "skipped">[],
  links: Pick<DaylogEntryTag, "entry_id" | "tag_id">[],
): TimelineEntry[] {
  const tagsByEntry = new Map<string, string[]>();
  for (const link of links) {
    const list = tagsByEntry.get(link.entry_id) ?? [];
    list.push(link.tag_id);
    tagsByEntry.set(link.entry_id, list);
  }
  return entries.map((entry) => ({
    id: entry.id,
    kind: entry.kind,
    start: toMs(entry.start_at),
    end: toMs(entry.end_at),
    body: entry.body,
    skipped: entry.skipped,
    tagIds: tagsByEntry.get(entry.id) ?? [],
  }));
}

/** null for days that never started (scheduled/missed). */
export function toDayShape(day: DaylogDay): DayShape | null {
  if (!day.started_at) return null;
  return {
    startedAt: toMs(day.started_at),
    endedAt: day.ended_at ? toMs(day.ended_at) : null,
    windowEnd: toMs(day.window_end),
    intervalMinutes: day.settings_snapshot?.interval_minutes ?? 20,
  };
}
