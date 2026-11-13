// Calendar dates for /os. Every date is a plain "YYYY-MM-DD" string, the same
// shape Postgres returns for `date` columns, so comparisons are string
// comparisons. "Today" always means today in Riga, wherever the code runs.

export const TIME_ZONE = "Europe/Riga";

const isoDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's date in Riga, as YYYY-MM-DD. */
export function todayInRiga(now: Date = new Date()): string {
  const parts = isoDateFormatter.formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

// Calendar arithmetic is done in UTC so DST changes can't shift the day.
function toUtcDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(iso: string, days: number): string {
  const date = toUtcDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const shortFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});

const longFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** "Today", "Tomorrow", "Yesterday", or e.g. "Mon 17 Nov". */
export function formatDayLabel(iso: string, today: string): string {
  if (iso === today) return "Today";
  if (iso === addDays(today, 1)) return "Tomorrow";
  if (iso === addDays(today, -1)) return "Yesterday";
  return shortFormatter.format(toUtcDate(iso));
}

/** e.g. "Friday 13 November". */
export function formatLongDate(iso: string): string {
  return longFormatter.format(toUtcDate(iso));
}
