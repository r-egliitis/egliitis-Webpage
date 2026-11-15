"use server";

import { revalidatePath } from "next/cache";
import {
  createTag as createTagSchema,
  dayRef,
  entryRef,
  pushSubscription as pushSubscriptionSchema,
  scheduleDay as scheduleDaySchema,
  updateEntry as updateEntrySchema,
  writeEntry as writeEntrySchema,
  type CreateTagInput,
  type PushSubscriptionInput,
  type UpdateEntryInput,
  type WriteEntryInput,
} from "@/lib/daylog/schemas";
import { TAG_COLORS } from "@/lib/daylog/tag-colors";
import { firstIssue, type ActionResult } from "@/lib/os/schemas";
import { dbErrorMessage, SESSION_EXPIRED, signedInClient } from "@/lib/os/server-action";

// Day Log mutations. Timing rules (who may start a day, which times are
// allowed) live in the database triggers; their messages are passed through.

const ERRORS = {
  daylog_days_user_day_key: "That day is already scheduled.",
  daylog_days_one_active_idx: "Another Day Log day is still running. End it first.",
  daylog_entries_no_overlap: "That time overlaps something you already wrote.",
  daylog_entries_one_opening_idx: "This day has already started.",
  daylog_tags_user_name_idx: "You already have a tag with that name.",
};

function done(): ActionResult {
  revalidatePath("/os/daylog", "layout");
  return { ok: true };
}

function failed(where: string, error: { code?: string; message?: string }): ActionResult {
  console.error(where, error);
  return { ok: false, error: dbErrorMessage(error, ERRORS) };
}

export async function scheduleDay(day: string): Promise<ActionResult> {
  const parsed = scheduleDaySchema.safeParse({ day });
  if (!parsed.success) return { ok: false, error: "That isn't a valid date." };
  const session = await signedInClient();
  if (!session) return SESSION_EXPIRED;

  const { error } = await session.supabase.from("daylog_days").insert({ day: parsed.data.day });
  return error ? failed("scheduleDay", error) : done();
}

/** Removes a day that hasn't started yet. */
export async function unscheduleDay(dayId: string): Promise<ActionResult> {
  const parsed = dayRef.safeParse({ dayId });
  if (!parsed.success) return { ok: false, error: "That day doesn't exist." };
  const session = await signedInClient();
  if (!session) return SESSION_EXPIRED;

  const { error } = await session.supabase
    .from("daylog_days")
    .delete()
    .eq("id", parsed.data.dayId)
    .eq("status", "scheduled");
  return error ? failed("unscheduleDay", error) : done();
}

async function setEntryTags(
  supabase: NonNullable<Awaited<ReturnType<typeof signedInClient>>>["supabase"],
  entryId: string,
  tagIds: string[],
) {
  const { error: deleteError } = await supabase
    .from("daylog_entry_tags")
    .delete()
    .eq("entry_id", entryId)
    .not("tag_id", "in", `(${tagIds.length ? tagIds.join(",") : "00000000-0000-0000-0000-000000000000"})`);
  if (deleteError) return deleteError;
  if (tagIds.length === 0) return null;
  const { error } = await supabase
    .from("daylog_entry_tags")
    .upsert(tagIds.map((tagId) => ({ entry_id: entryId, tag_id: tagId })), {
      onConflict: "entry_id,tag_id",
      ignoreDuplicates: true,
    });
  return error;
}

/** Writes an entry. The first (opening) entry of a scheduled day starts it. */
export async function writeEntry(input: WriteEntryInput): Promise<ActionResult> {
  const parsed = writeEntrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const session = await signedInClient();
  if (!session) return SESSION_EXPIRED;

  const entry = parsed.data;
  const id = entry.id ?? crypto.randomUUID();
  const { error } = await session.supabase.from("daylog_entries").insert(
    entry.kind === "opening"
      ? // start/end are overwritten by the trigger with the server's time.
        { id, day_id: entry.dayId, kind: "opening", start_at: new Date().toISOString(), end_at: new Date().toISOString(), body: entry.body }
      : { id, day_id: entry.dayId, kind: "slot", start_at: entry.startAt, end_at: entry.endAt, body: entry.body },
  );
  if (error) return failed("writeEntry", error);

  const tagError = await setEntryTags(session.supabase, id, entry.tagIds);
  if (tagError) return failed("writeEntry tags", tagError);
  return done();
}

