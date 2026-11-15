import "server-only";

import { cache } from "react";
import { toTimelineEntries } from "@/lib/daylog/map";
import type { TimelineEntry } from "@/lib/daylog/slots";
import { shiftMonth } from "@/lib/daylog/time";
import { todayInRiga } from "@/lib/os/dates";
import { createClient, getUser } from "@/lib/supabase/server";
import type { DaylogDay, DaylogTag } from "@/types/database";

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

export type DaylogHome = {
  today: string;
  serverNow: number;
  /** The day being tracked right now, with its entries. */
  active: { day: DaylogDay; entries: TimelineEntry[] } | null;
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
    active: activeDay ? { day: activeDay, entries: await entriesFor(activeDay.id) } : null,
    todayDay: todayRow,
    days: daysResult.data,
    recent: recentResult.data,
    tags,
  };
}

/** One day by date, with its entries, for the history view. */
export async function getDaylogDay(day: string): Promise<{ day: DaylogDay; entries: TimelineEntry[]; tags: DaylogTag[] } | null> {
  const supabase = await db();
  const { data, error } = await supabase.from("daylog_days").select(DAY_COLUMNS).eq("day", day).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [entries, tags] = await Promise.all([entriesFor(data.id), getTags()]);
  return { day: data, entries, tags };
}
