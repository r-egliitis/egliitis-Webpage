import "server-only";

import { cache } from "react";
import { toPauses, toTimelineEntries, type PauseRow } from "@/lib/daylog/map";
import type { TimelineEntry } from "@/lib/daylog/slots";
import { toTsQuery } from "@/lib/daylog/search";
import { shiftMonth } from "@/lib/daylog/time";
import { todayInRiga } from "@/lib/os/dates";
import { createClient, getUser } from "@/lib/supabase/server";
import type { DaylogDay, DaylogSettings, DaylogTag } from "@/types/database";

// Day Log reads. Run on the server with the signed-in user's session (RLS).

async function db() {
  const user = await getUser(); // verifies the session; opts out of prerendering
  if (!user) throw new Error("Not signed in.");
  return createClient();
}

const DAY_COLUMNS = "*";
const ENTRY_COLUMNS = "id, kind, start_at, end_at, body, skipped";

export const getTags = cache(async (): Promise<DaylogTag[]> => {
  const supabase = await db();
  const { data, error } = await supabase.from("daylog_tags").select("*").order("name");
  if (error) throw error;
  return data;
});

async function entriesFor(dayId: string): Promise<TimelineEntry[]> {
  const supabase = await db();
  const { data: entries, error } = await supabase
    .from("daylog_entries")
    .select(ENTRY_COLUMNS)
    .eq("day_id", dayId)
    .order("start_at");
  if (error) throw error;
  if (entries.length === 0) return [];
  const { data: links, error: linkError } = await supabase
    .from("daylog_entry_tags")
    .select("entry_id, tag_id")
    .in("entry_id", entries.map((entry) => entry.id));
  if (linkError) throw linkError;
  return toTimelineEntries(entries, links);
}

async function pausesFor(dayId: string): Promise<PauseRow[]> {
  const supabase = await db();
  const { data, error } = await supabase
    .from("daylog_pauses")
    .select("id, started_at, ended_at, resume_at")
    .eq("day_id", dayId)
    .order("started_at");
  if (error) throw error;
  return toPauses(data);
}

/**
 * Quiet mode: true when the day's pings have stopped because N went
 * unanswered. Same rule as daylog_due_notifications in SQL.
 */
async function isQuiet(day: DaylogDay): Promise<boolean> {
  const snapshot = day.settings_snapshot;
  if (snapshot?.unanswered_ping_mode !== "quiet_after" || !day.started_at) return false;
  const supabase = await db();
  const { data: last, error } = await supabase
    .from("daylog_entries")
    .select("created_at")
    .eq("day_id", day.id)
    .eq("skipped", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const { count, error: countError } = await supabase
    .from("notification_log")
    .select("id", { count: "exact", head: true })
    .eq("day_id", day.id)
    .eq("kind", "slot")
    .gt("created_at", last?.created_at ?? day.started_at);
  if (countError) throw countError;
  return (count ?? 0) >= snapshot.quiet_after_unanswered;
}

export type DaylogHome = {
  today: string;
  serverNow: number;
  /** The day being tracked right now, with its entries and pauses. */
  active: { day: DaylogDay; entries: TimelineEntry[]; pauses: PauseRow[]; quiet: boolean } | null;
  /** Today's row if it exists (scheduled, ended or missed). */
  todayDay: DaylogDay | null;
  /** Days in the visible month, plus every upcoming scheduled day. */
  days: DaylogDay[];
  recent: DaylogDay[];
  tags: DaylogTag[];
};

/** Everything /os/daylog needs. `month` is "YYYY-MM". */
export async function getDaylogHome(month: string): Promise<DaylogHome> {
  const supabase = await db();
  const today = todayInRiga();
  const [year, monthNumber] = month.split("-").map(Number);
  const next = shiftMonth(year, monthNumber, 1);
  const monthStart = `${month}-01`;
  const monthEnd = `${next.year}-${String(next.month).padStart(2, "0")}-01`;

  const [activeResult, daysResult, recentResult, tags] = await Promise.all([
    supabase.from("daylog_days").select(DAY_COLUMNS).eq("status", "active").maybeSingle(),
    supabase
      .from("daylog_days")
      .select(DAY_COLUMNS)
      .or(`and(day.gte.${monthStart},day.lt.${monthEnd}),and(status.eq.scheduled,day.gte.${today})`)
      .order("day"),
    supabase
      .from("daylog_days")
      .select(DAY_COLUMNS)
      .in("status", ["ended"])
      .order("day", { ascending: false })
      .limit(8),
    getTags(),
  ]);
  if (activeResult.error) throw activeResult.error;
  if (daysResult.error) throw daysResult.error;
  if (recentResult.error) throw recentResult.error;

  const activeDay = activeResult.data;
  const { data: todayRow, error: todayError } = await supabase
    .from("daylog_days")
    .select(DAY_COLUMNS)
    .eq("day", today)
    .maybeSingle();
  if (todayError) throw todayError;

  return {
    today,
    serverNow: Date.now(),
    active: activeDay
      ? {
          day: activeDay,
          entries: await entriesFor(activeDay.id),
          pauses: await pausesFor(activeDay.id),
          quiet: await isQuiet(activeDay),
        }
      : null,
    todayDay: todayRow,
    days: daysResult.data,
    recent: recentResult.data,
    tags,
  };
}

export type SearchResult = {
  id: string;
  day: string;
  kind: "opening" | "slot" | "pause";
  start: number;
  end: number;
  body: string;
};

/** Full-text search over every written entry, newest first (max 50). */
export async function searchEntries(query: string): Promise<SearchResult[]> {
  const tsquery = toTsQuery(query);
  if (!tsquery) return [];
  const supabase = await db();
  const { data: rows, error } = await supabase
    .from("daylog_entries")
    .select("id, day_id, kind, start_at, end_at, body")
    .eq("skipped", false)
    .textSearch("search", tsquery, { config: "simple" })
    .order("start_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  if (rows.length === 0) return [];

  const { data: days, error: dayError } = await supabase
    .from("daylog_days")
    .select("id, day")
    .in("id", [...new Set(rows.map((row) => row.day_id))]);
  if (dayError) throw dayError;
  const dayById = new Map(days.map((day) => [day.id, day.day]));

  return rows.map((row) => ({
    id: row.id,
    day: dayById.get(row.day_id) ?? "",
    kind: row.kind,
    start: Date.parse(row.start_at),
    end: Date.parse(row.end_at),
    body: row.body ?? "",
  }));
}

/** Your settings, or the defaults (one source: daylog_settings_json in SQL). */
export async function getDaylogSettings(): Promise<DaylogSettings> {
  const user = await getUser();
  if (!user) throw new Error("Not signed in.");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("daylog_settings_json", { p_user: user.id });
  if (error) throw error;
  return data as unknown as DaylogSettings;
}

/** One day by date, with its entries, for the history view. */
export async function getDaylogDay(
  day: string,
): Promise<{ day: DaylogDay; entries: TimelineEntry[]; pauses: PauseRow[]; tags: DaylogTag[]; serverNow: number } | null> {
  const supabase = await db();
  const { data, error } = await supabase.from("daylog_days").select(DAY_COLUMNS).eq("day", day).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [entries, pauses, tags] = await Promise.all([entriesFor(data.id), pausesFor(data.id), getTags()]);
  return { day: data, entries, pauses, tags, serverNow: Date.now() };
}
