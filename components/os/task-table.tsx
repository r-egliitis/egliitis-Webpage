"use client";

import { useMemo, useState } from "react";
import { deleteTask, setTaskStatus, updateTask } from "@/app/os/(private)/actions/tasks";
import { AreaDot } from "@/components/os/area-dot";
import { EmptyState } from "@/components/os/empty-state";
import { TaskSheet } from "@/components/os/task-sheet";
import { Toast } from "@/components/os/toast";
import { formatDayLabel } from "@/lib/os/dates";
import type { TaskUpdateInput } from "@/lib/os/schemas";
import { statusPatch, updatePatch, useOptimisticTasks } from "@/lib/os/use-optimistic-tasks";
import { cn } from "@/lib/utils";
import type { Area, Project, Task } from "@/types/database";

type TaskTableProps = {
  tasks: Task[];
  areas: Area[];
  projects: Project[];
  today: string;
  filtered: boolean;
};

const PRIORITY_LABEL = { 1: "High", 2: "Normal", 3: "Low" } as const;
const STATUS_LABEL = { todo: "To do", doing: "Doing", done: "Done" } as const;

// Desktop: a grid with one column per field. Phone: stacked rows.
const rowGrid = "md:grid md:grid-cols-[2.75rem_minmax(0,1fr)_9rem_10rem_7.5rem_6.5rem_6.5rem] md:items-center md:gap-3";

export function TaskTable({ tasks: serverTasks, areas, projects, today, filtered }: TaskTableProps) {
  const { tasks, run, error, clearError } = useOptimisticTasks(serverTasks);
  const [editing, setEditing] = useState<Task | null>(null);
  const areaById = useMemo(() => new Map(areas.map((area) => [area.id, area])), [areas]);
  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);

  function toggle(task: Task) {
    const status = task.status === "done" ? "todo" : "done";
    void run({ type: "patch", ids: [task.id], patch: statusPatch(status) }, () => setTaskStatus(task.id, status));
  }

  function save(input: TaskUpdateInput & { id: string }) {
    void run({ type: "patch", ids: [input.id], patch: updatePatch(input) }, () => updateTask(input));
  }

  function remove(task: Task) {
    void run({ type: "remove", id: task.id }, () => deleteTask(task.id));
  }

  if (tasks.length === 0) {
    return filtered ? (
      <EmptyState title="No tasks match these filters.">Try another filter, or reset them.</EmptyState>
    ) : (
      <EmptyState title="No open tasks.">Add one from Today, or turn on Show completed to see what you finished.</EmptyState>
    );
  }

  return (
    <div>
      <p className="mb-2 font-mono text-xs text-muted">{tasks.length === 1 ? "1 task" : `${tasks.length} tasks`}</p>

      <div className={cn(rowGrid, "hidden border-b border-line pb-2 font-mono text-xs uppercase tracking-[0.15em] text-muted")}>
        <span />
        <span>Task</span>
        <span>Area</span>
        <span>Project</span>
        <span>Due</span>
        <span>Priority</span>
        <span>Status</span>
      </div>

      <ul>
        {tasks.map((task) => {
          const done = task.status === "done";
          const area = task.area_id ? areaById.get(task.area_id) : undefined;
          const project = task.project_id ? projectById.get(task.project_id) : undefined;
          const overdue = !done && task.due_date !== null && task.due_date < today;

          return (
            <li key={task.id} className={cn(rowGrid, "flex items-start gap-3 border-b border-line py-1.5")}>
              <button
                type="button"
                role="checkbox"
                aria-checked={done}
                aria-label={done ? `Reopen "${task.title}"` : `Mark "${task.title}" done`}
                onClick={() => toggle(task)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              >
                <span
                  className={cn(
                    "h-5 w-5 rounded-full border-2 transition-colors",
                    done ? "border-fg bg-fg" : "border-muted hover:border-fg",
                  )}
                />
              </button>

              <button type="button" onClick={() => setEditing(task)} className="min-w-0 flex-1 py-2.5 text-left md:py-0">
                <span className={cn("block break-words", done && "text-muted line-through")}>{task.title}</span>
                {/* Phone: the other fields as one meta line. */}
                <span className="mt-1 flex flex-wrap gap-x-3 font-mono text-xs text-muted md:hidden">
                  {task.due_date && <span className={cn(overdue && "font-bold text-fg")}>{formatDayLabel(task.due_date, today)}</span>}
                  {area && <span>{area.name}</span>}
                  {project && <span>{project.name}</span>}
                  {task.priority !== 2 && <span>{PRIORITY_LABEL[task.priority]}</span>}
                  {task.status === "doing" && <span className="text-fg">Doing</span>}
                </span>
              </button>

              <span className="hidden items-center gap-2 truncate text-sm md:flex">
                {area ? (
                  <>
                    <AreaDot color={area.color} />
                    {area.name}
                  </>
                ) : (
                  <span className="text-muted">—</span>
                )}
              </span>
              <span className="hidden truncate text-sm md:block">{project?.name ?? <span className="text-muted">—</span>}</span>
              <span className={cn("hidden font-mono text-sm md:block", overdue ? "font-bold" : "text-muted")}>
                {task.due_date ? formatDayLabel(task.due_date, today) : "—"}
              </span>
              <span className={cn("hidden text-sm md:block", task.priority === 1 ? "text-fg" : "text-muted")}>
                {PRIORITY_LABEL[task.priority]}
              </span>
              <span className="hidden text-sm text-muted md:block">{STATUS_LABEL[task.status]}</span>
            </li>
          );
        })}
      </ul>

      <TaskSheet task={editing} areas={areas} projects={projects} onClose={() => setEditing(null)} onSave={save} onDelete={remove} />
      <Toast toast={error ? { id: 0, text: error, tone: "error" } : null} onDismiss={clearError} />
    </div>
  );
}
