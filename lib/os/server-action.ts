import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/os/schemas";

// Shared bits for /os Server Actions. Actions are public endpoints, so each
// one checks the session itself; RLS is the backstop.

export const SESSION_EXPIRED: ActionResult = { ok: false, error: "Your session expired. Sign in again." };
export const SAVE_FAILED: ActionResult = { ok: false, error: "Couldn't save that. Try again." };

/** A Supabase client for the signed-in user, or null if the session is gone. */
export async function signedInClient() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  return error || !data.user ? null : { supabase, userId: data.user.id };
}

type PostgresError = { code?: string; message?: string };

/**
 * A readable message for a database error. Messages raised by our own
 * triggers are already written for people; constraint names are mapped.
 */
export function dbErrorMessage(error: PostgresError, names: Record<string, string> = {}): string {
  const message = error.message ?? "";
  for (const [needle, text] of Object.entries(names)) if (message.includes(needle)) return text;
  // 23514 check_violation / 23503 FK: our trigger messages don't mention "violates".
  if ((error.code === "23514" || error.code === "23503") && !message.includes("violates")) return message;
  return "Couldn't save that. Try again.";
}
