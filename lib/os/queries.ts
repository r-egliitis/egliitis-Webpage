import "server-only";

import { cache } from "react";
import { createClient, getUser } from "@/lib/supabase/server";
import type { Area, Project, Task } from "@/types/database";
import type { TaskFilters } from "@/lib/os/schemas";

// All /os reads. Every function runs on the server with the signed-in user's
// session, so RLS limits results to that user's rows. Errors are thrown and
// caught by app/os/(private)/error.tsx.

const DEFAULT_AREAS = [
  { name: "Uni", color: "#4F8CFF", sort_order: 0 },
  { name: "Business", color: "#FF0B55", sort_order: 1 },
  { name: "Personal", color: "#3DDC97", sort_order: 2 },
];

const OPEN_STATUSES = ["todo", "doing"] as const;

async function db() {
  // getUser() verifies the session and opts the caller out of prerendering.
  const user = await getUser();
  if (!user) throw new Error("Not signed in.");
  return createClient();
}

/**
 * The user's areas. On the very first visit (no areas yet) it creates
 * Uni, Business and Personal. Safe to run twice: the unique (user_id, name)
 * constraint turns a repeat into a no-op.
 */
export const getAreas = cache(async (): Promise<Area[]> => {
  const supabase = await db();
  const select = () => supabase.from("areas").select("*").order("sort_order").order("name");

  const { data, error } = await select();
  if (error) throw error;
  if (data.length > 0) return data;

  const { error: seedError } = await supabase
    .from("areas")
    .upsert(DEFAULT_AREAS, { onConflict: "user_id,name", ignoreDuplicates: true, defaultToNull: false });
  if (seedError) throw seedError;

  const { data: seeded, error: reloadError } = await select();
  if (reloadError) throw reloadError;
  return seeded;
});

/** Projects that aren't archived, for pickers and the projects list. */
export const getActiveProjects = cache(async (): Promise<Project[]> => {
  const supabase = await db();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .is("archived_at", null)
    .order("name");
  if (error) throw error;
  return data;
});

/** Every todo/doing task. The Today screen groups these in the browser. */
export async function getOpenTasks(): Promise<Task[]> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .in("status", OPEN_STATUSES)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("priority")
    .order("created_at");
  if (error) throw error;
  return data;
}

function completedCutoff(): string {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

/** The /os/tasks list, filtered and sorted on the server. */
export async function getTasks(filters: TaskFilters): Promise<Task[]> {
  const supabase = await db();
  let query = supabase.from("tasks").select("*");

  if (filters.area) query = query.eq("area_id", filters.area);
  if (filters.project) query = query.eq("project_id", filters.project);
  if (filters.priority) query = query.eq("priority", filters.priority);

  const cutoff = completedCutoff();
  if (filters.status === "todo" || filters.status === "doing") {
    query = query.eq("status", filters.status);
  } else if (filters.status === "done") {
    query = query.eq("status", "done").gte("completed_at", cutoff);
  } else if (filters.completed) {
    query = query.or(`status.in.(todo,doing),completed_at.gte.${cutoff}`);
  } else {
    query = query.in("status", OPEN_STATUSES);
  }

  if (filters.sort === "priority") {
    query = query.order("priority").order("due_date", { ascending: true, nullsFirst: false });
  } else {
    query = query.order("due_date", { ascending: true, nullsFirst: false }).order("priority");
  }

  const { data, error } = await query.order("created_at").limit(1000);
  if (error) throw error;
  return data;
}

export type ProjectWithCounts = Project & { openCount: number; doneCount: number };

/** Non-archived projects with their open/done task counts. */
export async function getProjectsWithCounts(): Promise<ProjectWithCounts[]> {
  const supabase = await db();
  const [projects, { data: tasks, error }] = await Promise.all([
    getActiveProjects(),
    supabase.from("tasks").select("project_id, status").not("project_id", "is", null),
  ]);
  if (error) throw error;

  const counts = new Map<string, { open: number; done: number }>();
  for (const task of tasks) {
    if (!task.project_id) continue;
    const entry = counts.get(task.project_id) ?? { open: 0, done: 0 };
    if (task.status === "done") entry.done += 1;
    else entry.open += 1;
    counts.set(task.project_id, entry);
  }

  return projects.map((project) => ({
    ...project,
    openCount: counts.get(project.id)?.open ?? 0,
    doneCount: counts.get(project.id)?.done ?? 0,
  }));
}

/** One project (archived or not) and all of its tasks, or null if not found. */
export async function getProject(id: string): Promise<{ project: Project; tasks: Task[] } | null> {
  const supabase = await db();
  const [{ data: project, error }, { data: tasks, error: tasksError }] = await Promise.all([
    supabase.from("projects").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("tasks")
      .select("*")
      .eq("project_id", id)
      .order("status", { ascending: false }) // todo, doing, then done last
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("priority"),
  ]);
  if (error) throw error;
  if (tasksError) throw tasksError;
  return project ? { project, tasks } : null;
}
