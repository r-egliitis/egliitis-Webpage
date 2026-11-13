"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  bulkStatusChange,
  firstIssue,
  taskCreate,
  taskStatusChange,
  taskUpdate,
  type ActionResult,
  type TaskCreateInput,
  type TaskUpdateInput,
} from "@/lib/os/schemas";
import type { TaskStatus } from "@/types/database";

// Task mutations. Server Actions are public endpoints, so each one checks the
// session itself; RLS is the backstop. completed_at is set by a DB trigger.

const SESSION_EXPIRED: ActionResult = { ok: false, error: "Your session expired. Sign in again." };
const SAVE_FAILED: ActionResult = { ok: false, error: "Couldn't save that. Try again." };

async function signedInClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return error || !data.user ? null : supabase;
}

function done(): ActionResult {
  revalidatePath("/os", "layout");
  return { ok: true };
}

export async function createTask(input: TaskCreateInput): Promise<ActionResult> {
  const parsed = taskCreate.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await signedInClient();
  if (!supabase) return SESSION_EXPIRED;

  const { id, title, notes, areaId, projectId, dueDate, priority, status } = parsed.data;
  const { error } = await supabase.from("tasks").insert({
    id,
    title,
    notes,
    area_id: areaId ?? null,
    project_id: projectId ?? null,
    due_date: dueDate ?? null,
    priority,
    status,
  });
  if (error) {
    console.error("createTask", error);
    return SAVE_FAILED;
  }
  return done();
}

export async function updateTask(input: TaskUpdateInput): Promise<ActionResult> {
  const parsed = taskUpdate.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await signedInClient();
  if (!supabase) return SESSION_EXPIRED;

  const { id, title, notes, areaId, projectId, dueDate, priority, status } = parsed.data;
  // Only send the fields that were given; undefined means "leave as is".
  const { error } = await supabase
    .from("tasks")
    .update({
      ...(title !== undefined && { title }),
      ...(notes !== undefined && { notes }),
      ...(areaId !== undefined && { area_id: areaId }),
      ...(projectId !== undefined && { project_id: projectId }),
      ...(dueDate !== undefined && { due_date: dueDate }),
      ...(priority !== undefined && { priority }),
      ...(status !== undefined && { status }),
    })
    .eq("id", id);
  if (error) {
    console.error("updateTask", error);
    return SAVE_FAILED;
  }
  return done();
}

export async function setTaskStatus(id: string, status: TaskStatus): Promise<ActionResult> {
  const parsed = taskStatusChange.safeParse({ id, status });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await signedInClient();
  if (!supabase) return SESSION_EXPIRED;

  const { error } = await supabase.from("tasks").update({ status: parsed.data.status }).eq("id", parsed.data.id);
  if (error) {
    console.error("setTaskStatus", error);
    return SAVE_FAILED;
  }
  return done();
}

export async function bulkSetStatus(ids: string[], status: TaskStatus): Promise<ActionResult> {
  const parsed = bulkStatusChange.safeParse({ ids, status });
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await signedInClient();
  if (!supabase) return SESSION_EXPIRED;

  const { error } = await supabase
    .from("tasks")
    .update({ status: parsed.data.status })
    .in("id", parsed.data.ids);
  if (error) {
    console.error("bulkSetStatus", error);
    return SAVE_FAILED;
  }
  return done();
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const parsed = taskStatusChange.shape.id.safeParse(id);
  if (!parsed.success) return { ok: false, error: "That task doesn't exist." };

  const supabase = await signedInClient();
  if (!supabase) return SESSION_EXPIRED;

  const { error } = await supabase.from("tasks").delete().eq("id", parsed.data);
  if (error) {
    console.error("deleteTask", error);
    return SAVE_FAILED;
  }
  return done();
}
