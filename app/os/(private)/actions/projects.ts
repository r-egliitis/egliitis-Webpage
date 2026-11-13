"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { firstIssue, projectUpsert, type ActionResult, type ProjectUpsertInput } from "@/lib/os/schemas";

// Project mutations. Same pattern as actions/tasks.ts.

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

/** Creates the project, or updates it when `id` is given. */
export async function saveProject(input: ProjectUpsertInput): Promise<ActionResult> {
  const parsed = projectUpsert.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = await signedInClient();
  if (!supabase) return SESSION_EXPIRED;

  const { id, name, description, areaId, status, deadline } = parsed.data;
  const fields = {
    name,
    description,
    area_id: areaId ?? null,
    deadline: deadline ?? null,
    ...(status && { status }),
  };
  const { error } = id
    ? await supabase.from("projects").update(fields).eq("id", id)
    : await supabase.from("projects").insert(fields);
  if (error) {
    console.error("saveProject", error);
    return SAVE_FAILED;
  }
  return done();
}

/** Archive hides a project from the list; its tasks keep their link. */
export async function setProjectArchived(id: string, archived: boolean): Promise<ActionResult> {
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: "That project doesn't exist." };

  const supabase = await signedInClient();
  if (!supabase) return SESSION_EXPIRED;

  const { error } = await supabase
    .from("projects")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", parsed.data);
  if (error) {
    console.error("setProjectArchived", error);
    return SAVE_FAILED;
  }
  return done();
}
