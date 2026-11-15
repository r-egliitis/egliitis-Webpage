"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { TagTrendChart } from "@/components/daylog/tag-trend-chart";
import { AreaDot } from "@/components/os/area-dot";
import { EmptyState } from "@/components/os/empty-state";
import { chipClass } from "@/components/os/quick-add";
import type { CompareDay } from "@/lib/daylog/queries";
import { durationLabel, rangeLabel } from "@/lib/daylog/time";
import { formatDayLabel } from "@/lib/os/dates";
import { cn } from "@/lib/utils";
import type { DaylogTag } from "@/types/database";

const RANGES = [7, 30, 90];
const MAX_COLUMNS = 4;

type CompareViewProps = { days: CompareDay[]; tags: DaylogTag[]; today: string; range: number };

const cell = "px-3 py-2 text-right font-mono text-xs whitespace-nowrap";

export function CompareView({ days, tags, today, range }: CompareViewProps) {
  const tagById = useMemo(() => new Map(tags.map((tag) => [tag.id, tag])), [tags]);
  // Series = tags used in this range (fixed order: most time first), untagged last.
  const series = useMemo(() => {
    const totals = new Map<string | null, number>();
    for (const day of days) for (const { tagId, ms } of day.stats.perTag) totals.set(tagId, (totals.get(tagId) ?? 0) + ms);
    return [...totals.entries()]
      .sort(([a, x], [b, y]) => (a === null ? 1 : b === null ? -1 : y - x))
      .map(([tagId]) => ({
        tagId,
        name: tagId === null ? "Untagged" : (tagById.get(tagId)?.name ?? "Deleted tag"),
        color: tagId === null ? null : (tagById.get(tagId)?.color ?? null),
      }));
  }, [days, tagById]);

  const [selected, setSelected] = useState<string[]>(() => days.slice(-2).map((day) => day.day));
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [asTable, setAsTable] = useState(false);

  if (days.length === 0) {
    return (
      <div className="mt-8">
        <RangeChips range={range} />
        <div className="mt-6">
          <EmptyState title="No tracked days in this range.">Track a day, then come back to compare.</EmptyState>
        </div>
      </div>
    );
  }

  const columns = days.filter((day) => selected.includes(day.day));
  const visibleSeries = series.filter((one) => !hidden.has(one.tagId ?? "untagged"));
  const tagMs = (day: CompareDay, tagId: string | null) => day.stats.perTag.find((tag) => tag.tagId === tagId)?.ms ?? 0;

  function toggleDay(day: string) {
    setSelected((current) =>
      current.includes(day) ? current.filter((value) => value !== day) : [...current, day].slice(-MAX_COLUMNS),
    );
  }

  const metrics: { label: string; value: (day: CompareDay) => string }[] = [
    { label: "Time span", value: (day) => rangeLabel(day.stats.start, day.stats.end) },
    { label: "Tracked", value: (day) => durationLabel(day.stats.trackedMs) },
    { label: "Written", value: (day) => durationLabel(day.stats.writtenMs) },
    { label: "Paused", value: (day) => (day.stats.pausedMs ? durationLabel(day.stats.pausedMs) : "—") },
    { label: "Entries", value: (day) => String(day.stats.entries) },
    { label: "Empty slots", value: (day) => String(day.stats.slots.empty + day.stats.slots.locked) },
    {
      label: "Longest gap",
      value: (day) => (day.stats.longestGaps[0] ? durationLabel(day.stats.longestGaps[0].end - day.stats.longestGaps[0].start) : "—"),
    },
  ];

  return (
    <div className="mt-8">
      <RangeChips range={range} />

      <section aria-label="Side by side" className="mt-8">
        <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Side by side</h2>
        <p className="mt-1 text-sm text-muted">Pick up to {MAX_COLUMNS} days.</p>
        <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {[...days].reverse().map((day) => (
            <button
              key={day.day}
              type="button"
              aria-pressed={selected.includes(day.day)}
              onClick={() => toggleDay(day.day)}
              className={cn(chipClass(selected.includes(day.day)), "h-8 text-xs")}
            >
              {formatDayLabel(day.day, today)}
            </button>
          ))}
        </div>

        {columns.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-line">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="px-3 py-2 text-left font-normal text-muted">
                    <span className="sr-only">Measure</span>
                  </th>
                  {columns.map((day) => (
                    <th key={day.day} scope="col" className="px-3 py-2 text-right font-medium whitespace-nowrap">
                      <Link href={`/os/daylog/${day.day}`} className="hover:underline">
                        {formatDayLabel(day.day, today)}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.map((metric) => (
                  <tr key={metric.label} className="border-b border-line/60">
                    <th scope="row" className="px-3 py-2 text-left font-normal text-muted">
                      {metric.label}
                    </th>
                    {columns.map((day) => (
                      <td key={day.day} className={cell}>
                        {metric.value(day)}
                      </td>
                    ))}
                  </tr>
                ))}
                {series.map((one) => (
                  <tr key={one.tagId ?? "untagged"} className="border-b border-line/60 last:border-b-0">
                    <th scope="row" className="px-3 py-2 text-left font-normal">
                      <span className="flex items-center gap-2">
                        <AreaDot color={one.color} />
                        {one.name}
                      </span>
                    </th>
                    {columns.map((day) => (
                      <td key={day.day} className={cell}>
                        {tagMs(day, one.tagId) ? durationLabel(tagMs(day, one.tagId)) : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-label="Trend" className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Time per tag, per day</h2>
          <div role="group" aria-label="View" className="flex gap-1">
            {[
              { value: false, label: "Chart" },
              { value: true, label: "Table" },
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                aria-pressed={asTable === option.value}
                onClick={() => setAsTable(option.value)}
                className={cn(chipClass(asTable === option.value), "h-8 text-xs")}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {series.length > 0 && (
          <div role="group" aria-label="Tags shown" className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            {series.map((one) => {
              const key = one.tagId ?? "untagged";
              const shown = !hidden.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={shown}
                  onClick={() =>
                    setHidden((current) => {
                      const next = new Set(current);
                      if (shown) next.add(key);
                      else next.delete(key);
                      return next;
                    })
                  }
                  className={cn(chipClass(shown), "h-8 text-xs")}
                >
                  <AreaDot color={one.color} />
                  {one.name}
                </button>
              );
            })}
          </div>
        )}
        {series.some((one) => one.tagId !== null) && (
          <p className="mt-2 text-xs text-muted">An entry with several tags counts toward each.</p>
        )}

        <div className="mt-5">
          {visibleSeries.length === 0 ? (
            <EmptyState title="No tags selected." />
          ) : asTable ? (
            <div className="overflow-x-auto rounded-2xl border border-line">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line">
                    <th scope="col" className="px-3 py-2 text-left font-normal text-muted">
                      Day
                    </th>
                    {visibleSeries.map((one) => (
                      <th key={one.tagId ?? "untagged"} scope="col" className="px-3 py-2 text-right font-medium whitespace-nowrap">
                        {one.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...days].reverse().map((day) => (
                    <tr key={day.day} className="border-b border-line/60 last:border-b-0">
                      <th scope="row" className="px-3 py-2 text-left font-normal whitespace-nowrap">
                        {formatDayLabel(day.day, today)}
                      </th>
                      {visibleSeries.map((one) => (
                        <td key={one.tagId ?? "untagged"} className={cell}>
                          {tagMs(day, one.tagId) ? durationLabel(tagMs(day, one.tagId)) : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <TagTrendChart days={days} series={visibleSeries} today={today} />
          )}
        </div>
      </section>
    </div>
  );
}

function RangeChips({ range }: { range: number }) {
  return (
    <div role="group" aria-label="Range" className="flex gap-1.5">
      {RANGES.map((days) => (
        <Link
          key={days}
          href={`/os/daylog/compare?range=${days}`}
          aria-current={range === days ? "page" : undefined}
          className={cn(chipClass(range === days), "h-8 text-xs")}
          scroll={false}
        >
          Last {days} days
        </Link>
      ))}
    </div>
  );
}
