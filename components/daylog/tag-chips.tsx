"use client";

import { useState, type FormEvent } from "react";
import { AreaDot } from "@/components/os/area-dot";
import { chipClass } from "@/components/os/quick-add";
import { cn } from "@/lib/utils";
import type { DaylogTag } from "@/types/database";

type TagChipsProps = {
  tags: Pick<DaylogTag, "id" | "name" | "color">[];
  selected: string[];
  onToggle: (tagId: string) => void;
  /** Creates a new tag; the caller selects it. */
  onCreate: (name: string) => void;
  compact?: boolean;
};

// Your own reusable tags. "+ tag" makes a new one inline.
export function TagChips({ tags, selected, onToggle, onCreate, compact }: TagChipsProps) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  function create(event: FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = tags.find((tag) => tag.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (!selected.includes(existing.id)) onToggle(existing.id);
    } else onCreate(trimmed);
    setName("");
    setAdding(false);
  }

  const small = compact ? "h-8 px-2.5 text-xs" : "";

  return (
    <div role="group" aria-label="Tags" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
      {tags.map((tag) => (
        <button
          key={tag.id}
          type="button"
          aria-pressed={selected.includes(tag.id)}
          onClick={() => onToggle(tag.id)}
          className={cn(chipClass(selected.includes(tag.id)), small)}
        >
          <AreaDot color={tag.color} />
          {tag.name}
        </button>
      ))}
      {adding ? (
        // Not a nested <form>: the composer is already one.
        <span className="flex shrink-0 items-center gap-1">
          <label>
            <span className="sr-only">New tag name</span>
            <input
              autoFocus
              value={name}
              maxLength={40}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") create(event);
                if (event.key === "Escape") setAdding(false);
              }}
              onBlur={() => !name.trim() && setAdding(false)}
              placeholder="Tag name"
              className={cn("h-9 w-32 rounded-full border border-fg bg-transparent px-3 text-sm outline-none", compact && "h-8 text-xs")}
            />
          </label>
          <button type="button" onClick={create} className={cn(chipClass(true), small)}>
            Add
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className={cn(chipClass(false), small, "border-dashed")}>
          + tag
        </button>
      )}
    </div>
  );
}
