"use client";

import { AreaDot } from "@/components/os/area-dot";
import { formatDayLabel } from "@/lib/os/dates";
import { cn } from "@/lib/utils";
import type { Area, Task } from "@/types/database";

type TaskItemProps = {
  task: Task;
  area?: Area;
  today: string;
  onToggle?: (task: Task) => void;
  onOpen?: (task: Task) => void;
};

export function TaskItem({ task, area, today, onToggle, onOpen }: TaskItemProps) {
  const done = task.status === "done";
  const overdue = !done && task.due_date !== null && task.due_date < today;

  return (
    <li className="group flex items-start gap-3 border-b border-line py-1 last:border-b-0">
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Reopen "${task.title}"` : `Mark "${task.title}" done`}
        disabled={!onToggle}
        onClick={() => onToggle?.(task)}
        // 44px tap target around an 22px box.
        className="-ml-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
      >
        <span
          className={cn(
            "flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 transition-[background-color,border-color]",
            done ? "border-fg bg-fg text-surface" : "border-muted group-hover:border-fg",
            task.priority === 1 && !done && "border-accent",
          )}
        >
          {done && (
            <svg viewBox="0 0 16 16" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
      </button>

      <button
        type="button"
        onClick={() => onOpen?.(task)}
        disabled={!onOpen}
        className="min-w-0 flex-1 py-2.5 text-left"
      >
        <span className={cn("block break-words leading-snug", done && "text-muted line-through")}>
          {task.title}
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs text-muted">
          {task.priority === 1 && <span className="text-fg">High</span>}
          {task.status === "doing" && <span className="text-fg">Doing</span>}
          {task.due_date && (
            <span className={cn(overdue && "font-bold text-fg")}>{formatDayLabel(task.due_date, today)}</span>
          )}
          {area && (
            <span className="flex items-center gap-1.5">
              <AreaDot color={area.color} />
              {area.name}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
