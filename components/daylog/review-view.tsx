"use client";

import { TagChips } from "@/components/daylog/tag-chips";
import { EmptyState } from "@/components/os/empty-state";
import type { TimelineEntry } from "@/lib/daylog/slots";
import { formatTime, rangeLabel } from "@/lib/daylog/time";
import type { DaylogTag } from "@/types/database";

type ReviewViewProps = {
  entries: TimelineEntry[];
  tags: Pick<DaylogTag, "id" | "name" | "color">[];
  onSetTags: (entry: TimelineEntry, tagIds: string[]) => void;
  onCreateTag: (name: string) => string;
};

// End-of-day review: every written entry with tag chips. Each tap saves.
export function ReviewView({ entries, tags, onSetTags, onCreateTag }: ReviewViewProps) {
  const written = entries.filter((entry) => !entry.skipped).sort((a, b) => a.start - b.start);
  if (written.length === 0) return <EmptyState title="Nothing to tag.">This day has no written entries.</EmptyState>;

  const untagged = written.filter((entry) => entry.tagIds.length === 0).length;

  return (
    <div>
      <p className="font-mono text-xs text-muted">
        {untagged === 0 ? "Everything is tagged." : `${untagged} of ${written.length} ${written.length === 1 ? "entry" : "entries"} without tags`}
      </p>
      <ol className="mt-4 flex flex-col gap-5">
        {written.map((entry) => {
          const toggle = (tagId: string) =>
            onSetTags(entry, entry.tagIds.includes(tagId) ? entry.tagIds.filter((id) => id !== tagId) : [...entry.tagIds, tagId]);
          return (
            <li key={entry.id} className="border-b border-line pb-5 last:border-b-0">
              <p className="font-mono text-[0.6875rem] tracking-wide text-muted">
                {entry.kind === "opening" ? `until ${formatTime(entry.start)}` : rangeLabel(entry.start, entry.end)}
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words leading-snug">{entry.body}</p>
              <div className="mt-3">
                <TagChips
                  compact
                  tags={tags}
                  selected={entry.tagIds}
                  onToggle={toggle}
                  onCreate={(name) => onSetTags(entry, [...entry.tagIds, onCreateTag(name)])}
                />
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
