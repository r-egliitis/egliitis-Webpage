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

export type WriteEntryInput = z.input<typeof writeEntry>;
export type UpdateEntryInput = z.input<typeof updateEntry>;
export type CreateTagInput = z.input<typeof createTag>;
export type PushSubscriptionInput = z.input<typeof pushSubscription>;
