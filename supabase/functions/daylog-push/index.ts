// Day Log push sender (Supabase Edge Function, Deno).
//
// Woken by public.daylog_dispatch() (pg_cron → pg_net) when notifications are
// pending. All timing decisions were already made in SQL (daylog_tick); this
// only claims pending rows, sends them and records the outcome.
//
// Deploy with JWT verification off; the caller is checked against the
// daylog_cron_secret in Vault (public.daylog_verify_dispatch_secret).
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY (VAPID_SUBJECT optional).
// The Supabase secret key is injected by Supabase (SUPABASE_SECRET_KEYS); it
// never leaves Supabase.

import { createClient } from "npm:@supabase/supabase-js@2";
import { sendPush, type VapidKeys } from "./webpush.ts";

type LogRow = {
  id: string;
  user_id: string;
  day_id: string | null;
  kind: string;
  title: string;
  body: string;
  url: string;
  attempts: number;
};

const MAX_ATTEMPTS = 3;

function env(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret ${name}`);
  return value;
}

function secretKey(): string {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keys) return JSON.parse(keys).default;
  return env("SUPABASE_SERVICE_ROLE_KEY"); // older projects
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const db = createClient(env("SUPABASE_URL"), secretKey(), { auth: { persistSession: false } });

  // Only daylog_dispatch() knows the secret (it reads it from Vault).
  const { data: authorized, error: authError } = await db.rpc("daylog_verify_dispatch_secret", {
    p_secret: request.headers.get("x-daylog-secret") ?? "",
  });
  if (authError || authorized !== true) return new Response("Unauthorized", { status: 401 });

  const vapid: VapidKeys = {
    publicKey: env("VAPID_PUBLIC_KEY"),
    privateKey: env("VAPID_PRIVATE_KEY"),
    // Contact for the push services (mailto: or https:).
    subject: Deno.env.get("VAPID_SUBJECT") ?? "https://egliitis.id.lv",
  };

  // Atomic claim (for update skip locked): overlapping runs never take the same row.
  const { data: rows, error: claimError } = await db.rpc("daylog_claim_pending");
  if (claimError) {
    console.error("claim failed", claimError);
    return new Response("Claim failed", { status: 500 });
  }

  // Writes a claimed row's outcome; a failure here would leave it stuck in "sending", so log it.
  const record = async (id: string, fields: Record<string, unknown>) => {
    const { error } = await db.from("notification_log").update(fields).eq("id", id);
    if (error) console.error("updating notification_log failed", error);
  };

  let sent = 0;
  for (const row of (rows ?? []) as LogRow[]) {
    const { data: subscriptions, error: subError } = await db
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, fail_count")
      .eq("user_id", row.user_id);

    if (subError) console.error("reading push_subscriptions failed", subError);
    if (subError || !subscriptions?.length) {
      await record(row.id, { status: "failed", error: subError?.message ?? "no push subscription" });
      continue;
    }

    // One tag per day for slot pings, so a new ping replaces an unanswered one.
    const payload = {
      title: row.title,
      body: row.body,
      url: row.url,
      tag: row.kind === "slot" && row.day_id ? `daylog-${row.day_id}` : `daylog-${row.kind}`,
    };

    let anyOk = false;
    const errors: string[] = [];
    for (const sub of subscriptions) {
      try {
        const result = await sendPush(sub, payload, vapid, { ttl: 600, urgency: "high" });
        if (result.ok) {
          anyOk = true;
          await db.from("push_subscriptions").update({ last_used_at: new Date().toISOString(), fail_count: 0, last_error: null }).eq("id", sub.id);
        } else if (result.gone) {
          // Expired, or the app was removed from the Home Screen.
          await db.from("push_subscriptions").delete().eq("id", sub.id);
          errors.push(`gone ${result.status}`);
        } else {
          errors.push(`${result.status} ${result.body ?? ""}`.trim());
          await db
            .from("push_subscriptions")
            .update({ fail_count: sub.fail_count + 1, last_error: `${result.status} ${result.body ?? ""}`.slice(0, 300) })
            .eq("id", sub.id);
        }
      } catch (error) {
        errors.push(String(error).slice(0, 200));
      }
    }

    if (anyOk) sent++;
    await record(row.id, {
      // Not delivered yet: back to pending for the next minute, up to MAX_ATTEMPTS.
      status: anyOk ? "sent" : row.attempts >= MAX_ATTEMPTS ? "failed" : "pending",
      sent_at: anyOk ? new Date().toISOString() : null,
      error: errors.length ? errors.join("; ").slice(0, 500) : null,
    });
  }

  return Response.json({ claimed: rows?.length ?? 0, sent });
});
