"use client";

import { useState } from "react";
import { AreaDot } from "@/components/os/area-dot";
import type { CompareDay } from "@/lib/daylog/queries";
import { durationLabel } from "@/lib/daylog/time";
import { formatDayLabel } from "@/lib/os/dates";

type Series = { tagId: string | null; name: string; color: string | null };

const shortDate = (day: string) => `${Number(day.slice(8))}.${Number(day.slice(5, 7))}`;

// Small multiples: one row per tag, one column per tracked day, all on one
// shared scale. Columns are ink (the tag colour is the dot by its name), so
// every row reads the same in light and dark and identity never rests on colour.
export function TagTrendChart({
  days,
  series,
  today,
}: {
  days: CompareDay[];
  series: Series[];
  today: string;
}) {
  const [hover, setHover] = useState<{ key: string; day: string; ms: number } | null>(null);
  const msFor = (day: CompareDay, tagId: string | null) => day.stats.perTag.find((tag) => tag.tagId === tagId)?.ms ?? 0;
  const max = Math.max(1, ...days.flatMap((day) => series.map((one) => msFor(day, one.tagId))));

  return (
    <div>
      <p className="font-mono text-xs text-muted">Same scale in every row · tallest column = {durationLabel(max)}</p>
      <ul className="mt-4 flex flex-col gap-5">
        {series.map((one) => {
          const key = one.tagId ?? "untagged";
          const total = days.reduce((sum, day) => sum + msFor(day, one.tagId), 0);
          return (
            <li key={key}>
              <p className="flex items-center gap-2 text-sm">
                <AreaDot color={one.color} />
                <span className="font-medium">{one.name}</span>
                <span className="font-mono text-xs text-muted">{durationLabel(total)} total</span>
              </p>
              <div className="relative mt-2 flex h-16 items-end gap-0.5 border-b border-line" role="list" aria-label={`${one.name} per day`}>
                {days.map((day) => {
                  const ms = msFor(day, one.tagId);
                  const active = hover?.key === key && hover.day === day.day;
                  return (
                    <div
                      key={day.day}
                      role="listitem"
                      tabIndex={0}
                      aria-label={`${formatDayLabel(day.day, today)}: ${ms ? durationLabel(ms) : "none"}`}
                      onMouseEnter={() => setHover({ key, day: day.day, ms })}
                      onMouseLeave={() => setHover(null)}
                      onFocus={() => setHover({ key, day: day.day, ms })}
                      onBlur={() => setHover(null)}
                      // Hit target is the whole column slot, wider and taller than the mark.
                      className="flex h-full min-w-0 flex-1 cursor-default items-end justify-center outline-none"
                    >
                      <div
                        className={`w-full max-w-6 rounded-t-[4px] transition-opacity ${active ? "bg-fg" : "bg-fg/70"}`}
                        style={{ height: ms ? `${Math.max(3, (ms / max) * 100)}%` : 0 }}
                      />
                    </div>
                  );
                })}
                {hover?.key === key && (
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-line bg-surface px-2.5 py-1 font-mono text-xs whitespace-nowrap shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
                  >
                    {formatDayLabel(hover.day, today)} · {hover.ms ? durationLabel(hover.ms) : "none"}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {days.length > 1 && (
        <div className="mt-1 flex justify-between font-mono text-[0.6875rem] text-muted">
          <span>{shortDate(days[0].day)}</span>
          <span>{shortDate(days[days.length - 1].day)}</span>
        </div>
      )}
    </div>
  );
}
