"use client";

import { useMemo, useState, type ReactNode } from "react";
import { bulkSetStatus, deleteTask, setTaskStatus, updateTask } from "@/app/os/(private)/actions/tasks";
import { AreaDot } from "@/components/os/area-dot";
import { EmptyState } from "@/components/os/empty-state";
import { TaskSheet } from "@/components/os/task-sheet";
import { Toast } from "@/components/os/toast";
import { formatDayLabel } from "@/lib/os/dates";
import type { TaskUpdateInput } from "@/lib/os/schemas";
import { statusPatch, updatePatch, useOptimisticTasks } from "@/lib/os/use-optimistic-tasks";
import { cn } from "@/lib/utils";
import type { Area, Priority, Project, Task, TaskStatus } from "@/types/database";

type TaskTableProps = {
  tasks: Task[];
  areas: Area[];
  projects: Project[];
  today: string;
  filtered: boolean;
};

const PRIORITY_LABEL = { 1: "High", 2: "Normal", 3: "Low" } as const;

// Desktop: one column per field, edited in place. Phone: stacked rows that open the sheet.
const rowGrid =
  "md:grid md:grid-cols-[1.25rem_2.75rem_minmax(0,1fr)_9rem_10rem_9rem_6.5rem_6.5rem] md:items-center md:gap-3";

// Looks like plain text until hovered or focused.
const cellControl =
  "w-full truncate rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm text-fg outline-none transition-colors hover:border-line focus:border-fg";

function Cell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="hidden min-w-0 md:block">
      <span className="sr-only">{label}</span>
      {children}
    </label>
  );
}

