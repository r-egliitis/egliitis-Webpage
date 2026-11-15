// Day Log times. Instants are epoch milliseconds; labels are Riga wall-clock.
import { TIME_ZONE } from "@/lib/os/dates";

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** "08:07" in Riga time. */
export function formatTime(ms: number): string {
  return timeFormatter.format(new Date(ms));
}

/** "10:00–10:20". */
export function rangeLabel(start: number, end: number): string {
  return `${formatTime(start)}–${formatTime(end)}`;
}

/** Length as "20 min", "1 h 40 min". */
export function durationLabel(ms: number): string {
  const minutes = Math.round(ms / 60_000);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

export const toMs = (iso: string) => new Date(iso).getTime();

// ── Calendar ──────────────────────────────────────────────────────────

/** Monday-first weeks covering a month, as YYYY-MM-DD strings (null = padding). */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // Monday = 0
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

const monthFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", month: "long", year: "numeric" });

/** "November 2026". */
export function monthLabel(year: number, month: number): string {
  return monthFormatter.format(new Date(Date.UTC(year, month - 1, 1)));
}

/** { year, month } shifted by n months. */
export function shiftMonth(year: number, month: number, n: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + n;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}
