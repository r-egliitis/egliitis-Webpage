// Day Log push sender (Supabase Edge Function, Deno).
//
// Woken by public.daylog_dispatch() (pg_cron → pg_net) when notifications are
// pending. All timing decisions were already made in SQL (daylog_tick); this
// only claims pending rows, sends them and records the outcome.
//
// Deploy: npx supabase functions deploy daylog-push --no-verify-jwt
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, DAYLOG_CRON_SECRET
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

/** Constant-time comparison for the shared cron secret. */
function safeEqual(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!safeEqual(request.headers.get("x-daylog-secret") ?? "", env("DAYLOG_CRON_SECRET"))) {
    return new Response("Unauthorized", { status: 401 });
  }

  const vapid: VapidKeys = {
    publicKey: env("VAPID_PUBLIC_KEY"),
    privateKey: env("VAPID_PRIVATE_KEY"),
    subject: env("VAPID_SUBJECT"),
  };
  const db = createClient(env("SUPABASE_URL"), secretKey(), { auth: { persistSession: false } });

  // Atomic claim (for update skip locked): overlapping runs never take the same row.
  const { data: rows, error: claimError } = await db.rpc("daylog_claim_pending");
  if (claimError) {
    console.error("claim failed", claimError);
    return new Response("Claim failed", { status: 500 });
  }

  let sent = 0;
  for (const row of (rows ?? []) as LogRow[]) {
    const { data: subscriptions, error: subError } = await db
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, fail_count")
      .eq("user_id", row.user_id);

    if (subError || !subscriptions?.length) {
      await db
        .from("notification_log")
        .update({ status: "failed", error: subError?.message ?? "no push subscription" })
        .eq("id", row.id);
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
    await db
      .from("notification_log")
      .update({
        // Not delivered yet: back to pending for the next minute, up to MAX_ATTEMPTS.
        status: anyOk ? "sent" : row.attempts >= MAX_ATTEMPTS ? "failed" : "pending",
        sent_at: anyOk ? new Date().toISOString() : null,
        error: errors.length ? errors.join("; ").slice(0, 500) : null,
      })
      .eq("id", row.id);
  }

  return Response.json({ claimed: rows?.length ?? 0, sent });
});
