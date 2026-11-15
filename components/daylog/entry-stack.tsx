"use client";

import { AreaDot } from "@/components/os/area-dot";
import type { Slot, TimelineEntry, TimelineItem } from "@/lib/daylog/slots";
import { formatTime, rangeLabel } from "@/lib/daylog/time";
import { cn } from "@/lib/utils";
import type { DaylogTag } from "@/types/database";

type EntryStackProps = {
  items: TimelineItem[];
  tags: Pick<DaylogTag, "id" | "name" | "color">[];
  /** The time the composer is writing (one or more slots); hidden from the stack. */
  composerRange: Slot | null;
  onFill?: (slot: Slot) => void;
  onOpen?: (entry: TimelineEntry) => void;
};

function TimeLabel({ children }: { children: string }) {
  return <p className="mb-1 px-1 font-mono text-[0.6875rem] tracking-wide text-muted">{children}</p>;
}

// Chat-like stack: oldest at the top, newest just above the composer.
export function EntryStack({ items, tags, composerRange, onFill, onOpen }: EntryStackProps) {
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));

  return (
    <ol className="flex flex-col gap-3">
      {items.map((item) => {
        if (item.type === "current") return null;
        if (item.type === "empty") {
          if (composerRange && item.slot.start >= composerRange.start && item.slot.end <= composerRange.end) return null;
          return (
            <li key={`slot-${item.slot.start}`}>
              <TimeLabel>{rangeLabel(item.slot.start, item.slot.end)}</TimeLabel>
              <button
                type="button"
                onClick={() => onFill?.(item.slot)}
                disabled={!onFill}
                className="w-full rounded-2xl border border-dashed border-line px-4 py-3 text-left text-sm text-muted transition-colors hover:border-fg hover:text-fg disabled:hover:border-line disabled:hover:text-muted"
              >
                {onFill ? "Nothing written · tap to fill in" : "Nothing written"}
              </button>
            </li>
          );
        }

        const { entry } = item;
        const label = item.type === "opening" ? `until ${formatTime(entry.start)}` : rangeLabel(entry.start, entry.end);
        const entryTags = entry.tagIds.map((id) => tagById.get(id)).filter((tag) => tag !== undefined);
        return (
          <li key={entry.id}>
            <TimeLabel>{label}</TimeLabel>
            <button
              type="button"
              onClick={() => onOpen?.(entry)}
              disabled={!onOpen}
              className={cn(
                "w-full rounded-2xl bg-fg/[0.06] px-4 py-3 text-left transition-colors hover:bg-fg/[0.09] disabled:hover:bg-fg/[0.06]",
                item.type === "opening" && "bg-fg/[0.03] ring-1 ring-line",
                entry.skipped && "text-muted italic",
              )}
            >
              <span className="block whitespace-pre-wrap break-words leading-snug">{entry.skipped ? "Skipped" : entry.body}</span>
              {entryTags.length > 0 && (
                <span className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs text-muted">
                  {entryTags.map((tag) => (
                    <span key={tag.id} className="flex items-center gap-1.5">
                      <AreaDot color={tag.color} />
                      {tag.name}
                    </span>
                  ))}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
