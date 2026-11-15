"use client";

import { useState, type FormEvent, type RefObject } from "react";
import { EntryInput } from "@/components/daylog/entry-input";
import { TagChips } from "@/components/daylog/tag-chips";
import type { DaylogTag } from "@/types/database";
import type { Slot } from "@/lib/daylog/slots";
import { rangeLabel } from "@/lib/daylog/time";

export type ComposerSubmit = { start: number; end: number; body: string; tagIds: string[] };

type ComposerProps = {
  target: Slot;
  /** Empty slots right before the target, nearest first: one entry can cover them too. */
  earlier: Slot[];
  /** How many of `earlier` this entry also covers. */
  extra: number;
  onExtraChange: (extra: number) => void;
  tags: Pick<DaylogTag, "id" | "name" | "color">[];
  showTags: boolean;
  /** Creates a tag and returns its id. */
  onCreateTag: (name: string) => string;
  /** True when the target was picked by tapping an older gap. */
  backfilling: boolean;
  now: number;
  onSubmit: (entry: ComposerSubmit) => void;
  onCancelBackfill: () => void;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
};

// The input at the bottom: which time it's for, above the field.
const stepButton =
  "h-7 min-w-7 rounded-full border border-line px-2 font-mono text-xs text-muted transition-colors hover:border-fg hover:text-fg disabled:opacity-30 disabled:hover:border-line disabled:hover:text-muted";

export function Composer({
  target,
  earlier,
  extra,
  onExtraChange: setExtra,
  tags,
  showTags,
  onCreateTag,
  backfilling,
  now,
  onSubmit,
  onCancelBackfill,
  inputRef,
}: ComposerProps) {
  const [body, setBody] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const toggleTag = (id: string) =>
    setTagIds((current) => (current.includes(id) ? current.filter((tagId) => tagId !== id) : [...current, id]));
  const covered = Math.min(extra, earlier.length);
  const start = covered > 0 ? earlier[covered - 1].start : target.start;
  const running = target.end > now;
  const label = rangeLabel(start, target.end);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const text = body.trim();
    if (!text) return;
    onSubmit({ start, end: target.end, body: text, tagIds });
    setBody("");
    setTagIds([]);
    setExtra(0);
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-line bg-surface/95 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-md">
      <div className="flex items-center justify-between gap-2 px-2 pt-1 pb-2">
        <p className="font-mono text-xs">
          <span className="text-fg">{label}</span>
          <span className="text-muted">{backfilling ? " · filling in" : running ? " · in progress" : ""}</span>
        </p>
        <div className="flex items-center gap-2">
          {backfilling && (
            <button type="button" onClick={onCancelBackfill} className="font-mono text-xs text-muted underline decoration-line underline-offset-4 hover:text-fg">
              back to latest
            </button>
          )}
          {earlier.length > 0 && (
            <div role="group" aria-label="Time covered" className="flex items-center gap-1">
              <button type="button" onClick={() => setExtra(covered - 1)} disabled={covered === 0} aria-label="Cover one slot less" className={stepButton}>
                −
              </button>
              <button type="button" onClick={() => setExtra(covered + 1)} disabled={covered >= earlier.length} aria-label="Also cover the slot before" className={stepButton}>
                + earlier
              </button>
            </div>
          )}
        </div>
      </div>
      <EntryInput
        value={body}
        onChange={setBody}
        onSubmit={submit}
        label={`What did you do ${label}?`}
        placeholder="What did you do?"
        submitLabel="Save entry"
        inputRef={inputRef}
      />
      {showTags && (
        <div className="px-1 pt-2">
          <TagChips
            compact
            tags={tags}
            selected={tagIds}
            onToggle={toggleTag}
            onCreate={(name) => setTagIds((current) => [...current, onCreateTag(name)])}
          />
        </div>
      )}
    </form>
  );
}
