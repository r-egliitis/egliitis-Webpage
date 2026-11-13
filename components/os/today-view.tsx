"use client";

import { useCallback, useMemo, useState } from "react";
import { signOut } from "@/app/os/actions";
import { createTask, setTaskStatus } from "@/app/os/(private)/actions/tasks";
import { EmptyState } from "@/components/os/empty-state";
import { QuickAdd, type QuickAddInput } from "@/components/os/quick-add";
import { TaskItem } from "@/components/os/task-item";
import { TaskSection } from "@/components/os/task-section";
import { Toast, type ToastMessage } from "@/components/os/toast";
import { formatLongDate } from "@/lib/os/dates";
import { groupTodayTasks } from "@/lib/os/group-tasks";
import { draftTask, statusPatch, useOptimisticTasks } from "@/lib/os/use-optimistic-tasks";
import type { Area, Project, Task, TaskStatus } from "@/types/database";

type TodayViewProps = {
  today: string;
  tasks: Task[];
  areas: Area[];
  projects: Project[];
};

export function TodayView({ today, tasks: serverTasks, areas }: TodayViewProps) {
  const { tasks, run, error, clearError } = useOptimisticTasks(serverTasks);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const dismissToast = useCallback(() => setToast(null), []);

  const areaById = useMemo(() => new Map(areas.map((area) => [area.id, area])), [areas]);
  const groups = useMemo(() => groupTodayTasks(tasks, today), [tasks, today]);
  const openCount = tasks.filter((task) => task.status !== "done").length;
  const nothingToday = groups.overdue.length + groups.today.length + groups.doing.length === 0;

  function changeStatus(task: Task, status: TaskStatus) {
    return run({ type: "patch", ids: [task.id], patch: statusPatch(status) }, () => setTaskStatus(task.id, status));
  }

  async function toggle(task: Task) {
    if (task.status === "done") {
      await changeStatus(task, "todo");
      return;
    }
    const previous = task.status;
    const result = await changeStatus(task, "done");
    if (result.ok) {
      setToast({
        id: Date.now(),
        text: `Done: ${task.title}`,
        action: { label: "Undo", onClick: () => void changeStatus({ ...task, status: "done" }, previous) },
      });
    }
  }

  function add(input: QuickAddInput) {
    const task = draftTask({ id: input.id, title: input.title, area_id: input.areaId, due_date: input.dueDate });
    void run({ type: "add", task }, () => createTask(input));
  }

  const renderTask = (task: Task) => (
    <TaskItem
      key={task.id}
      task={task}
      today={today}
      area={task.area_id ? areaById.get(task.area_id) : undefined}
      onToggle={toggle}
    />
  );

  const errorToast: ToastMessage | null = error ? { id: 0, text: error, tone: "error" } : null;

  return (
    // Extra bottom padding on phones keeps the last task clear of the quick-add bar.
    <div className="mx-auto max-w-2xl pb-36 md:pb-0">
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

      {/* Phone: pinned above the tab bar, in thumb reach. Desktop: sticky at the top. */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-30 px-3 pb-2 md:sticky md:inset-x-auto md:top-0 md:bottom-auto md:mt-6 md:bg-surface md:px-0 md:py-3">
        <div className="mx-auto max-w-2xl">
          <QuickAdd areas={areas} today={today} onAdd={add} />
        </div>
      </div>

      {nothingToday && (
        <div className="mt-8">
          <EmptyState title="Nothing due today.">
            {tasks.length === 0
              ? "Add your first task with the bar below."
              : "Pick something from No date, or enjoy the free time."}
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
            <span aria-hidden className="inline-block transition-transform group-open:rotate-90">
              ›
            </span>
            No date
            <span className="text-fg">{groups.noDate.length}</span>
          </summary>
          <ul className="mt-2">{groups.noDate.map(renderTask)}</ul>
        </details>
      )}

      <Toast toast={errorToast ?? toast} onDismiss={error ? clearError : dismissToast} />
    </div>
  );
}
