"use client";

import { useState, useTransition } from "react";
import { deleteTag, updateTag } from "@/app/os/(private)/actions/daylog";
import { AreaDot } from "@/components/os/area-dot";
import { EmptyState } from "@/components/os/empty-state";
import { TAG_COLORS } from "@/lib/daylog/tag-colors";
import { cn } from "@/lib/utils";
import type { DaylogTag } from "@/types/database";

// Rename (saves on Enter or leaving the field), recolour, delete (tap twice).
export function TagManager({ tags }: { tags: DaylogTag[] }) {
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const run = (action: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if (!result.ok) setError(result.error ?? "Couldn't save that.");
    });

  if (tags.length === 0) {
    return <EmptyState title="No tags yet.">Create tags while writing an entry with &ldquo;+ tag&rdquo;.</EmptyState>;
  }

  return (
    <div>
      <ul className="flex flex-col">
        {tags.map((tag) => (
          <li key={tag.id} className="flex flex-wrap items-center gap-3 border-b border-line py-3 last:border-b-0">
            <AreaDot color={tag.color} className="h-3 w-3" />
            <label className="min-w-0 flex-1">
              <span className="sr-only">Tag name</span>
              <input
                key={tag.name}
                defaultValue={tag.name}
                maxLength={40}
                onBlur={(event) => {
                  const name = event.target.value.trim();
                  if (name && name !== tag.name) run(() => updateTag({ id: tag.id, name }));
                }}
                onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
                className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1.5 outline-none hover:border-line focus:border-fg"
              />
            </label>
            <div role="group" aria-label={`Colour for ${tag.name}`} className="flex gap-1">
              {TAG_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={color}
                  aria-pressed={tag.color?.toLowerCase() === color.toLowerCase()}
                  onClick={() => run(() => updateTag({ id: tag.id, color }))}
                  className={cn(
                    "h-6 w-6 rounded-full ring-offset-2 ring-offset-surface transition-shadow",
                    tag.color?.toLowerCase() === color.toLowerCase() && "ring-2 ring-fg",
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => (confirming === tag.id ? run(() => deleteTag(tag.id)) : setConfirming(tag.id))}
              onBlur={() => setConfirming(null)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs transition-colors",
                confirming === tag.id ? "bg-accent font-medium text-[#f0eee9]" : "text-muted hover:text-fg",
              )}
            >
              {confirming === tag.id ? "Tap again to delete" : "Delete"}
            </button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="mt-3 text-sm">
          <span aria-hidden className="mr-2 inline-block h-2 w-2 rounded-full bg-accent" />
          {error}
        </p>
      )}
    </div>
  );
}
