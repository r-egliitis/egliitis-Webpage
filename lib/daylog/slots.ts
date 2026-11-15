// Turns a Day Log day into the stack you see. Pure functions, shared by the
// server and the browser. Instants are epoch ms.
//
// Slots are clock-aligned: boundaries at multiples of the interval since the
// epoch. Riga's UTC offset is always whole hours and every interval (15, 20,
// 30, 60) divides 60, so these land on :00 :20 :40 local time all year. The
// first slot starts at the opening entry (e.g. 08:07–08:20).

export type Slot = { start: number; end: number };

export type TimelineEntry = {
  id: string;
  kind: "opening" | "slot" | "pause";
  start: number;
  end: number;
  body: string | null;
  skipped: boolean;
  tagIds: string[];
};

export type TimelineItem =
  | { type: "opening"; entry: TimelineEntry }
  | { type: "entry"; entry: TimelineEntry }
  | { type: "empty"; slot: Slot } // ended, nothing written: tap to backfill
  | { type: "current"; slot: Slot }; // still running, nothing written yet

export type DayShape = {
  startedAt: number;
  /** Set once the day has ended (manually or at the window end). */
  endedAt: number | null;
  windowEnd: number;
  intervalMinutes: number;
};

export function stepMs(intervalMinutes: number): number {
  return intervalMinutes * 60_000;
}

/** First boundary strictly after `ms`. */
export function nextBoundary(ms: number, step: number): number {
  return (Math.floor(ms / step) + 1) * step;
}

/** Every slot from the start until now (active) or the end (ended). */
export function daySlots(day: DayShape, now: number): Slot[] {
  const step = stepMs(day.intervalMinutes);
  // Active: up to the end of the slot in progress. Ended: up to the end time.
  const cap = day.endedAt ?? Math.min(day.windowEnd, nextBoundary(now, step));
  const slots: Slot[] = [];
  let start = day.startedAt;
  while (start < cap) {
    const end = Math.min(nextBoundary(start, step), cap);
    slots.push({ start, end });
    start = end;
  }
  return slots;
}

const overlaps = (entry: TimelineEntry, slot: Slot) => entry.start < slot.end && entry.end > slot.start;

/** The ordered stack: opening entry, then entries and empty slots by time. */
export function buildTimeline(day: DayShape, entries: TimelineEntry[], now: number): TimelineItem[] {
  const opening = entries.find((entry) => entry.kind === "opening");
  const ranged = entries.filter((entry) => entry.kind !== "opening").sort((a, b) => a.start - b.start);
  const items: TimelineItem[] = opening ? [{ type: "opening", entry: opening }] : [];
  const emitted = new Set<string>();

  for (const slot of daySlots(day, now)) {
    const covering = ranged.filter((entry) => overlaps(entry, slot));
    if (covering.length > 0) {
      for (const entry of covering) {
        if (emitted.has(entry.id)) continue;
        emitted.add(entry.id);
        items.push({ type: "entry", entry });
      }
      continue;
    }
    const running = day.endedAt === null && slot.end > now;
    items.push(running ? { type: "current", slot } : { type: "empty", slot });
  }

  // Anything outside the slot range (shouldn't happen) still shows, in order.
  for (const entry of ranged) if (!emitted.has(entry.id)) items.push({ type: "entry", entry });
  return items;
}

/**
 * The slot the input at the bottom points at: the most recent ended slot with
 * nothing written, if it comes after everything written so far; otherwise the
 * slot in progress (you can write it early). null once the day has ended
 * (gaps can still be backfilled by tapping them).
 */
export function composerSlot(items: TimelineItem[], ended: boolean): Slot | null {
  if (ended) return null;
  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i];
    if (item.type === "current") {
      // Prefer an ended gap right before the running slot.
      const previous = items[i - 1];
      return previous?.type === "empty" ? previous.slot : item.slot;
    }
    if (item.type === "empty") return item.slot;
    if (item.type === "entry" || item.type === "opening") return null;
  }
  return null;
}

/**
 * Empty slots directly before `target` with nothing written in between, so
 * one entry can cover a range ("+ earlier slot"). Nearest first.
 */
export function earlierEmptySlots(items: TimelineItem[], target: Slot): Slot[] {
  const index = items.findIndex(
    (item) => (item.type === "empty" || item.type === "current") && item.slot.start === target.start,
  );
  const result: Slot[] = [];
  for (let i = index - 1; i >= 0; i--) {
    const item = items[i];
    if (item.type !== "empty") break;
    result.push(item.slot);
  }
  return result;
}

/** The slot starting at the instant in a notification link (?slot=ISO). */
export function slotFromParam(items: TimelineItem[], param: string | null): Slot | null {
  if (!param) return null;
  const at = Date.parse(param);
  if (Number.isNaN(at)) return null;
  for (const item of items) {
    if ((item.type === "empty" || item.type === "current") && item.slot.start === at) return item.slot;
  }
  return null;
}

/** Counts for headers and stats. */
export function timelineCounts(items: TimelineItem[]) {
  let filled = 0;
  let empty = 0;
  for (const item of items) {
    if (item.type === "entry") filled++;
    if (item.type === "empty") empty++;
  }
  return { filled, empty };
}