export function TaskTable({ tasks: serverTasks, areas, projects, today, filtered }: TaskTableProps) {
  const { tasks, run, error, clearError } = useOptimisticTasks(serverTasks);
  const [editing, setEditing] = useState<Task | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const areaById = useMemo(() => new Map(areas.map((area) => [area.id, area])), [areas]);
  const projectById = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);

  // Drop selections for rows that have left the list (e.g. filtered out after a save).
  const visibleSelection = tasks.filter((task) => selected.has(task.id)).map((task) => task.id);
  const allSelected = tasks.length > 0 && visibleSelection.length === tasks.length;

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

  function setSelection(id: string, on: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function bulk(status: TaskStatus) {
    const ids = visibleSelection;
    if (ids.length === 0) return;
    setSelected(new Set());
    void run({ type: "patch", ids, patch: statusPatch(status) }, () => bulkSetStatus(ids, status));
  }

  function saveTitle(task: Task, value: string) {
    const title = value.trim();
    if (title && title !== task.title) save({ id: task.id, title });
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
      <div className="mb-2 flex min-h-9 items-center gap-3">
        {visibleSelection.length > 0 ? (
          <div role="toolbar" aria-label="Selected tasks" className="flex items-center gap-2">
            <span className="font-mono text-xs">{visibleSelection.length} selected</span>
            <button type="button" onClick={() => bulk("done")} className="h-8 rounded-full bg-fg px-3 text-sm font-medium text-surface">
              Mark done
            </button>
            <button type="button" onClick={() => bulk("todo")} className="h-8 rounded-full border border-line px-3 text-sm hover:border-fg">
              Reopen
            </button>
            <button type="button" onClick={() => setSelected(new Set())} className="h-8 px-2 text-sm text-muted hover:text-fg">
              Clear
            </button>
          </div>
        ) : (
          <p className="font-mono text-xs text-muted">{tasks.length === 1 ? "1 task" : `${tasks.length} tasks`}</p>
        )}
      </div>

      <div className={cn(rowGrid, "hidden border-b border-line pb-2 font-mono text-xs uppercase tracking-[0.15em] text-muted")}>
        <input
          type="checkbox"
          aria-label="Select all"
          checked={allSelected}
          onChange={(event) => setSelected(event.target.checked ? new Set(tasks.map((task) => task.id)) : new Set())}
          className="h-4 w-4 accent-[var(--fg)]"
        />
        <span />
        <span className="px-2">Task</span>
        <span className="px-2">Area</span>
        <span className="px-2">Project</span>
        <span className="px-2">Due</span>
        <span className="px-2">Priority</span>
        <span className="px-2">Status</span>
      </div>

      <ul>
        {tasks.map((task) => {
          const done = task.status === "done";
          const area = task.area_id ? areaById.get(task.area_id) : undefined;
          const project = task.project_id ? projectById.get(task.project_id) : undefined;
          const overdue = !done && task.due_date !== null && task.due_date < today;

          return (
            <li
              key={task.id}
              className={cn(rowGrid, "flex items-start gap-3 border-b border-line py-1.5", selected.has(task.id) && "md:bg-fg/[0.04]")}
            >
              <input
                type="checkbox"
                aria-label={`Select "${task.title}"`}
                checked={selected.has(task.id)}
                onChange={(event) => setSelection(task.id, event.target.checked)}
                className="hidden h-4 w-4 accent-[var(--fg)] md:block"
              />

              <button
                type="button"
                role="checkbox"
                aria-checked={done}
                aria-label={done ? `Reopen "${task.title}"` : `Mark "${task.title}" done`}
                onClick={() => toggle(task)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
              >
                <span className={cn("h-5 w-5 rounded-full border-2 transition-colors", done ? "border-fg bg-fg" : "border-muted hover:border-fg")} />
              </button>

              {/* Phone: tap opens the sheet. */}
              <button type="button" onClick={() => setEditing(task)} className="min-w-0 flex-1 py-2.5 text-left md:hidden">
                <span className={cn("block break-words", done && "text-muted line-through")}>{task.title}</span>
                <span className="mt-1 flex flex-wrap gap-x-3 font-mono text-xs text-muted">
                  {task.due_date && <span className={cn(overdue && "font-bold text-fg")}>{formatDayLabel(task.due_date, today)}</span>}
                  {area && <span>{area.name}</span>}
                  {project && <span>{project.name}</span>}
                  {task.priority !== 2 && <span>{PRIORITY_LABEL[task.priority]}</span>}
                  {task.status === "doing" && <span className="text-fg">Doing</span>}
                </span>
              </button>

              {/* Desktop: title edits in place; the arrow opens the full sheet. */}
              <div className="hidden min-w-0 items-center gap-1 md:flex">
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Title</span>
                  <input
                    key={task.title}
                    defaultValue={task.title}
                    maxLength={300}
                    onBlur={(event) => saveTitle(task, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur();
                      if (event.key === "Escape") {
                        event.currentTarget.value = task.title;
                        event.currentTarget.blur();
                      }
                    }}
                    className={cn(cellControl, done && "text-muted line-through")}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setEditing(task)}
                  aria-label={`Open "${task.title}"`}
                  className="h-8 w-8 shrink-0 rounded-lg text-muted hover:bg-fg/[0.06] hover:text-fg"
                >
                  ›
                </button>
              </div>

              <Cell label="Area">
                <div className="flex items-center gap-1">
                  {area && <AreaDot color={area.color} />}
                  <select
                    value={task.area_id ?? ""}
                    onChange={(event) => save({ id: task.id, areaId: event.target.value || null })}
                    className={cellControl}
                  >
                    <option value="">—</option>
                    {areas.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>
              </Cell>
              <Cell label="Project">
                <select
                  value={task.project_id ?? ""}
                  onChange={(event) => save({ id: task.id, projectId: event.target.value || null })}
                  className={cellControl}
                >
                  <option value="">—</option>
                  {project === undefined && task.project_id && <option value={task.project_id}>(archived)</option>}
                  {projects.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </Cell>
              <Cell label="Due date">
                <input
                  type="date"
                  value={task.due_date ?? ""}
                  onChange={(event) => save({ id: task.id, dueDate: event.target.value || null })}
                  className={cn(cellControl, "font-mono", overdue && "font-bold")}
                />
              </Cell>
              <Cell label="Priority">
                <select
                  value={task.priority}
                  onChange={(event) => save({ id: task.id, priority: Number(event.target.value) as Priority })}
                  className={cellControl}
                >
                  <option value={1}>High</option>
                  <option value={2}>Normal</option>
                  <option value={3}>Low</option>
                </select>
              </Cell>
              <Cell label="Status">
                <select
                  value={task.status}
                  onChange={(event) => save({ id: task.id, status: event.target.value as TaskStatus })}
                  className={cellControl}
                >
                  <option value="todo">To do</option>
                  <option value="doing">Doing</option>
                  <option value="done">Done</option>
                </select>
              </Cell>
            </li>
          );
        })}
      </ul>

      <TaskSheet task={editing} areas={areas} projects={projects} onClose={() => setEditing(null)} onSave={save} onDelete={remove} />
      <Toast toast={error ? { id: 0, text: error, tone: "error" } : null} onDismiss={clearError} />
    </div>
  );
}
