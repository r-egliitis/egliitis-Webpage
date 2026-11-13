import { z } from "zod";

// Validation for every /os Server Action. Mirrors the checks in the migration.

const id = z.uuid();
const isoDate = z.iso.date();
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null);

export const taskStatus = z.enum(["todo", "doing", "done"]);
export const projectStatus = z.enum(["active", "paused", "done"]);
export const priority = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const taskCreate = z.object({
  // The client may supply the id, so an optimistic row keeps its key once saved.
  id: id.optional(),
  title: z.string().trim().min(1, "Give the task a title.").max(300),
  notes: optionalText(5000),
  areaId: id.nullish(),
  projectId: id.nullish(),
  dueDate: isoDate.nullish(),
  priority: priority.optional(),
  status: taskStatus.optional(),
});

export const taskUpdate = z.object({
  id,
  title: z.string().trim().min(1, "Give the task a title.").max(300).optional(),
  notes: optionalText(5000).optional(),
  areaId: id.nullable().optional(),
  projectId: id.nullable().optional(),
  dueDate: isoDate.nullable().optional(),
  priority: priority.optional(),
  status: taskStatus.optional(),
});

export const taskStatusChange = z.object({ id, status: taskStatus });

export const bulkStatusChange = z.object({
  ids: z.array(id).min(1).max(500),
  status: taskStatus,
});

export const projectUpsert = z.object({
  id: id.optional(),
  name: z.string().trim().min(1, "Give the project a name.").max(120),
  description: optionalText(5000),
  areaId: id.nullish(),
  status: projectStatus.optional(),
  deadline: isoDate.nullish(),
});

// /os/tasks filters, read from the URL. Bad values fall back to "no filter".
export const taskFilters = z.object({
  area: id.optional().catch(undefined),
  project: id.optional().catch(undefined),
  status: z.enum(["open", "todo", "doing", "done"]).optional().catch(undefined),
  priority: z.coerce.number().pipe(priority).optional().catch(undefined),
  sort: z.enum(["due", "priority"]).optional().catch(undefined),
  completed: z.literal("1").optional().catch(undefined),
});

export type TaskCreateInput = z.input<typeof taskCreate>;
export type TaskUpdateInput = z.input<typeof taskUpdate>;
export type ProjectUpsertInput = z.input<typeof projectUpsert>;
export type TaskFilters = z.output<typeof taskFilters>;

export type ActionResult = { ok: true } | { ok: false; error: string };

/** First validation message, for showing next to a form. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Something in that form isn't valid.";
}
