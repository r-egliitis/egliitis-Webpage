import type { DayShape, TimelineEntry } from "@/lib/daylog/slots";
import { toMs } from "@/lib/daylog/time";
import type { DaylogDay, DaylogEntry, DaylogEntryTag, DaylogPause } from "@/types/database";

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
    missedSlotMode: day.settings_snapshot?.missed_slot_mode ?? "backfill",
    lockAfterSlots: day.settings_snapshot?.lock_after_slots ?? 3,
  };
}

export type PauseRow = { id: string; start: number; end: number | null; resumeAt: number | null };

export function toPauses(rows: Pick<DaylogPause, "id" | "started_at" | "ended_at" | "resume_at">[]): PauseRow[] {
  return rows.map((row) => ({
    id: row.id,
    start: toMs(row.started_at),
    end: row.ended_at ? toMs(row.ended_at) : null,
    resumeAt: row.resume_at ? toMs(row.resume_at) : null,
  }));
}
