"use client";

import { useCallback, useOptimistic, useState, useTransition } from "react";
import type { ActionResult, TaskUpdateInput } from "@/lib/os/schemas";
import type { Task, TaskStatus } from "@/types/database";

// Shared optimistic-update plumbing for every task list in /os.
// The change shows immediately; when the Server Action finishes, the fresh
// server data replaces it. If the action fails, React drops the optimistic
// change on its own and `error` explains why.

export type TaskChange =
  | { type: "add"; task: Task }
  | { type: "patch"; ids: string[]; patch: Partial<Task> }
  | { type: "remove"; id: string };

function applyChange(tasks: Task[], change: TaskChange): Task[] {
  switch (change.type) {
    case "add":
      return tasks.some((task) => task.id === change.task.id) ? tasks : [...tasks, change.task];
    case "patch": {
      const ids = new Set(change.ids);
      return tasks.map((task) => (ids.has(task.id) ? { ...task, ...change.patch } : task));
    }
    case "remove":
      return tasks.filter((task) => task.id !== change.id);
  }
}

/** The fields a status change touches, mirroring the DB trigger. */
export function statusPatch(status: TaskStatus): Partial<Task> {
  return { status, completed_at: status === "done" ? new Date().toISOString() : null };
}

/** The optimistic row change for an updateTask() call. */
export function updatePatch(input: TaskUpdateInput): Partial<Task> {
  return {
    ...(input.title !== undefined && { title: input.title }),
    ...(input.notes !== undefined && { notes: input.notes }),
    ...(input.areaId !== undefined && { area_id: input.areaId }),
    ...(input.projectId !== undefined && { project_id: input.projectId }),
    ...(input.dueDate !== undefined && { due_date: input.dueDate }),
    ...(input.priority !== undefined && { priority: input.priority }),
    ...(input.status !== undefined && statusPatch(input.status)),
  };
}

/** A placeholder row for a task that hasn't reached the server yet. */
export function draftTask(fields: Partial<Task> & Pick<Task, "id" | "title">): Task {
  const now = new Date().toISOString();
  return {
    user_id: "",
    notes: null,
    area_id: null,
    project_id: null,
    due_date: null,
    priority: 2,
    status: "todo",
    completed_at: null,
    created_at: now,
    updated_at: now,
    ...fields,
  };
}

export function useOptimisticTasks(tasks: Task[]) {
  const [optimisticTasks, apply] = useOptimistic(tasks, applyChange);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    (change: TaskChange, action: () => Promise<ActionResult>) =>
      new Promise<ActionResult>((resolve) => {
        setError(null);
        startTransition(async () => {
          apply(change);
          const result = await action();
          if (!result.ok) setError(result.error);
          resolve(result);
        });
      }),
    [apply],
  );

  const clearError = useCallback(() => setError(null), []);

  return { tasks: optimisticTasks, run, pending, error, clearError };
}
