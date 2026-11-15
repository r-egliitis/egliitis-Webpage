"use client";

import { useState, type FormEvent } from "react";
import { TagChips } from "@/components/daylog/tag-chips";
import { fieldClass, labelClass, Sheet, SheetHeader } from "@/components/os/sheet";
import type { TimelineEntry } from "@/lib/daylog/slots";
import { formatTime, rangeLabel } from "@/lib/daylog/time";
import { cn } from "@/lib/utils";
import type { DaylogTag } from "@/types/database";

type EntrySheetProps = {
  entry: TimelineEntry | null;
  tags: Pick<DaylogTag, "id" | "name" | "color">[];
  showTags: boolean;
  onClose: () => void;
  onSave: (entry: TimelineEntry, body: string, tagIds: string[]) => void;
  onDelete: (entry: TimelineEntry) => void;
  onCreateTag: (name: string) => string;
};

export function EntrySheet({ entry, ...props }: EntrySheetProps) {
  return (
    <Sheet open={entry !== null} label="Edit entry" onClose={props.onClose}>
      {entry && <EntryForm key={entry.id} entry={entry} {...props} />}
    </Sheet>
  );
}

function EntryForm({ entry, tags, showTags, onClose, onSave, onDelete, onCreateTag }: Omit<EntrySheetProps, "entry"> & { entry: TimelineEntry }) {
  const [body, setBody] = useState(entry.body ?? "");
  const [tagIds, setTagIds] = useState(entry.tagIds);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const opening = entry.kind === "opening";

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    onSave(entry, body.trim(), tagIds);
    onClose();
  }

  const toggle = (id: string) => setTagIds((current) => (current.includes(id) ? current.filter((tagId) => tagId !== id) : [...current, id]));

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:p-6">
      <SheetHeader title={opening ? `Until ${formatTime(entry.start)}` : rangeLabel(entry.start, entry.end)} onClose={onClose} />

      <label className={labelClass}>
        What you did
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={4}
          maxLength={2000}
          required
          className={cn(fieldClass, "resize-y normal-case tracking-normal")}
        />
      </label>

      {showTags && (
        <div>
          <p className={labelClass}>Tags</p>
          <div className="mt-2">
            <TagChips tags={tags} selected={tagIds} onToggle={toggle} onCreate={(name) => setTagIds((current) => [...current, onCreateTag(name)])} />
          </div>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-3">
        {opening ? (
          <span className="text-xs text-muted">The first entry started the day, so it stays.</span>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (!confirmDelete) return setConfirmDelete(true);
              onDelete(entry);
              onClose();
            }}
            onBlur={() => setConfirmDelete(false)}
            className={cn(
              "min-h-11 rounded-full px-4 text-sm transition-colors",
              confirmDelete ? "bg-accent font-medium text-[#f0eee9]" : "text-muted hover:text-fg",
            )}
          >
            {confirmDelete ? "Tap again to delete" : "Delete"}
          </button>
        )}
        <button
          type="submit"
          disabled={!body.trim()}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-fg px-6 text-sm font-medium text-surface transition-[box-shadow,opacity] hover:shadow-[0_0_28px_var(--glow)] disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </form>
  );
}
