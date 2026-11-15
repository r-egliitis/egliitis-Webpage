import { z } from "zod";

// Validation for Day Log Server Actions. Mirrors the checks in the migration.

const id = z.uuid();
const instant = z.iso.datetime({ offset: true });
const tagIds = z.array(id).max(12).default([]);
const body = z.string().trim().min(1, "Write something first.").max(2000);

export const scheduleDay = z.object({ day: z.iso.date() });
export const dayRef = z.object({ dayId: id });

export const writeEntry = z.discriminatedUnion("kind", [
  // The opening entry is stamped with the server's time by the trigger.
  z.object({ kind: z.literal("opening"), id: id.optional(), dayId: id, body, tagIds }),
  z
    .object({ kind: z.literal("slot"), id: id.optional(), dayId: id, startAt: instant, endAt: instant, body, tagIds })
    .refine((entry) => Date.parse(entry.endAt) > Date.parse(entry.startAt), "That time range is empty."),
]);

export const updateEntry = z.object({ id, body, tagIds });
export const entryRef = z.object({ id });

const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const createTag = z.object({
  id: id.optional(),
  name: z.string().trim().min(1, "Name the tag.").max(40),
  color: color.optional(),
});

export const pushSubscription = z.object({
  endpoint: z.url().max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
  userAgent: z.string().max(300).optional(),
});

const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:00)?$/, "Use a time like 07:00.");

/** The settings form. Mirrors daylog_settings' checks. */
export const daylogSettings = z.object({
  interval_minutes: z.union([z.literal(15), z.literal(20), z.literal(30), z.literal(60)]),
  missed_slot_mode: z.enum(["backfill", "lock", "skip"]),
  lock_after_slots: z.number().int().min(1).max(24),
  multi_slot_entries: z.boolean(),
  tagging_mode: z.enum(["off", "while_writing", "review", "both"]),
  pause_mode: z.enum(["off", "button", "timer"]),
  pause_timer_minutes: z.number().int().min(5).max(600),
  unanswered_ping_mode: z.enum(["always", "quiet_after"]),
  quiet_after_unanswered: z.number().int().min(1).max(20),
  midnight_notice: z.boolean(),
  morning_reminder_time: clock.nullable(),
  auto_end_time: clock.refine((value) => value <= "12:00", "Auto-end must be between 00:00 and 12:00."),
});

export const updateTag = z.object({
  id,
  name: z.string().trim().min(1, "Name the tag.").max(40).optional(),
  color: color.optional(),
});

export const pauseStart = z.object({ dayId: id, minutes: z.number().int().min(5).max(600).nullable() });
export const pauseRef = z.object({ pauseId: id });

export type DaylogSettingsInput = z.input<typeof daylogSettings>;
export type UpdateTagInput = z.input<typeof updateTag>;
export type WriteEntryInput = z.input<typeof writeEntry>;
export type UpdateEntryInput = z.input<typeof updateEntry>;
export type CreateTagInput = z.input<typeof createTag>;
export type PushSubscriptionInput = z.input<typeof pushSubscription>;
