// One Day Log day as clean plain text (copy or .txt download).

import type { TimelineItem } from "@/lib/daylog/slots";
import type { DayStats } from "@/lib/daylog/stats";
import { durationLabel, formatTime, rangeLabel } from "@/lib/daylog/time";
import type { DaylogTag } from "@/types/database";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** "Monday 16 November 2026" for a YYYY-MM-DD date (no comma, whatever the runtime). */
export function exportDateLabel(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  const parts = dateFormatter.formatToParts(new Date(Date.UTC(year, month - 1, date)));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("weekday")} ${get("day")} ${get("month")} ${get("year")}`;
}

// Time column is 11 characters ("01:26–01:40" / "until 01:26"); text lines up after it.
const COLUMN = 13;

function line(time: string, text: string): string {
  const [first, ...rest] = text.split("\n");
  const pad = " ".repeat(COLUMN);
  return [`${time.padEnd(COLUMN)}${first}`, ...rest.map((more) => `${pad}${more}`)].join("\n");
}

export function dayToText(
  day: string,
  items: TimelineItem[],
  stats: DayStats,
  tags: Pick<DaylogTag, "id" | "name">[],
): string {
  const tagName = new Map(tags.map((tag) => [tag.id, tag.name]));
  const lines: string[] = [
    `Day Log — ${exportDateLabel(day)}`,
    `${rangeLabel(stats.start, stats.end)} · ${stats.entries} ${stats.entries === 1 ? "entry" : "entries"} · ${durationLabel(stats.trackedMs)}`,
    "",
  ];

  let gap: { start: number; end: number } | null = null;
  const flushGap = () => {
    if (gap) lines.push(line(rangeLabel(gap.start, gap.end), "(nothing written)"));
    gap = null;
  };

  for (const item of items) {
    if (item.type === "empty") {
      gap = gap ? { start: gap.start, end: item.slot.end } : { ...item.slot };
      continue;
    }
    flushGap();
    if (item.type === "current") continue;
    if (item.type === "paused") {
      lines.push(line(rangeLabel(item.slot.start, item.slot.end), item.open ? "(paused)" : "(paused, nothing written)"));
      continue;
    }
    const { entry } = item;
    if (item.type === "opening") {
      lines.push(line(`until ${formatTime(entry.start)}`, entry.body ?? ""));
      continue;
    }
    if (entry.skipped) {
      lines.push(line(rangeLabel(entry.start, entry.end), "(skipped)"));
      continue;
    }
    // Tags go after the first line of the text.
    const names = entry.tagIds.map((id) => tagName.get(id)).filter(Boolean);
    const [first, ...rest] = (entry.body ?? "").split("\n");
    const head = `${entry.kind === "pause" ? "paused · " : ""}${first}${names.length ? `  [${names.join(", ")}]` : ""}`;
    lines.push(line(rangeLabel(entry.start, entry.end), [head, ...rest].join("\n")));
  }
  flushGap();

  if (stats.perTag.length > 0) {
    const parts = stats.perTag.map(({ tagId, ms }) => `${tagId === null ? "Untagged" : (tagName.get(tagId) ?? "Deleted tag")} ${durationLabel(ms)}`);
    lines.push("", `Time per tag: ${parts.join(" · ")}`);
  }
  return `${lines.join("\n")}\n`;
}
