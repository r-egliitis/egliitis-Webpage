"use client";

import { useState, type FormEvent, type RefObject } from "react";
import { EntryInput } from "@/components/daylog/entry-input";
import type { Slot } from "@/lib/daylog/slots";
import { rangeLabel } from "@/lib/daylog/time";

export type ComposerSubmit = { start: number; end: number; body: string; tagIds: string[] };

type ComposerProps = {
  target: Slot;
  /** True when the target was picked by tapping an older gap. */
  backfilling: boolean;
  now: number;
  onSubmit: (entry: ComposerSubmit) => void;
  onCancelBackfill: () => void;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
};

// The input at the bottom: which time it's for, above the field.
export function Composer({ target, backfilling, now, onSubmit, onCancelBackfill, inputRef }: ComposerProps) {
  const [body, setBody] = useState("");
  const running = target.end > now;

  function submit(event?: FormEvent) {
    event?.preventDefault();
    const text = body.trim();
    if (!text) return;
    onSubmit({ start: target.start, end: target.end, body: text, tagIds: [] });
    setBody("");
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-line bg-surface/95 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-md">
      <div className="flex items-center justify-between gap-2 px-2 pt-1 pb-2">
        <p className="font-mono text-xs">
          <span className="text-fg">{rangeLabel(target.start, target.end)}</span>
          <span className="text-muted">{backfilling ? " · filling in" : running ? " · in progress" : ""}</span>
        </p>
        {backfilling && (
          <button type="button" onClick={onCancelBackfill} className="font-mono text-xs text-muted underline decoration-line underline-offset-4 hover:text-fg">
            back to latest
          </button>
        )}
      </div>
      <EntryInput
        value={body}
        onChange={setBody}
        onSubmit={submit}
        label={`What did you do ${rangeLabel(target.start, target.end)}?`}
        placeholder="What did you do?"
        submitLabel="Save entry"
        inputRef={inputRef}
      />
    </form>
  );
}