export async function updateEntry(input: UpdateEntryInput): Promise<ActionResult> {
  const parsed = updateEntrySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const session = await signedInClient();
  if (!session) return SESSION_EXPIRED;

  const { error } = await session.supabase
    .from("daylog_entries")
    .update({ body: parsed.data.body })
    .eq("id", parsed.data.id);
  if (error) return failed("updateEntry", error);

  const tagError = await setEntryTags(session.supabase, parsed.data.id, parsed.data.tagIds);
  return tagError ? failed("updateEntry tags", tagError) : done();
}

/** Deletes an entry. The opening entry stays: it's what started the day. */
export async function deleteEntry(id: string): Promise<ActionResult> {
  const parsed = entryRef.safeParse({ id });
  if (!parsed.success) return { ok: false, error: "That entry doesn't exist." };
  const session = await signedInClient();
  if (!session) return SESSION_EXPIRED;

  const { error } = await session.supabase
    .from("daylog_entries")
    .delete()
    .eq("id", parsed.data.id)
    .neq("kind", "opening");
  return error ? failed("deleteEntry", error) : done();
}

/** Ends the running day now (or at the end of anything written early). */
export async function endDay(dayId: string): Promise<ActionResult> {
  const parsed = dayRef.safeParse({ dayId });
  if (!parsed.success) return { ok: false, error: "That day doesn't exist." };
  const session = await signedInClient();
  if (!session) return SESSION_EXPIRED;

  const { data: last, error: lastError } = await session.supabase
    .from("daylog_entries")
    .select("end_at")
    .eq("day_id", parsed.data.dayId)
    .order("end_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) return failed("endDay", lastError);

  const now = Date.now();
  const endedAt = new Date(Math.max(now, last ? Date.parse(last.end_at) : now)).toISOString();
  const { error } = await session.supabase
    .from("daylog_days")
    .update({ status: "ended", ended_at: endedAt, end_reason: "manual" })
    .eq("id", parsed.data.dayId)
    .eq("status", "active");
  return error ? failed("endDay", error) : done();
}

/** Saves (or refreshes) this device's push subscription. */
export async function savePushSubscription(input: PushSubscriptionInput): Promise<ActionResult> {
  const parsed = pushSubscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That push subscription isn't valid." };
  const session = await signedInClient();
  if (!session) return SESSION_EXPIRED;

  const { endpoint, keys, userAgent } = parsed.data;
  const { error } = await session.supabase.from("push_subscriptions").upsert(
    { endpoint, p256dh: keys.p256dh, auth: keys.auth, user_agent: userAgent ?? null, fail_count: 0, last_error: null },
    { onConflict: "endpoint" },
  );
  if (error) {
    console.error("savePushSubscription", error);
    return { ok: false, error: "Couldn't save this device for notifications." };
  }
  return { ok: true };
}

export async function deletePushSubscription(endpoint: string): Promise<ActionResult> {
  const session = await signedInClient();
  if (!session) return SESSION_EXPIRED;
  const { error } = await session.supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return error ? failed("deletePushSubscription", error) : { ok: true };
}

/** Queues a test notification; the scheduler sends it within seconds. */
export async function sendTestPush(): Promise<ActionResult> {
  const session = await signedInClient();
  if (!session) return SESSION_EXPIRED;
  const { error } = await session.supabase.rpc("daylog_request_test_push");
  if (error) {
    console.error("sendTestPush", error);
    return {
      ok: false,
      error: error.code === "PGRST202" ? "Push isn't set up on the server yet (cron migration not applied)." : "Couldn't send a test.",
    };
  }
  return { ok: true };
}

export async function createTag(input: CreateTagInput): Promise<ActionResult> {
  const parsed = createTagSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };
  const session = await signedInClient();
  if (!session) return SESSION_EXPIRED;

  const { count } = await session.supabase.from("daylog_tags").select("id", { count: "exact", head: true });
  const color = parsed.data.color ?? TAG_COLORS[(count ?? 0) % TAG_COLORS.length];
  const { error } = await session.supabase
    .from("daylog_tags")
    .insert({ id: parsed.data.id, name: parsed.data.name, color });
  return error ? failed("createTag", error) : done();
}
