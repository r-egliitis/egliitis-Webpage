"use client";

import { useMemo } from "react";
import { signOut } from "@/app/os/actions";
import { EmptyState } from "@/components/os/empty-state";
import { TaskItem } from "@/components/os/task-item";
import { TaskSection } from "@/components/os/task-section";
import { formatLongDate } from "@/lib/os/dates";
import { groupTodayTasks } from "@/lib/os/group-tasks";
import type { Area, Project, Task } from "@/types/database";

type TodayViewProps = {
  today: string;
  tasks: Task[];
  areas: Area[];
  projects: Project[];
};

export function TodayView({ today, tasks, areas }: TodayViewProps) {
  const areaById = useMemo(() => new Map(areas.map((area) => [area.id, area])), [areas]);
  const groups = useMemo(() => groupTodayTasks(tasks, today), [tasks, today]);
  const openCount = tasks.filter((task) => task.status !== "done").length;
  const nothingToday = groups.overdue.length + groups.today.length + groups.doing.length === 0;

  const renderTask = (task: Task) => (
    <TaskItem key={task.id} task={task} today={today} area={task.area_id ? areaById.get(task.area_id) : undefined} />
  );

  return (
    <div>
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">{formatLongDate(today)}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Today</h1>
          <p className="mt-1 text-sm text-muted">
            {openCount === 1 ? "1 open task" : `${openCount} open tasks`}
          </p>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-full border border-line px-3 py-1.5 font-mono text-xs text-muted transition-colors hover:border-fg hover:text-fg"
          >
            Sign out
          </button>
        </form>
      </header>

      {nothingToday && (
        <div className="mt-8">
          <EmptyState title="Nothing due today.">
            {tasks.length === 0 ? "Add your first task above." : "Pick something from No date below, or enjoy it."}
          </EmptyState>
        </div>
      )}

      <TaskSection title="Overdue" count={groups.overdue.length}>
        {groups.overdue.map(renderTask)}
      </TaskSection>
      <TaskSection title="Today" count={groups.today.length}>
        {groups.today.map(renderTask)}
      </TaskSection>
      <TaskSection title="Doing" count={groups.doing.length}>
        {groups.doing.map(renderTask)}
      </TaskSection>

      {groups.noDate.length > 0 && (
        <details className="group mt-8">
          <summary className="flex cursor-pointer list-none items-baseline gap-2 font-mono text-xs uppercase tracking-[0.2em] text-muted hover:text-fg">
            <span aria-hidden className="inline-block transition-transform group-open:rotate-90">›</span>
            No date
            <span className="text-fg">{groups.noDate.length}</span>
          </summary>
          <ul className="mt-2">{groups.noDate.map(renderTask)}</ul>
        </details>
      )}
    </div>
  );
}
