"use client";

import { useRef, useState, type FormEvent } from "react";
import { AreaDot } from "@/components/os/area-dot";
import { addDays, formatDayLabel } from "@/lib/os/dates";
import { cn } from "@/lib/utils";
import type { Area } from "@/types/database";

export type QuickAddInput = { id: string; title: string; areaId: string | null; dueDate: string | null };

type QuickAddProps = {
  areas: Area[];
  today: string;
  /** Area preselected for new tasks (e.g. the active filter). */
  defaultAreaId?: string | null;
  /** Start with "Today" selected (the Today screen) or with no date. */
  dueTodayByDefault?: boolean;
  placeholder?: string;
  onAdd: (input: QuickAddInput) => void;
};

export const chipClass = (selected: boolean) =>
  cn(
    "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors",
    selected ? "border-fg bg-fg text-surface" : "border-line text-muted hover:border-fg hover:text-fg",
  );

// Title + optional area + optional due date. Enter submits; the input keeps
// focus so several tasks can be added in a row.
export function QuickAdd({
  areas,
  today,
  defaultAreaId = null,
  dueTodayByDefault = true,
  placeholder = "Add a task…",
  onAdd,
}: QuickAddProps) {
  const tomorrow = addDays(today, 1);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState<string | null>(dueTodayByDefault ? today : null);
  const [areaChoice, setAreaChoice] = useState<string | null | undefined>(undefined);
  const dateInput = useRef<HTMLInputElement>(null);

  // Follows the active filter until an area is picked by hand.
  const areaId = areaChoice === undefined ? defaultAreaId : areaChoice;
  const pickedDate = dueDate && dueDate !== today && dueDate !== tomorrow ? dueDate : null;

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onAdd({ id: crypto.randomUUID(), title: trimmed, areaId, dueDate });
    setTitle("");
  }

  function openDatePicker() {
    const input = dateInput.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-line bg-surface p-2 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
      <div className="flex items-center gap-2">
        <label htmlFor="quick-add-title" className="sr-only">
          New task
        </label>
        <input
          id="quick-add-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="done"
          maxLength={300}
          className="h-11 min-w-0 flex-1 bg-transparent px-3 text-base outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={!title.trim()}
          aria-label="Add task"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fg text-surface transition-opacity disabled:opacity-30"
        >
          <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>

      <div className="-mx-2 mt-1 flex gap-2 overflow-x-auto px-2 pb-1 [scrollbar-width:none]">
        <button type="button" aria-pressed={dueDate === today} onClick={() => setDueDate(dueDate === today ? null : today)} className={chipClass(dueDate === today)}>
          Today
        </button>
        <button type="button" aria-pressed={dueDate === tomorrow} onClick={() => setDueDate(dueDate === tomorrow ? null : tomorrow)} className={chipClass(dueDate === tomorrow)}>
          Tomorrow
        </button>
        <button type="button" aria-pressed={pickedDate !== null} onClick={openDatePicker} className={chipClass(pickedDate !== null)}>
          {pickedDate ? formatDayLabel(pickedDate, today) : "Date…"}
        </button>
        <input
          ref={dateInput}
          type="date"
          tabIndex={-1}
          aria-hidden
          value={pickedDate ?? ""}
          min={today}
          onChange={(event) => setDueDate(event.target.value || null)}
          className="sr-only"
        />

        <span aria-hidden className="my-2 w-px shrink-0 bg-line" />

        {areas.map((area) => (
          <button
            key={area.id}
            type="button"
            aria-pressed={areaId === area.id}
            onClick={() => setAreaChoice(areaId === area.id ? null : area.id)}
            className={chipClass(areaId === area.id)}
          >
            <AreaDot color={area.color} />
            {area.name}
          </button>
        ))}
      </div>
    </form>
  );
}
